"""Acceptance tests for Creo unified dispatch & planning engine (Part 10)."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import Plan, Subscription
from app.models.enums import AccountStatus, DeliverableType, PaymentProvider, SubscriptionStatus, TaskStatus, UserRole
from app.models.ops import LeaveRequest
from app.models.user import ClientProfile, StaffProfile, User
from app.models.work import ClientAssignment, ContentCalendar, Task
from app.services.dispatch_engine import (
    approve_calendar_month,
    assign_continuity_first,
    assign_load_first,
    assign_pod,
    draft_month_calendar,
    get_task_effort_points,
    rebalance_nightly_sweep,
)


@pytest.mark.asyncio
async def test_continuity_first_routes_to_original_creator_for_revision(db_session: AsyncSession) -> None:
    """1. A revision routes to the original creator when they are eligible."""
    today = date.today()

    # Create client
    client = User(
        auth_id=f"auth-cf-{uuid.uuid4()}",
        email=f"client-cf-{uuid.uuid4()}@example.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(client)
    await db_session.flush()

    # Create Creator A (original creator)
    creator_a = User(
        auth_id=f"auth-cr-a-{uuid.uuid4()}",
        email=f"creator-a-{uuid.uuid4()}@example.com",
        role=UserRole.EDITOR,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(creator_a)
    await db_session.flush()

    prof_a = StaffProfile(
        user_id=creator_a.id,
        department="video",
        daily_capacity=5,
        daily_points=15,
        skills=["video"],
        is_accepting_work=True,
    )
    db_session.add(prof_a)

    # Create Editor B (pod member, lower load)
    editor_b = User(
        auth_id=f"auth-ed-b-{uuid.uuid4()}",
        email=f"editor-b-{uuid.uuid4()}@example.com",
        role=UserRole.EDITOR,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(editor_b)
    await db_session.flush()

    prof_b = StaffProfile(
        user_id=editor_b.id,
        department="video",
        daily_capacity=5,
        daily_points=15,
        skills=["video"],
        is_accepting_work=True,
    )
    db_session.add(prof_b)

    # Assign Editor B to client pod
    db_session.add(ClientAssignment(client_id=client.id, user_id=editor_b.id, role="video_editor"))

    # Revision task specifying Creator A as parent assignee
    task = Task(
        client_id=client.id,
        deliverable_type=DeliverableType.REEL,
        status=TaskStatus.BACKLOG,
        due_date=today + timedelta(days=3),
        is_revision=True,
        parent_assignee_id=creator_a.id,
        effort_points=2,  # Discounted revision
    )
    db_session.add(task)
    await db_session.commit()

    assigned_id = await assign_continuity_first(db_session, task)
    assert assigned_id == creator_a.id, "Revision MUST route to original creator when eligible"

    await db_session.refresh(task)
    assert task.assigned_to == creator_a.id
    assert task.status == TaskStatus.IN_PRODUCTION


@pytest.mark.asyncio
async def test_original_creator_on_leave_falls_back_to_pod_member(db_session: AsyncSession) -> None:
    """2. Original creator on leave on the due date -> routes to the pod member."""
    today = date.today()
    due = today + timedelta(days=3)

    client = User(
        auth_id=f"auth-fb-{uuid.uuid4()}",
        email=f"client-fb-{uuid.uuid4()}@example.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(client)
    await db_session.flush()

    # Creator A is on approved leave on the due date
    creator_a = User(
        auth_id=f"auth-cr-leave-{uuid.uuid4()}",
        email=f"creator-leave-{uuid.uuid4()}@example.com",
        role=UserRole.EDITOR,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(creator_a)
    await db_session.flush()

    prof_a = StaffProfile(
        user_id=creator_a.id,
        department="video",
        daily_capacity=5,
        daily_points=15,
        skills=["video"],
        is_accepting_work=True,
    )
    db_session.add(prof_a)

    leave_a = LeaveRequest(
        user_id=creator_a.id,
        start_date=due - timedelta(days=1),
        end_date=due + timedelta(days=1),
        status="approved",
    )
    db_session.add(leave_a)

    # Editor B is the client's pod editor (available)
    editor_b = User(
        auth_id=f"auth-ed-pod-{uuid.uuid4()}",
        email=f"editor-pod-{uuid.uuid4()}@example.com",
        role=UserRole.EDITOR,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(editor_b)
    await db_session.flush()

    prof_b = StaffProfile(
        user_id=editor_b.id,
        department="video",
        daily_capacity=5,
        daily_points=15,
        skills=["video"],
        is_accepting_work=True,
    )
    db_session.add(prof_b)
    db_session.add(ClientAssignment(client_id=client.id, user_id=editor_b.id, role="video_editor"))

    task = Task(
        client_id=client.id,
        deliverable_type=DeliverableType.REEL,
        status=TaskStatus.BACKLOG,
        due_date=due,
        is_revision=True,
        parent_assignee_id=creator_a.id,
        effort_points=2,
    )
    db_session.add(task)
    await db_session.commit()

    assigned_id = await assign_continuity_first(db_session, task)
    assert assigned_id == editor_b.id, "When creator is on leave, continuity routes to pod specialist"


@pytest.mark.asyncio
async def test_effort_points_weighting_favors_less_loaded_worker(db_session: AsyncSession) -> None:
    """3. An editor with reels (high effort) vs stories (low effort) rank correctly."""
    today = date.today()
    due = today + timedelta(days=2)

    client = User(
        auth_id=f"auth-eff-{uuid.uuid4()}",
        email=f"client-eff-{uuid.uuid4()}@example.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(client)
    await db_session.flush()

    skill_tag = f"video_eff_{uuid.uuid4().hex[:6]}"

    # Heavy Editor: has 2 reels (10 points)
    editor_heavy = User(
        auth_id=f"auth-hvy-{uuid.uuid4()}",
        email=f"heavy-{uuid.uuid4()}@example.com",
        role=UserRole.EDITOR,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(editor_heavy)
    await db_session.flush()

    db_session.add(StaffProfile(
        user_id=editor_heavy.id,
        department="video",
        daily_capacity=6,
        daily_points=20,
        skills=[skill_tag],
        is_accepting_work=True,
    ))

    task_h1 = Task(
        client_id=client.id,
        deliverable_type=DeliverableType.REEL,
        status=TaskStatus.IN_PRODUCTION,
        due_date=due,
        effort_points=5,
        assigned_to=editor_heavy.id,
    )
    task_h2 = Task(
        client_id=client.id,
        deliverable_type=DeliverableType.REEL,
        status=TaskStatus.IN_PRODUCTION,
        due_date=due,
        effort_points=5,
        assigned_to=editor_heavy.id,
    )
    db_session.add_all([task_h1, task_h2])

    # Light Editor: has 2 stories (2 points)
    editor_light = User(
        auth_id=f"auth-lgt-{uuid.uuid4()}",
        email=f"light-{uuid.uuid4()}@example.com",
        role=UserRole.EDITOR,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(editor_light)
    await db_session.flush()

    db_session.add(StaffProfile(
        user_id=editor_light.id,
        department="video",
        daily_capacity=6,
        daily_points=20,
        skills=[skill_tag],
        is_accepting_work=True,
    ))

    task_l1 = Task(
        client_id=client.id,
        deliverable_type=DeliverableType.STORY,
        status=TaskStatus.IN_PRODUCTION,
        due_date=due,
        effort_points=1,
        assigned_to=editor_light.id,
    )
    task_l2 = Task(
        client_id=client.id,
        deliverable_type=DeliverableType.STORY,
        status=TaskStatus.IN_PRODUCTION,
        due_date=due,
        effort_points=1,
        assigned_to=editor_light.id,
    )
    db_session.add_all([task_l1, task_l2])
    await db_session.commit()

    # New task: Reel (5 effort points)
    new_task = Task(
        client_id=client.id,
        deliverable_type=DeliverableType.REEL,
        status=TaskStatus.BACKLOG,
        due_date=due,
        effort_points=5,
    )
    db_session.add(new_task)
    await db_session.commit()

    assigned_id = await assign_load_first(db_session, new_task, required_skill_override=skill_tag)
    assert assigned_id == editor_light.id, (
        "Dispatcher must assign to the lighter worker (2 effort points vs 10 effort points), "
        "even though both currently have 2 active tasks"
    )


@pytest.mark.asyncio
async def test_rebalance_never_reassigns_in_production_task(db_session: AsyncSession) -> None:
    """Rule: never reassign a task already in_production."""
    today = date.today()

    client = User(
        auth_id=f"auth-reb-{uuid.uuid4()}",
        email=f"client-reb-{uuid.uuid4()}@example.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    staff = User(
        auth_id=f"auth-reb-s-{uuid.uuid4()}",
        email=f"staff-reb-{uuid.uuid4()}@example.com",
        role=UserRole.EDITOR,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add_all([client, staff])
    await db_session.flush()

    db_session.add(StaffProfile(user_id=staff.id, department="video", skills=["video"]))

    # Staff takes sudden approved leave covering today
    db_session.add(LeaveRequest(
        user_id=staff.id,
        start_date=today,
        end_date=today + timedelta(days=2),
        status="approved",
    ))

    # Task is IN_PRODUCTION (work is actively underway)
    task = Task(
        client_id=client.id,
        deliverable_type=DeliverableType.REEL,
        status=TaskStatus.IN_PRODUCTION,
        due_date=today,
        assigned_to=staff.id,
    )
    db_session.add(task)
    await db_session.commit()

    # Run rebalance sweep
    res = await rebalance_nightly_sweep(db_session)

    # Assert task is STILL assigned to staff and STILL in_production
    await db_session.refresh(task)
    assert task.assigned_to == staff.id, "Rebalance must NEVER strip an in-production task from its worker"
    assert task.status == TaskStatus.IN_PRODUCTION
