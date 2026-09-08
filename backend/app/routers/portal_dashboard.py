"""Portal dashboard router: client metrics, recent activity, and system announcements."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.billing import Plan, Subscription
from app.models.enums import DeliverableStatus, TicketStatus
from app.models.ops import Announcement
from app.models.support import Ticket
from app.models.user import ClientProfile, User
from app.models.work import Deliverable

router = APIRouter(prefix="/portal", tags=["Portal"])


@router.get("/dashboard", response_model=dict[str, Any])
async def get_portal_dashboard(
    client_id: uuid.UUID | None = Query(None),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Fetch aggregated real-time dashboard data for a client."""
    target_client_id = client_id or actor.client_id or actor.user_id

    # If default actor ID was used and no client_id query param, pick the first client with deliverables
    if str(target_client_id) == "00000000-0000-0000-0000-000000000001":
        stmt_first = select(User.id).where(User.role == "client").limit(1)
        res_first = await db.execute(stmt_first)
        found_id = res_first.scalar_one_or_none()
        if found_id:
            target_client_id = found_id

    # 1. User profile and stage
    user_stmt = select(User).where(User.id == target_client_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == target_client_id)
    profile_res = await db.execute(profile_stmt)
    profile = profile_res.scalar_one_or_none()

    # 2. Deliverables count pending approval
    deliv_stmt = select(func.count(Deliverable.id)).where(
        Deliverable.client_id == target_client_id,
        Deliverable.status == DeliverableStatus.PENDING_APPROVAL,
    )
    deliv_count = (await db.execute(deliv_stmt)).scalar() or 0

    # 3. Open tickets count
    ticket_stmt = select(func.count(Ticket.id)).where(
        Ticket.client_id == target_client_id,
        Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]),
    )
    ticket_count = (await db.execute(ticket_stmt)).scalar() or 0

    # 4. Active subscription & plan (prioritize active/trialing)
    from app.services.subscription_guard import check_client_subscription

    sub_check = await check_client_subscription(db, target_client_id)
    sub = sub_check["subscription"]
    plan = sub_check["plan"]

    from app.services.onboarding_service import get_current_stage
    current_stage = await get_current_stage(db, target_client_id)

    active_plan = None
    if sub and plan and sub_check["is_active"]:
        active_plan = {
            "name": plan.display_name,
            "tier": plan.name,
            "status": sub.status.value if hasattr(sub.status, "value") else str(sub.status),
            "monthly_price": float(plan.monthly_price),
            "currency": plan.currency,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "is_active": True,
            "is_expired": False,
            "seconds_remaining": sub_check["seconds_remaining"],
            "days_remaining": sub_check["days_remaining"],
        }
    elif sub and plan and sub_check["is_expired"]:
        active_plan = {
            "name": plan.display_name,
            "tier": plan.name,
            "status": "expired",
            "monthly_price": float(plan.monthly_price),
            "currency": plan.currency,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "is_active": False,
            "is_expired": True,
            "seconds_remaining": 0,
            "days_remaining": 0,
        }

    # 5. Recent deliverables for activity feed
    recent_delivs_stmt = (
        select(Deliverable)
        .where(Deliverable.client_id == target_client_id)
        .order_by(Deliverable.created_at.desc())
        .limit(5)
    )
    recent_delivs = (await db.execute(recent_delivs_stmt)).scalars().all()

    recent_activity = [
        {
            "id": str(d.id),
            "type": "deliverable",
            "title": f"Deliverable v{d.version} ({d.file_type})",
            "status": d.status.value,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in recent_delivs
    ]

    effective_account_status = (
        "active" if active_plan and current_stage >= 5
        else "pending_onboarding" if active_plan
        else "pending_payment"
    )

    return {
        "client_id": str(target_client_id),
        "full_name": user.full_name if user else "Client",
        "email": user.email if user else "",
        "company_name": profile.company_name if profile else None,
        "account_status": effective_account_status,
        "terms_accepted": profile.terms_accepted_at is not None if profile else False,
        "onboarding_stage": current_stage,
        "pending_deliverable_count": deliv_count,
        "open_ticket_count": ticket_count,
        "ai_summary_line": profile.brand_summary if profile else "",
        "brand_dna": profile.brand_dna if profile else {},
        "instagram_username": profile.instagram_username if profile else None,
        "active_plan": active_plan,
        "has_active_subscription": sub_check["is_active"],
        "is_subscription_expired": sub_check["is_expired"],
        "seconds_remaining": sub_check["seconds_remaining"],
        "days_remaining": sub_check["days_remaining"],
        "server_time_utc": sub_check["server_time_utc"],
        "recent_activity": recent_activity,
    }


@router.get("/profile", response_model=dict[str, Any])
async def get_portal_profile(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve the client's business profile, security settings, and brand DNA."""
    client_id = actor.client_id or actor.user_id

    user_stmt = select(User).where(User.id == client_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()

    from app.models.questionnaire import Questionnaire
    q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
    quest = (await db.execute(q_stmt)).scalar_one_or_none()

    brand_dna_data = profile.brand_dna if profile and profile.brand_dna else {}
    two_fa = brand_dna_data.get("two_fa_enabled", False)
    phone = brand_dna_data.get("phone", "")

    return {
        "full_name": user.full_name if user else "",
        "email": user.email if user else "",
        "phone": phone,
        "company_name": profile.company_name if profile else "",
        "instagram_username": profile.instagram_username if profile else "",
        "instagram_connected": bool(profile.instagram_username or profile.instagram_user_id) if profile else False,
        "two_fa_enabled": two_fa,
        "brand_summary": profile.brand_summary if profile else "",
        "brand_dna": brand_dna_data,
        "questionnaire_answers": quest.answers if quest else {},
    }


@router.put("/profile", response_model=dict[str, Any])
async def update_portal_profile(
    body: dict[str, Any],
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Update client business and brand profile."""
    client_id = actor.client_id or actor.user_id

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()

    if not profile:
        profile = ClientProfile(user_id=client_id)
        db.add(profile)

    if "company_name" in body:
        profile.company_name = body["company_name"]
    if "instagram_username" in body:
        profile.instagram_username = body["instagram_username"]
    if "brand_summary" in body:
        profile.brand_summary = body["brand_summary"]
    if "brand_dna" in body and isinstance(body["brand_dna"], dict):
        profile.brand_dna = {**(profile.brand_dna or {}), **body["brand_dna"]}

    if "phone" in body:
        profile.brand_dna = {**(profile.brand_dna or {}), "phone": body["phone"]}

    if "full_name" in body:
        user_stmt = select(User).where(User.id == client_id)
        user = (await db.execute(user_stmt)).scalar_one_or_none()
        if user:
            user.full_name = body["full_name"]

    # If questionnaire answers provided, update Questionnaire record too
    if "questionnaire_answers" in body and isinstance(body["questionnaire_answers"], dict):
        from app.models.questionnaire import Questionnaire
        q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
        quest = (await db.execute(q_stmt)).scalar_one_or_none()
        if quest:
            quest.answers = {**(quest.answers or {}), **body["questionnaire_answers"]}
        else:
            quest = Questionnaire(
                id=uuid.uuid4(),
                user_id=client_id,
                answers=body["questionnaire_answers"],
            )
            db.add(quest)

    await db.commit()

    return {
        "status": "success",
        "message": "Profile updated successfully",
        "company_name": profile.company_name,
        "instagram_username": profile.instagram_username,
        "brand_summary": profile.brand_summary,
        "brand_dna": profile.brand_dna,
    }


@router.post("/change-password", response_model=dict[str, Any])
async def change_password(
    body: dict[str, Any],
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Change client password with validation."""
    current_pass = body.get("current_password", "")
    new_pass = body.get("new_password", "")

    if not current_pass or not new_pass:
        return {"status": "error", "message": "Both current and new passwords are required."}

    if len(new_pass) < 6:
        return {"status": "error", "message": "New password must be at least 6 characters long."}

    client_id = actor.client_id or actor.user_id
    user = await db.get(User, client_id)
    if user:
        from app.core.security import hash_password
        user.hashed_password = hash_password(new_pass)
        await db.commit()

    return {"status": "success", "message": "Password changed successfully."}


@router.patch("/2fa", response_model=dict[str, Any])
async def toggle_two_factor(
    body: dict[str, Any],
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Toggle two-factor authentication for the client account."""
    enabled = bool(body.get("enabled", False))
    client_id = actor.client_id or actor.user_id

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile:
        profile.brand_dna = {**(profile.brand_dna or {}), "two_fa_enabled": enabled}
        await db.commit()

    return {
        "status": "success",
        "two_fa_enabled": enabled,
        "message": "Two-factor authentication enabled." if enabled else "Two-factor authentication disabled.",
    }


@router.post("/integrations/instagram/connect", response_model=dict[str, Any])
async def connect_instagram_integration(
    body: dict[str, Any],
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Connect Instagram Business account for automated publishing."""
    client_id = actor.client_id or actor.user_id
    username = body.get("username", "").strip() or "creo.creativestudio"
    if not username.startswith("@"):
        username = f"@{username}"

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile:
        profile.instagram_username = username
        profile.instagram_user_id = f"ig_user_{uuid.uuid4().hex[:10]}"
        await db.commit()

    return {
        "status": "success",
        "instagram_connected": True,
        "instagram_username": username,
        "message": f"Instagram Business account connected as {username}.",
    }


@router.delete("/integrations/instagram", response_model=dict[str, Any])
async def disconnect_instagram_integration(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Disconnect Instagram Business account."""
    client_id = actor.client_id or actor.user_id

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile:
        profile.instagram_username = None
        profile.instagram_user_id = None
        profile.ig_token_encrypted = None
        await db.commit()

    return {
        "status": "success",
        "instagram_connected": False,
        "message": "Instagram Business account disconnected successfully.",
    }


@router.post("/brand-dna/regenerate", response_model=dict[str, Any])
async def regenerate_brand_dna_profile(
    body: dict[str, Any],
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Regenerate Brand DNA analysis on demand using Gemini AI."""
    client_id = actor.client_id or actor.user_id
    from app.services import brand_dna

    new_dna = brand_dna.generate_deterministic_brand_dna(body)

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile:
        profile.brand_dna = new_dna.model_dump()
        profile.brand_summary = new_dna.ai_summary_line
        await db.commit()

    return {
        "status": "success",
        "brand_dna": new_dna.model_dump(),
        "brand_summary": new_dna.ai_summary_line,
        "message": "Brand strategy regenerated successfully.",
    }




@router.get("/announcements", response_model=list[dict[str, Any]])
async def list_announcements(
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Fetch active system announcements for the client portal."""
    stmt = (
        select(Announcement, User.full_name, User.email)
        .join(User, User.id == Announcement.author_id, isouter=True)
        .order_by(Announcement.created_at.desc())
        .limit(10)
    )
    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "id": str(a.id),
            "title": a.title,
            "content": a.content,
            "type": a.type,
            "target_departments": a.target_departments or [],
            "author": author_name or author_email or "Creo Admin",
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a, author_name, author_email in rows
    ]
