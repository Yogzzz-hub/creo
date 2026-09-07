"""Automated constraint and RBAC test suite for Creo platform.

Tests:
1. ck_usage_bounds: inserting usage_counters with used > quota raises IntegrityError.
2. uq_sub_active_per_client: inserting 2nd active subscription raises IntegrityError.
3. uq_deliv_root_version: inserting two deliverables with same (root_id, version)
   raises IntegrityError.
4. uq_deliv_creation: inserting two deliverables with same non-null ig_creation_id
   raises IntegrityError.
5. ck_deliv_scheduled_has_time: inserting deliverable with status='scheduled' and
   scheduled_at NULL raises IntegrityError.
6. trg_set_updated_at: updated_at trigger updates timestamp on row UPDATE.
7. require_roles: RBAC helper enforces role restrictions and returns 403 Forbidden
   for disallowed roles.
"""

import asyncio
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Forbidden
from app.core.rbac import (
    Actor,
    require_roles,
)
from app.models.billing import Plan, Subscription, UsageCounter
from app.models.enums import (
    AccountStatus,
    DeliverableStatus,
    DeliverableType,
    PaymentProvider,
    SubscriptionStatus,
    UserRole,
)
from app.models.user import User
from app.models.work import Deliverable


@pytest.mark.asyncio
async def test_usage_counter_quota_constraint(db_session: AsyncSession) -> None:
    """Test ck_usage_bounds check constraint: used cannot exceed quota."""
    # Find or create a test client
    res = await db_session.execute(select(User).where(User.role == UserRole.CLIENT).limit(1))
    client = res.scalar_one_or_none()
    if not client:
        client = User(
            id=uuid.uuid4(),
            auth_id=f"test-auth-{uuid.uuid4()}",
            email=f"client-{uuid.uuid4()}@test.com",
            role=UserRole.CLIENT,
            account_status=AccountStatus.ACTIVE,
        )
        db_session.add(client)
        await db_session.flush()

    today = date.today()
    invalid_usage = UsageCounter(
        id=uuid.uuid4(),
        client_id=client.id,
        period_start=today,
        period_end=today + timedelta(days=30),
        kind=DeliverableType.REEL,
        quota=5,
        used=6,  # EXCEEDS quota (ck_usage_bounds: used >= 0 AND used <= quota)
    )

    with pytest.raises((IntegrityError, DBAPIError)):
        async with db_session.begin_nested():
            db_session.add(invalid_usage)
            await db_session.flush()


@pytest.mark.asyncio
async def test_duplicate_active_subscription_constraint(db_session: AsyncSession) -> None:
    """Test uq_sub_active_per_client: only one active/trialing subscription per client."""
    # Get a plan
    res_plan = await db_session.execute(select(Plan).limit(1))
    plan = res_plan.scalar_one()

    # Create fresh client
    client = User(
        id=uuid.uuid4(),
        auth_id=f"test-sub-{uuid.uuid4()}",
        email=f"sub-{uuid.uuid4()}@test.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(client)
    await db_session.flush()

    now = datetime.now(UTC)
    sub1 = Subscription(
        id=uuid.uuid4(),
        client_id=client.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        gateway=PaymentProvider.STRIPE,
        amount=Decimal("25000.00"),
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
    )
    db_session.add(sub1)
    await db_session.flush()

    # 2nd active subscription for same client must violate uq_sub_active_per_client
    sub2 = Subscription(
        id=uuid.uuid4(),
        client_id=client.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        gateway=PaymentProvider.STRIPE,
        amount=Decimal("25000.00"),
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
    )

    with pytest.raises((IntegrityError, DBAPIError)):
        async with db_session.begin_nested():
            db_session.add(sub2)
            await db_session.flush()


@pytest.mark.asyncio
async def test_deliverable_version_unique_constraint(db_session: AsyncSession) -> None:
    """Test uq_deliv_root_version: cannot have duplicate (root_id, version)."""
    res = await db_session.execute(select(User).where(User.role == UserRole.CLIENT).limit(1))
    client = res.scalar_one()

    root_id = uuid.uuid4()
    deliv1 = Deliverable(
        id=uuid.uuid4(),
        root_id=root_id,
        version=1,
        client_id=client.id,
        file_url="https://s3.example.com/deliv-v1.mp4",
        file_type="video/mp4",
        file_size_bytes=1024,
        status=DeliverableStatus.DRAFT,
    )
    db_session.add(deliv1)
    await db_session.flush()

    # Duplicate root_id and version
    deliv2 = Deliverable(
        id=uuid.uuid4(),
        root_id=root_id,
        version=1,
        client_id=client.id,
        file_url="https://s3.example.com/deliv-v1-dup.mp4",
        file_type="video/mp4",
        file_size_bytes=2048,
        status=DeliverableStatus.DRAFT,
    )

    with pytest.raises((IntegrityError, DBAPIError)):
        async with db_session.begin_nested():
            db_session.add(deliv2)
            await db_session.flush()


@pytest.mark.asyncio
async def test_deliverable_ig_creation_id_unique_constraint(db_session: AsyncSession) -> None:
    """Test uq_deliv_creation: ig_creation_id must be unique across deliverables."""
    res = await db_session.execute(select(User).where(User.role == UserRole.CLIENT).limit(1))
    client = res.scalar_one()

    shared_ig_id = f"ig_create_{uuid.uuid4()}"
    deliv1 = Deliverable(
        id=uuid.uuid4(),
        root_id=uuid.uuid4(),
        version=1,
        client_id=client.id,
        file_url="https://s3.example.com/deliv-ig-1.mp4",
        file_type="video/mp4",
        file_size_bytes=1024,
        status=DeliverableStatus.PUBLISHED,
        ig_creation_id=shared_ig_id,
    )
    db_session.add(deliv1)
    await db_session.flush()

    deliv2 = Deliverable(
        id=uuid.uuid4(),
        root_id=uuid.uuid4(),
        version=1,
        client_id=client.id,
        file_url="https://s3.example.com/deliv-ig-2.mp4",
        file_type="video/mp4",
        file_size_bytes=1024,
        status=DeliverableStatus.PUBLISHED,
        ig_creation_id=shared_ig_id,
    )

    with pytest.raises((IntegrityError, DBAPIError)):
        async with db_session.begin_nested():
            db_session.add(deliv2)
            await db_session.flush()


@pytest.mark.asyncio
async def test_deliverable_scheduled_check_constraint(db_session: AsyncSession) -> None:
    """Test ck_deliv_scheduled_has_time: scheduled deliverables MUST have scheduled_at set."""
    res = await db_session.execute(select(User).where(User.role == UserRole.CLIENT).limit(1))
    client = res.scalar_one()

    deliv = Deliverable(
        id=uuid.uuid4(),
        root_id=uuid.uuid4(),
        version=1,
        client_id=client.id,
        file_url="https://s3.example.com/deliv-sched.mp4",
        file_type="video/mp4",
        file_size_bytes=1024,
        status=DeliverableStatus.SCHEDULED,
        scheduled_at=None,  # Violates ck_deliv_scheduled_has_time
    )

    with pytest.raises((IntegrityError, DBAPIError)):
        async with db_session.begin_nested():
            db_session.add(deliv)
            await db_session.flush()


@pytest.mark.asyncio
async def test_updated_at_trigger(db_session: AsyncSession) -> None:
    """Test trg_set_updated_at: updating a row automatically increments updated_at."""
    user = User(
        id=uuid.uuid4(),
        auth_id=f"test-trigger-{uuid.uuid4()}",
        email=f"trigger-{uuid.uuid4()}@test.com",
        full_name="Before Update",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.flush()
    initial_updated_at = user.updated_at

    # Small pause to ensure time difference
    await asyncio.sleep(0.05)

    user.full_name = "After Update"
    await db_session.flush()
    await db_session.refresh(user)

    assert user.updated_at > initial_updated_at


def test_rbac_require_roles() -> None:
    """Test RBAC require_roles dependency rejecting unauthorized actors with 403."""
    client_actor = Actor(
        user_id=uuid.uuid4(),
        email="client@example.com",
        role=UserRole.CLIENT,
    )
    editor_actor = Actor(
        user_id=uuid.uuid4(),
        email="editor@creo.network",
        role=UserRole.EDITOR,
    )
    admin_actor = Actor(
        user_id=uuid.uuid4(),
        email="admin@creo.network",
        role=UserRole.SUPER_ADMIN,
    )

    # Dependency expecting staff roles
    staff_gate = require_roles(UserRole.EDITOR, UserRole.TEAM_LEAD, UserRole.SUPER_ADMIN)

    # Client must be rejected with 403 Forbidden
    with pytest.raises(Forbidden) as exc_info:
        staff_gate(actor=client_actor)
    assert exc_info.value.status_code == 403
    assert "not authorized" in exc_info.value.message

    # Editor and Admin must be allowed
    assert staff_gate(actor=editor_actor) == editor_actor
    assert staff_gate(actor=admin_actor) == admin_actor
