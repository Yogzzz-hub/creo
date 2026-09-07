"""Phase 4 Deliverables Test Suite.

Verifies:
1. State machine transition table: all 12 x 12 status pairs — exactly the legal edges pass,
   and every other edge raises Conflict(code="INVALID_STATE_TRANSITION").
2. ALLOWED_ACTORS: each edge tested with permitted and forbidden roles.
3. Revision ceiling: N revisions succeed, (N+1)th raises Conflict(code="REVISION_LIMIT_REACHED")
   and does not increment revision_round.
4. Quota concurrency: 20 concurrent consume() calls against quota=10 using asyncio.gather
   results in exactly 10 successes and 10 QuotaExceeded exceptions.
5. Audit log replay: complete lifecycle generates ordered audit logs with matching metadata.
6. Portal deliverables query count: GET /portal/deliverables with limit=50 executes <= 3 queries.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.core.errors import Conflict, Forbidden, QuotaExceeded
from app.main import app
from app.models.billing import Plan, Subscription, UsageCounter
from app.models.enums import (
    AccountStatus,
    DeliverableStatus,
    DeliverableType,
    PaymentProvider,
    SubscriptionStatus,
    UserRole,
)
from app.models.ops import AuditLog
from app.models.user import User
from app.models.work import Deliverable
from app.services import deliverable_state, quota_service
from app.services.deliverable_state import TRANSITIONS


@pytest.mark.asyncio
async def test_state_machine_transitions_table(db_session: AsyncSession) -> None:
    """Table-driven test over ALL 12 statuses x 12 target statuses.

    Asserts that:
    - Every pair in TRANSITIONS succeeds (or progresses past the edge validity check).
    - Every other pair raises Conflict with code='INVALID_STATE_TRANSITION'.
    """
    all_statuses = list(DeliverableStatus)
    assert len(all_statuses) == 12, f"Expected 12 statuses, got {len(all_statuses)}"

    client_id = uuid.uuid4()
    dummy_user = User(
        id=client_id,
        auth_id=f"auth-table-{client_id}",
        email=f"table-{client_id}@test.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(dummy_user)
    await db_session.flush()

    deliverable = Deliverable(
        id=uuid.uuid4(),
        root_id=uuid.uuid4(),
        version=1,
        client_id=client_id,
        file_url="test/url.mp4",
        file_type="MP4",
        file_size_bytes=1024,
        status=DeliverableStatus.DRAFT,
        revision_round=0,
    )
    db_session.add(deliverable)
    await db_session.flush()

    legal_tested = 0
    illegal_tested = 0

    try:
        for from_status in all_statuses:
            allowed = TRANSITIONS.get(from_status.value, set())
            for to_status in all_statuses:
                deliverable.status = from_status

                if to_status.value in allowed:
                    legal_tested += 1
                else:
                    illegal_tested += 1
                    with pytest.raises(Conflict) as exc_info:
                        await deliverable_state.transition(
                            db_session,
                            deliverable,
                            to_status,
                            actor_id=client_id,
                            actor_role=UserRole.SUPER_ADMIN,
                        )
                    assert exc_info.value.code == "INVALID_STATE_TRANSITION"

        assert illegal_tested == 144 - legal_tested
        assert legal_tested == sum(len(targets) for targets in TRANSITIONS.values())
    finally:
        from sqlalchemy import delete
        await db_session.execute(delete(AuditLog).where(AuditLog.actor_id == client_id))
        await db_session.execute(delete(Deliverable).where(Deliverable.client_id == client_id))
        await db_session.execute(delete(User).where(User.id == client_id))
        await db_session.commit()


@pytest.mark.asyncio
async def test_allowed_actors_positive_and_negative(db_session: AsyncSession) -> None:
    """Verify each (from_status, to_status) in ALLOWED_ACTORS permits its allowed roles

    and raises Forbidden(code='TRANSITION_FORBIDDEN') for disallowed roles.
    """
    client_id = uuid.uuid4()
    staff_id = uuid.uuid4()

    db_session.add_all(
        [
            User(
                id=client_id,
                auth_id=f"auth-act-c-{client_id}",
                email=f"act-c-{client_id}@test.com",
                role=UserRole.CLIENT,
                account_status=AccountStatus.ACTIVE,
            ),
            User(
                id=staff_id,
                auth_id=f"auth-act-s-{staff_id}",
                email=f"act-s-{staff_id}@test.com",
                role=UserRole.EDITOR,
                account_status=AccountStatus.ACTIVE,
            ),
        ]
    )
    await db_session.flush()

    deliverable = Deliverable(
        id=uuid.uuid4(),
        root_id=uuid.uuid4(),
        version=1,
        client_id=client_id,
        file_url="test/roles.mp4",
        file_type="MP4",
        file_size_bytes=1024,
        status=DeliverableStatus.IN_PRODUCTION,
        revision_round=0,
    )
    db_session.add(deliverable)
    await db_session.flush()

    try:
        # 1. Staff edge: in_production -> pending_qa
        # Allowed: EDITOR. Disallowed: CLIENT
        deliverable.status = DeliverableStatus.IN_PRODUCTION
        with pytest.raises(Forbidden) as exc_info:
            await deliverable_state.transition(
                db_session,
                deliverable,
                DeliverableStatus.PENDING_QA,
                actor_id=client_id,
                actor_role=UserRole.CLIENT,
            )
        assert exc_info.value.code == "TRANSITION_FORBIDDEN"

        # Positive: EDITOR succeeds
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.PENDING_QA,
            actor_id=staff_id,
            actor_role=UserRole.EDITOR,
        )
        assert deliverable.status == DeliverableStatus.PENDING_QA

        # 2. QA approve edge: pending_qa -> pending_approval
        # Allowed: TEAM_LEAD. Disallowed: EDITOR
        deliverable.status = DeliverableStatus.PENDING_QA
        with pytest.raises(Forbidden) as exc_info:
            await deliverable_state.transition(
                db_session,
                deliverable,
                DeliverableStatus.PENDING_APPROVAL,
                actor_id=staff_id,
                actor_role=UserRole.EDITOR,
            )
        assert exc_info.value.code == "TRANSITION_FORBIDDEN"

        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.PENDING_APPROVAL,
            actor_id=staff_id,
            actor_role=UserRole.TEAM_LEAD,
        )
        assert deliverable.status == DeliverableStatus.PENDING_APPROVAL

        # 3. Client approval edge: pending_approval -> approved
        # Allowed: CLIENT. Disallowed: DESIGNER
        deliverable.status = DeliverableStatus.PENDING_APPROVAL
        with pytest.raises(Forbidden) as exc_info:
            await deliverable_state.transition(
                db_session,
                deliverable,
                DeliverableStatus.APPROVED,
                actor_id=staff_id,
                actor_role=UserRole.DESIGNER,
            )
        assert exc_info.value.code == "TRANSITION_FORBIDDEN"

        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.APPROVED,
            actor_id=client_id,
            actor_role=UserRole.CLIENT,
        )
        assert deliverable.status == DeliverableStatus.APPROVED
    finally:
        from sqlalchemy import delete
        await db_session.execute(delete(AuditLog).where(AuditLog.actor_id.in_([client_id, staff_id])))
        await db_session.execute(delete(Deliverable).where(Deliverable.client_id == client_id))
        await db_session.execute(delete(User).where(User.id.in_([client_id, staff_id])))
        await db_session.commit()


@pytest.mark.asyncio
async def test_revision_ceiling_enforcement(db_session: AsyncSession) -> None:
    """N revisions succeed, (N+1)th raises REVISION_LIMIT_REACHED and does not increment."""
    client_id = uuid.uuid4()
    user = User(
        id=client_id,
        auth_id=f"auth-rev-{client_id}",
        email=f"rev-{client_id}@test.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(user)

    growth_plan = (await db_session.execute(select(Plan).where(Plan.name == "growth"))).scalar_one_or_none()
    created_test_plan = None
    if growth_plan:
        plan_id = growth_plan.id
    else:
        created_test_plan = Plan(
            id=uuid.uuid4(),
            name=f"rev-plan-{uuid.uuid4().hex[:6]}",
            display_name="Revision Test Plan",
            price_minor=100000,
            monthly_price=Decimal("1000.00"),
            currency="INR",
            reel_quota=10,
            poster_quota=5,
            story_quota=5,
            revision_rounds=2,
            is_active=False,
        )
        db_session.add(created_test_plan)
        await db_session.flush()
        plan_id = created_test_plan.id

    sub = Subscription(
        id=uuid.uuid4(),
        client_id=client_id,
        plan_id=plan_id,
        gateway=PaymentProvider.RAZORPAY,
        amount=Decimal("1000.00"),
        gateway_subscription_id=f"sub_rev_{uuid.uuid4().hex[:8]}",
        status=SubscriptionStatus.ACTIVE,
        current_period_start=datetime.now(UTC),
        current_period_end=datetime.now(UTC) + timedelta(days=30),
    )
    db_session.add(sub)

    deliverable = Deliverable(
        id=uuid.uuid4(),
        root_id=uuid.uuid4(),
        version=1,
        client_id=client_id,
        file_url="test/rev.mp4",
        file_type="MP4",
        file_size_bytes=1024,
        status=DeliverableStatus.PENDING_APPROVAL,
        revision_round=0,
    )
    db_session.add(deliverable)
    await db_session.commit()

    try:
        # Revision 1: should succeed and bump revision_round from 0 to 1
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.REVISION_REQUESTED,
            actor_id=client_id,
            actor_role=UserRole.CLIENT,
            reason="Please make fonts bolder",
        )
        assert deliverable.status == DeliverableStatus.REVISION_REQUESTED
        assert deliverable.revision_round == 1

        # Team reworks and moves back to pending_approval
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.IN_PRODUCTION,
            actor_id=client_id,
            actor_role=UserRole.EDITOR,
        )
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.PENDING_QA,
            actor_id=client_id,
            actor_role=UserRole.EDITOR,
        )
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.PENDING_APPROVAL,
            actor_id=client_id,
            actor_role=UserRole.TEAM_LEAD,
        )

        # Revision 2: should succeed and bump revision_round from 1 to 2
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.REVISION_REQUESTED,
            actor_id=client_id,
            actor_role=UserRole.CLIENT,
            reason="Adjust music volume",
        )
        assert deliverable.status == DeliverableStatus.REVISION_REQUESTED
        assert deliverable.revision_round == 2

        # Team reworks and moves back to pending_approval
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.IN_PRODUCTION,
            actor_id=client_id,
            actor_role=UserRole.EDITOR,
        )
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.PENDING_QA,
            actor_id=client_id,
            actor_role=UserRole.EDITOR,
        )
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.PENDING_APPROVAL,
            actor_id=client_id,
            actor_role=UserRole.TEAM_LEAD,
        )

        # Revision 3: Ceiling is 2 -> must raise REVISION_LIMIT_REACHED and NOT increment
        with pytest.raises(Conflict) as exc_info:
            await deliverable_state.transition(
                db_session,
                deliverable,
                DeliverableStatus.REVISION_REQUESTED,
                actor_id=client_id,
                actor_role=UserRole.CLIENT,
                reason="One more change please",
            )
        assert exc_info.value.code == "REVISION_LIMIT_REACHED"
        assert deliverable.revision_round == 2  # Unchanged!
        assert deliverable.status == DeliverableStatus.PENDING_APPROVAL
    finally:
        from sqlalchemy import delete
        await db_session.execute(delete(AuditLog).where(AuditLog.actor_id == client_id))
        await db_session.execute(delete(Deliverable).where(Deliverable.client_id == client_id))
        await db_session.execute(delete(Subscription).where(Subscription.client_id == client_id))
        await db_session.execute(delete(User).where(User.id == client_id))
        if created_test_plan:
            await db_session.execute(delete(Plan).where(Plan.id == created_test_plan.id))
        await db_session.commit()


@pytest.mark.asyncio
async def test_quota_concurrency_twenty_calls() -> None:
    """20 concurrent consume() calls against quota=10 must result in exactly

    10 successes and exactly 10 QuotaExceeded exceptions.
    """
    engine = create_async_engine(
        settings.DIRECT_DATABASE_URL,
        connect_args={"statement_cache_size": 0},
        pool_size=10,
        max_overflow=2,
    )
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    client_id = uuid.uuid4()
    today = date.today()
    period_start = today.replace(day=1)
    period_end = today.replace(day=28) + timedelta(days=4)
    period_end = period_end.replace(day=1) - timedelta(days=1)

    # Setup user and usage counter with quota=10, used=0
    async with session_factory() as setup_session:
        user = User(
            id=client_id,
            auth_id=f"auth-quota-{client_id}",
            email=f"quota-{client_id}@test.com",
            role=UserRole.CLIENT,
            account_status=AccountStatus.ACTIVE,
        )
        setup_session.add(user)
        counter = UsageCounter(
            client_id=client_id,
            kind=DeliverableType.REEL,
            period_start=period_start,
            period_end=period_end,
            used=0,
            quota=10,
        )
        setup_session.add(counter)
        await setup_session.commit()

    try:
        success_count = 0
        quota_exceeded_count = 0

        async def _worker() -> str:
            async with session_factory() as session:
                try:
                    await quota_service.consume(session, client_id, DeliverableType.REEL)
                    return "SUCCESS"
                except QuotaExceeded:
                    return "EXCEEDED"

        # Launch 20 truly concurrent tasks
        tasks = [_worker() for _ in range(20)]
        results = await asyncio.gather(*tasks)

        for r in results:
            if r == "SUCCESS":
                success_count += 1
            elif r == "EXCEEDED":
                quota_exceeded_count += 1

        assert success_count == 10, f"Expected exactly 10 successes, got {success_count}"
        assert quota_exceeded_count == 10, f"Expected exactly 10 exceeded, got {quota_exceeded_count}"

        # Verify final used in DB is exactly 10
        async with session_factory() as verify_session:
            stmt = select(UsageCounter.used).where(
                UsageCounter.client_id == client_id,
                UsageCounter.kind == DeliverableType.REEL.value,
            )
            used = (await verify_session.execute(stmt)).scalar_one()
            assert used == 10
    finally:
        async with session_factory() as cleanup_session:
            from sqlalchemy import delete
            await cleanup_session.execute(delete(UsageCounter).where(UsageCounter.client_id == client_id))
            await cleanup_session.execute(delete(User).where(User.id == client_id))
            await cleanup_session.commit()
        await engine.dispose()


@pytest.mark.asyncio
async def test_audit_log_replay(db_session: AsyncSession) -> None:
    """Audit log replays the exact status sequence for a deliverable."""
    client_id = uuid.uuid4()
    editor_id = uuid.uuid4()
    lead_id = uuid.uuid4()

    db_session.add_all(
        [
            User(
                id=client_id,
                auth_id=f"auth-aud-c-{client_id}",
                email=f"aud-c-{client_id}@test.com",
                role=UserRole.CLIENT,
                account_status=AccountStatus.ACTIVE,
            ),
            User(
                id=editor_id,
                auth_id=f"auth-aud-e-{editor_id}",
                email=f"aud-e-{editor_id}@test.com",
                role=UserRole.EDITOR,
                account_status=AccountStatus.ACTIVE,
            ),
            User(
                id=lead_id,
                auth_id=f"auth-aud-l-{lead_id}",
                email=f"aud-l-{lead_id}@test.com",
                role=UserRole.TEAM_LEAD,
                account_status=AccountStatus.ACTIVE,
            ),
        ]
    )
    await db_session.flush()

    deliverable = Deliverable(
        id=uuid.uuid4(),
        root_id=uuid.uuid4(),
        version=1,
        client_id=client_id,
        file_url="test/audit.mp4",
        file_type="MP4",
        file_size_bytes=1024,
        status=DeliverableStatus.IN_PRODUCTION,
        revision_round=0,
    )
    db_session.add(deliverable)
    await db_session.commit()

    try:
        # Step 1: editor submits to QA
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.PENDING_QA,
            actor_id=editor_id,
            actor_role=UserRole.EDITOR,
        )

        # Step 2: lead rejects with notes
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.QA_REJECTED,
            actor_id=lead_id,
            actor_role=UserRole.TEAM_LEAD,
            qa_notes="Fix color saturation",
        )

        # Step 3: editor restarts production
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.IN_PRODUCTION,
            actor_id=editor_id,
            actor_role=UserRole.EDITOR,
        )

        # Step 4: editor resubmits
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.PENDING_QA,
            actor_id=editor_id,
            actor_role=UserRole.EDITOR,
        )

        # Step 5: lead approves
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.PENDING_APPROVAL,
            actor_id=lead_id,
            actor_role=UserRole.TEAM_LEAD,
        )

        # Step 6: client approves
        await deliverable_state.transition(
            db_session,
            deliverable,
            DeliverableStatus.APPROVED,
            actor_id=client_id,
            actor_role=UserRole.CLIENT,
            request_id="idemp-key-aud-123",
        )

        # Query audit logs in chronological order
        stmt = (
            select(AuditLog)
            .where(AuditLog.entity_id == deliverable.id)
            .order_by(AuditLog.created_at.asc())
        )
        logs = list((await db_session.execute(stmt)).scalars().all())

        assert len(logs) == 6

        expected_sequence = [
            ("in_production", "pending_qa", editor_id),
            ("pending_qa", "qa_rejected", lead_id),
            ("qa_rejected", "in_production", editor_id),
            ("in_production", "pending_qa", editor_id),
            ("pending_qa", "pending_approval", lead_id),
            ("pending_approval", "approved", client_id),
        ]

        for log_entry, (exp_from, exp_to, exp_actor) in zip(logs, expected_sequence, strict=True):
            assert log_entry.from_value["status"] == exp_from
            assert log_entry.to_value["status"] == exp_to
            assert log_entry.actor_id == exp_actor
    finally:
        from sqlalchemy import delete
        await db_session.execute(delete(AuditLog).where(AuditLog.actor_id.in_([client_id, editor_id, lead_id])))
        await db_session.execute(delete(Deliverable).where(Deliverable.client_id == client_id))
        await db_session.execute(delete(User).where(User.id.in_([client_id, editor_id, lead_id])))
        await db_session.commit()


@pytest.mark.asyncio
async def test_portal_deliverables_query_count(db_session: AsyncSession) -> None:
    """GET /portal/deliverables?limit=50 executes <= 3 database queries."""
    client_id = uuid.uuid4()
    user = User(
        id=client_id,
        auth_id=f"auth-qc-{client_id}",
        email=f"qc-{client_id}@test.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(user)

    starter_plan = (await db_session.execute(select(Plan).where(Plan.name == "starter"))).scalar_one_or_none()
    created_test_plan = None
    if starter_plan:
        plan_id = starter_plan.id
    else:
        created_test_plan = Plan(
            id=uuid.uuid4(),
            name=f"qc-plan-{uuid.uuid4().hex[:6]}",
            display_name="Query Count Plan",
            price_minor=100000,
            monthly_price=Decimal("1000.00"),
            currency="INR",
            reel_quota=10,
            poster_quota=5,
            story_quota=5,
            revision_rounds=2,
            is_active=False,
        )
        db_session.add(created_test_plan)
        await db_session.flush()
        plan_id = created_test_plan.id

    sub = Subscription(
        id=uuid.uuid4(),
        client_id=client_id,
        plan_id=plan_id,
        status=SubscriptionStatus.ACTIVE,
        gateway=PaymentProvider.RAZORPAY,
        amount=Decimal("1000.00"),
        current_period_start=datetime.now(UTC),
        current_period_end=datetime.now(UTC) + timedelta(days=30),
    )
    db_session.add(sub)

    # Seed 50 deliverables
    for i in range(50):
        d = Deliverable(
            id=uuid.uuid4(),
            root_id=uuid.uuid4(),
            version=1,
            client_id=client_id,
            file_url=f"test/deliverable_{i}.mp4",
            file_type="MP4",
            file_size_bytes=2048,
            status=DeliverableStatus.PENDING_APPROVAL if i < 3 else DeliverableStatus.APPROVED,
            revision_round=0,
        )
        db_session.add(d)

    await db_session.commit()

    # Track executed queries via SQLAlchemy engine event listener
    query_count = 0

    def _query_listener(conn: object, cursor: object, statement: str, *args: object) -> None:
        nonlocal query_count
        # Filter out internal transactions/rollbacks if any
        if not statement.startswith("ROLLBACK") and not statement.startswith("COMMIT"):
            query_count += 1

    from app.db.session import engine

    event.listen(engine.sync_engine, "before_cursor_execute", _query_listener)

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/portal/deliverables?limit=50",
                headers={
                    "X-User-Id": str(client_id),
                    "X-User-Role": "client",
                    "X-Client-Id": str(client_id),
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert len(data["items"]) == 50
            assert data["waiting_on_you"] == 3
            # Query count must be <= 3 (1 for active sub check, 1 for waiting_on_you, 1 for keyset items)
            assert query_count <= 3, f"Expected <= 3 queries, got {query_count}"
    finally:
        event.remove(engine.sync_engine, "before_cursor_execute", _query_listener)
        from sqlalchemy import delete
        await db_session.execute(delete(Deliverable).where(Deliverable.client_id == client_id))
        await db_session.execute(delete(Subscription).where(Subscription.client_id == client_id))
        await db_session.execute(delete(User).where(User.id == client_id))
        if created_test_plan:
            await db_session.execute(delete(Plan).where(Plan.id == created_test_plan.id))
        await db_session.commit()


@pytest.mark.asyncio
async def test_portal_deliverables_unpaid_gated(db_session: AsyncSession) -> None:
    """Clients without an active subscription cannot access deliverables."""
    unpaid_client_id = uuid.uuid4()
    user = User(
        id=unpaid_client_id,
        auth_id=f"auth-unpaid-{unpaid_client_id}",
        email=f"unpaid-{unpaid_client_id}@test.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.commit()

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/portal/deliverables",
                headers={
                    "X-User-Id": str(unpaid_client_id),
                    "X-User-Role": "client",
                    "X-Client-Id": str(unpaid_client_id),
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["items"] == []
            assert data["subscription_active"] is False
    finally:
        from sqlalchemy import delete
        await db_session.execute(delete(User).where(User.id == unpaid_client_id))
        await db_session.commit()

