"""Onboarding API router.

Guarded by upfront Actor dependency and v_client_onboarding derived stages.
"""

from datetime import UTC, datetime
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
logger = get_logger("app.routers.onboarding")

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.questionnaire import Questionnaire
from app.models.user import ClientProfile
from app.schemas.brand_dna import (
    BrandDNA,
    BrandDNAStatusResponse,
    QuestionnaireStateResponse,
    SaveSectionRequest,
    SaveSectionsRequest,
)
from app.schemas.onboarding import (
    DirectBypassRequest,
    ManualPaymentRequestCreate,
    ManualPaymentRequestResponse,
    ManualPaymentReviewRequest,
    OnboardingCompleteResponse,
    OnboardingStatusResponse,
    QuestionnaireSubmitRequest,
    TermsAcceptRequest,
)
from app.models.user import User
from app.services import brand_dna, onboarding_service

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


@router.get("/status", response_model=OnboardingStatusResponse)
async def get_status(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> OnboardingStatusResponse:
    """Retrieve current derived stage and progress flags."""
    client_id = actor.client_id or actor.user_id
    return await onboarding_service.get_onboarding_status(db, client_id)


@router.post("/terms")
async def accept_terms(
    body: TermsAcceptRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Accept the Master Service Agreement terms."""
    client_id = actor.client_id or actor.user_id
    await onboarding_service.accept_terms(db, client_id, body.terms_version)
    return {"status": "ok", "message": "Terms accepted successfully"}


@router.post("/questionnaire/sections")
async def save_questionnaire_sections(
    body: SaveSectionsRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await onboarding_service.save_questionnaire_sections(
        db, actor.client_id or actor.user_id, body.sections, body.active_section,
    )


@router.post("/questionnaire/section")
async def save_questionnaire_section(
    body: SaveSectionRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Autosave an individual section (a..g) without blocking on full form."""
    client_id = actor.client_id or actor.user_id
    return await onboarding_service.save_questionnaire_section(db, client_id, body.section, body.data)


@router.get("/questionnaire", response_model=QuestionnaireStateResponse)
async def get_questionnaire_state(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> QuestionnaireStateResponse:
    """Retrieve saved state of all questionnaire sections to restore on return."""
    client_id = actor.client_id or actor.user_id
    state = await onboarding_service.get_questionnaire_state(db, client_id)
    return QuestionnaireStateResponse(**state)


@router.post("/brand", status_code=status.HTTP_202_ACCEPTED)
async def queue_brand_dna_generation(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Queue Brand DNA synthesis from questionnaire answers (HTTP 202)."""
    client_id = actor.client_id or actor.user_id

    # Prerequisite: active subscription
    from app.services.subscription_guard import check_client_subscription
    sub_check = await check_client_subscription(db, client_id)
    if not sub_check["is_active"]:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Active subscription required before Brand DNA can be generated.",
        )

    # Prerequisite: questionnaire Sections A-E completed
    q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
    quest = (await db.execute(q_stmt)).scalar_one_or_none()

    # Auto-heal: If sections A-E exist or legacy answers exist, set core_completed_at
    if quest and not quest.core_completed_at:
        has_a = bool(quest.section_a and (quest.section_a.get("brand_name") or quest.section_a.get("one_liner")))
        has_b = bool(quest.section_b and quest.section_b.get("ideal_customer"))
        has_c = bool(quest.section_c and ("humour" in quest.section_c or quest.section_c.get("voice_words")))
        has_d = bool(quest.section_d and (quest.section_d.get("visual_direction") or quest.section_d.get("colours")))
        has_e = bool(quest.section_e and (quest.section_e.get("on_camera") or quest.section_e.get("shoot_locations")))

        # Check legacy answers fallback
        if not (has_a and has_b and has_c and has_d and has_e) and quest.answers and len(quest.answers) >= 5:
            mapped = onboarding_service.map_legacy_answers_to_sections(quest.answers)
            for sec_k in ["a", "b", "c", "d", "e", "f", "g"]:
                if not getattr(quest, f"section_{sec_k}"):
                    setattr(quest, f"section_{sec_k}", mapped[sec_k])
            has_a = has_b = has_c = has_d = has_e = True

        if has_a and has_b and has_c and has_d and has_e:
            now = datetime.now(UTC)
            quest.core_completed_at = now
            if not quest.submitted_at:
                quest.submitted_at = now
            await db.commit()
            await db.refresh(quest)

    if not quest or not quest.core_completed_at:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Questionnaire Sections A-E must be submitted before Brand DNA can be generated.",
        )

    # Respond immediately with the deterministic Brand DNA; Gemini refines it in the
    # background (and briefs the pod once one is assigned).
    profile = (await db.execute(select(ClientProfile).where(ClientProfile.user_id == client_id))).scalar_one_or_none()
    if profile and profile.brand_dna:
        dna_payload = profile.brand_dna
    else:
        dna_payload = (await brand_dna.save_template_brand_dna(db, client_id)).model_dump()
    onboarding_service.schedule_brand_enrichment(client_id)
    return {
        "status": "generating",
        "message": "Brand DNA generation queued",
        "brand_dna": dna_payload,
    }


async def _resolve_brand_status(db: AsyncSession, client_id: uuid.UUID) -> BrandDNAStatusResponse:
    p_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(p_stmt)).scalar_one_or_none()

    q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
    quest = (await db.execute(q_stmt)).scalar_one_or_none()

    if profile and profile.brand_dna:
        source = profile.brand_dna_source or "template"
        st = "template" if source == "template" else "ready"
        dna_obj = None
        try:
            dna_obj = BrandDNA.model_validate(profile.brand_dna)
        except Exception:
            pass
        return BrandDNAStatusResponse(
            status=st,
            brand_dna=dna_obj,
            brand_dna_source=source,
            brand_dna_version=profile.brand_dna_version or 1,
            summary_line=profile.brand_summary or (dna_obj.summary_line if dna_obj else None),
        )
    elif quest and quest.core_completed_at:
        return BrandDNAStatusResponse(
            status="generating",
            brand_dna=None,
            brand_dna_source="template",
            brand_dna_version=1,
            summary_line=None,
        )
    else:
        return BrandDNAStatusResponse(
            status="pending",
            brand_dna=None,
            brand_dna_source="template",
            brand_dna_version=1,
            summary_line=None,
        )


@router.get("/brand/status", response_model=BrandDNAStatusResponse)
async def get_brand_status(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> BrandDNAStatusResponse:
    """Check status of Brand DNA pipeline: generating | ready | template."""
    client_id = actor.client_id or actor.user_id
    return await _resolve_brand_status(db, client_id)


@router.get("/brand-dna/status", response_model=BrandDNAStatusResponse)
async def get_brand_dna_status(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> BrandDNAStatusResponse:
    """Poll Brand DNA synthesis status (alias for backwards compatibility)."""
    client_id = actor.client_id or actor.user_id
    return await _resolve_brand_status(db, client_id)


@router.post("/questionnaire")
async def submit_questionnaire(
    body: QuestionnaireSubmitRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Legacy submit questionnaire endpoint maintaining backward compatibility."""
    client_id = actor.client_id or actor.user_id
    await onboarding_service.submit_questionnaire(db, client_id, body)
    dna = await brand_dna.save_template_brand_dna(db, client_id)
    onboarding_service.schedule_brand_enrichment(client_id)
    return {
        "status": "ok",
        "message": "Questionnaire submitted successfully",
        "brand_dna": dna.model_dump() if dna else None,
    }


@router.post("/complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> OnboardingCompleteResponse:
    """Complete client onboarding, assign creative pod, and notify handlers with Brand DNA summary."""
    client_id = actor.client_id or actor.user_id
    return await onboarding_service.complete_onboarding(db, client_id)


@router.post("/resend-summary")
async def resend_onboarding_summary(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Manually dispatch or re-send client Brand DNA summary brief to assigned creative pod handlers."""
    client_id = actor.client_id or actor.user_id
    result = await onboarding_service.notify_team_of_new_client_summary(db, client_id)
    return {
        "status": "ok",
        "message": "Brand DNA summary and onboarding brief dispatched to assigned team lead and specialists.",
        **result,
    }


async def _ensure_manual_payments_table(db: AsyncSession) -> None:
    stmts = [
        """CREATE TABLE IF NOT EXISTS manual_payment_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
            payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
            amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            reference_note TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
            reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at TIMESTAMP WITH TIME ZONE,
            admin_notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );""",
        "CREATE INDEX IF NOT EXISTS idx_manual_payments_client_id ON manual_payment_requests(client_id);",
        "CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON manual_payment_requests(status);",
        "CREATE INDEX IF NOT EXISTS idx_manual_payments_created_at ON manual_payment_requests(created_at);",
    ]
    for stmt in stmts:
        try:
            await db.execute(text(stmt))
            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.debug("ensure_manual_payments_stmt", error=str(exc))


@router.post("/manual-payment-request", response_model=ManualPaymentRequestResponse)
async def create_manual_payment_request(
    body: ManualPaymentRequestCreate,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> ManualPaymentRequestResponse:
    """Client submits an offline/manual payment claim (cash, bank transfer, etc.) to bypass Step 3."""
    client_id = actor.client_id or actor.user_id
    await _ensure_manual_payments_table(db)

    # Verify plan exists (check regular plans or custom client plan)
    from app.models.billing import Plan, Subscription
    from app.models.enums import SubscriptionStatus
    plan_stmt = select(Plan).where(Plan.id == body.plan_id)
    plan_res = await db.execute(plan_stmt)
    plan = plan_res.scalar_one_or_none()
    if not plan:
        plan_stmt = select(Plan).where(Plan.name == f"custom_{client_id.hex[:8]}", Plan.is_active.is_(True))
        plan = (await db.execute(plan_stmt)).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Selected plan does not exist")

    # Check if client already has an active subscription
    sub_res = await db.execute(
        select(Subscription).where(
            Subscription.client_id == client_id,
            Subscription.status.in_([SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE]),
        )
    )
    if sub_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Client already has an active subscription")

    amount = float(plan.monthly_price)

    # Check for existing pending request
    existing_res = await db.execute(text("""
        SELECT id FROM manual_payment_requests
        WHERE client_id = :cid AND status = 'PENDING'
        ORDER BY created_at DESC LIMIT 1
    """), {"cid": client_id})
    existing = existing_res.fetchone()

    if existing:
        req_id = existing[0]
        await db.execute(text("""
            UPDATE manual_payment_requests
            SET plan_id = :pid, payment_method = :pm, amount = :amt, reference_note = :rn, updated_at = NOW()
            WHERE id = :rid
        """), {
            "pid": body.plan_id,
            "pm": body.payment_method,
            "amt": amount,
            "rn": body.reference_note,
            "rid": req_id,
        })
    else:
        req_id = uuid.uuid4()
        await db.execute(text("""
            INSERT INTO manual_payment_requests (id, client_id, plan_id, payment_method, amount, reference_note, status, created_at, updated_at)
            VALUES (:id, :cid, :pid, :pm, :amt, :rn, 'PENDING', NOW(), NOW())
        """), {
            "id": req_id,
            "cid": client_id,
            "pid": body.plan_id,
            "pm": body.payment_method,
            "amt": amount,
            "rn": body.reference_note,
        })

    # Fetch client info for notification
    u_res = await db.execute(select(User).where(User.id == client_id))
    u = u_res.scalar_one_or_none()
    client_name = (u.full_name or "Valued Client") if u else "Valued Client"
    client_email = (u.email or "") if u else ""

    # Create administrative notification for agency admins
    from app.models.ops import Notification
    from app.models.enums import UserRole
    try:
        admins_res = await db.execute(
            select(User.id).where(User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
        )
        admin_ids = [row[0] for row in admins_res.fetchall()]
        for aid in admin_ids:
            db.add(
                Notification(
                    user_id=aid,
                    title="Offline Payment Verification Requested",
                    message=f"{client_name} ({client_email}) requested offline payment verification ({body.payment_method.upper()}) for {plan.display_name} (₹{int(amount):,}).",
                    link="/admin/clients",
                    is_read=False,
                )
            )
    except Exception as exc:
        logger.warning("failed_to_notify_admins_in_app", error=str(exc))

    # Create client in-app notification
    client_notif = Notification(
        user_id=client_id,
        title="Offline Payment Verification Under Review",
        message=f"Your offline payment request for {plan.display_name} (₹{int(amount):,}) has been received. Our agency team will verify and activate your account shortly.",
        link="/onboarding?step=3",
        is_read=False,
    )
    db.add(client_notif)
    await db.commit()

    # Intimate via Email (Brevo / SMTP) in background
    from app.services.email_service import send_payment_verification_request_email
    import asyncio

    if client_email:
        asyncio.create_task(
            send_payment_verification_request_email(
                to_email=client_email,
                client_name=client_name,
                plan_name=plan.display_name,
                amount=amount,
                payment_method=body.payment_method,
                is_admin=False,
                notes=body.reference_note or "",
            )
        )

    # Intimate agency admins via email
    admin_emails = ["admin@creo.agency", "ops.admin@creo.agency"]
    for a_email in admin_emails:
        asyncio.create_task(
            send_payment_verification_request_email(
                to_email=a_email,
                client_name=client_name,
                plan_name=plan.display_name,
                amount=amount,
                payment_method=body.payment_method,
                is_admin=True,
                notes=body.reference_note or "",
            )
        )

    return ManualPaymentRequestResponse(
        id=req_id,
        client_id=client_id,
        client_name=u.full_name if u else None,
        client_email=u.email if u else None,
        plan_id=body.plan_id,
        plan_name=plan.name,
        plan_display_name=plan.display_name,
        payment_method=body.payment_method,
        amount=amount,
        reference_note=body.reference_note,
        status="PENDING",
        created_at=datetime.now(UTC),
    )


@router.get("/manual-payment-request", response_model=ManualPaymentRequestResponse | None)
async def get_manual_payment_request(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> ManualPaymentRequestResponse | None:
    """Check current status of the client's offline payment verification request."""
    client_id = actor.client_id or actor.user_id
    await _ensure_manual_payments_table(db)
    res = await db.execute(text("""
        SELECT r.id, r.client_id, r.plan_id, r.payment_method, r.amount, r.reference_note,
               r.status, r.reviewed_at, r.admin_notes, r.created_at,
               p.name as plan_name, p.display_name as plan_display_name,
               u.full_name, u.email
        FROM manual_payment_requests r
        JOIN plans p ON p.id = r.plan_id
        JOIN users u ON u.id = r.client_id
        WHERE r.client_id = :cid
        ORDER BY r.created_at DESC LIMIT 1
    """), {"cid": client_id})
    row = res.fetchone()
    if not row:
        return None
    return ManualPaymentRequestResponse(
        id=row[0],
        client_id=row[1],
        plan_id=row[2],
        payment_method=row[3],
        amount=float(row[4]),
        reference_note=row[5],
        status=row[6],
        reviewed_at=row[7],
        admin_notes=row[8],
        created_at=row[9],
        plan_name=row[10],
        plan_display_name=row[11],
        client_name=row[12],
        client_email=row[13],
    )


@router.delete("/manual-payment-request")
async def cancel_manual_payment_request(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Client cancels their pending manual payment request to proceed with online payment."""
    client_id = actor.client_id or actor.user_id
    await _ensure_manual_payments_table(db)
    await db.execute(text("""
        DELETE FROM manual_payment_requests
        WHERE client_id = :cid AND status = 'PENDING'
    """), {"cid": client_id})
    await db.commit()
    return {"status": "ok", "message": "Manual payment request cancelled successfully"}


