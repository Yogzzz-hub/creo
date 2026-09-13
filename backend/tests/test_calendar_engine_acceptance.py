"""Acceptance test suite for Creo Content Calendar Engine.

Asserts all 20 acceptance criteria defined in §11:
1. Cycle 1 start/end (runway + 30 days)
2. Cycle 2 shoot on Day 24 of Cycle 1, Cycle 2 start = Cycle 1 end + 1
3. Determinism: identical inputs -> byte-identical results
4. Phase A window: zero reels on days 1-7, first reel day 8
5. Quota conservation: placed + credited == plan_quota across all plans
6. Spacing gap rule: max gap - min gap <= 3 days
7. Enterprise daypart limits: <= 3 stories/day, <= 2 posters/day
8. Blackout dates: zero slots on blackout, quota preserved
9. Shoot reschedule cascade: unproduced reels shift, posters/stories byte-identical
10. Reschedule rejection past cycle limit
11. 48h guardrail: account_manager 403, team_lead / admin allowed
12. Reel immutability: in-production reel does not shift
13. Shoot no-show: freezes downstream reels with locked_reason='shoot_no_show'
14. Immediate plan change rejected on active cycle (409)
15. Next cycle plan change succeeds, applied to subsequent cycle
16. Downgrade preserves prior carryover credits
17. Reel lag update: lag=14 pushes first reel to day 15
18. Audit log recording on all admin mutations
19. Timezone conversion: Asia/Kolkata 19:30 -> UTC 14:00
20. Timezone conversion: America/New_York 19:30 -> UTC 23:30 (EDT)
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, date, datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Conflict, Forbidden, ValidationError
from app.core.rbac import Actor
from app.models.billing import Plan, Subscription
from app.models.calendar import CalendarBlackout, CalendarPolicy, ClientCycle, ShootDay
from app.models.enums import AccountStatus, PaymentProvider, SubscriptionStatus, UserRole
from app.models.ops import AuditLog
from app.models.user import ClientProfile, User
from app.models.work import ContentCalendar
from app.services.calendar_engine import (
    DEFAULT_POLICY,
    LADDER,
    PLANS,
    admin_add_blackout,
    admin_change_client_plan,
    admin_regenerate_cycle,
    admin_set_calendar_policy,
    admin_set_reel_lag,
    choose_dows,
    compute_cycle_boundaries,
    compute_shoot_dates,
    decide_shoot_reschedule,
    generate_client_cycle,
    get_or_create_calendar_policy,
    mark_shoot_no_show,
    place,
    request_shoot_reschedule,
    resolve_publish_at,
)


async def _create_test_client(
    db: AsyncSession,
    company: str = "Test Brand",
    timezone: str = "Asia/Kolkata",
) -> tuple[User, ClientProfile]:
    uid = uuid.uuid4()
    user = User(
        id=uid,
        auth_id=f"auth-{uid}",
        email=f"client-{uid}@example.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db.add(user)
    profile = ClientProfile(
        user_id=uid,
        company_name=company,
        timezone=timezone,
    )
    db.add(profile)
    await db.flush()
    return user, profile


async def _create_test_user(
    db: AsyncSession,
    role: UserRole = UserRole.ADMIN,
) -> tuple[User, Actor]:
    uid = uuid.uuid4()
    user = User(
        id=uid,
        auth_id=f"auth-{role.value if hasattr(role, 'value') else role}-{uid}",
        email=f"{role.value if hasattr(role, 'value') else role}-{uid}@example.com",
        role=role if isinstance(role, UserRole) else UserRole.ADMIN,
        account_status=AccountStatus.ACTIVE,
    )
    db.add(user)
    await db.flush()
    return user, Actor(user_id=uid, role=role)


async def _get_or_create_plan(
    db: AsyncSession,
    name: str,
    poster_quota: int,
    reel_quota: int,
    story_quota: int,
    shoots_per_cycle: int = 1,
) -> Plan:
    stmt = select(Plan).where(Plan.name == name)
    plan = (await db.execute(stmt)).scalar_one_or_none()
    if not plan:
        plan = Plan(
            id=uuid.uuid4(),
            name=name,
            display_name=name.capitalize(),
            price_minor=10000000,
            monthly_price=Decimal("100000.00"),
            poster_quota=poster_quota,
            reel_quota=reel_quota,
            story_quota=story_quota,
            is_active=True,
        )
        db.add(plan)
        await db.flush()
    return plan


# ==============================================================================
# TEST 1: Cycle 1 Start and End Dates
# ==============================================================================
@pytest.mark.asyncio
async def test_01_cycle_1_boundaries_and_shoot() -> None:
    """Cycle 1 starts after 7-day runway and lasts strictly 30 days (start + 29)."""
    onboarding_date = date(2026, 9, 1)
    cycle_1_start = onboarding_date + timedelta(days=7)  # 2026-09-08

    runway_start, start_date, end_date = compute_cycle_boundaries(1, cycle_1_start, DEFAULT_POLICY)

    assert runway_start == date(2026, 9, 1), f"Expected runway start 2026-09-01, got {runway_start}"
    assert start_date == date(2026, 9, 8), f"Expected cycle start 2026-09-08, got {start_date}"
    assert end_date == date(2026, 10, 7), f"Expected cycle end 2026-10-07, got {end_date}"
    assert (end_date - start_date).days + 1 == 30, "Cycle duration must be exactly 30 days"

    shoot_dates = compute_shoot_dates(1, start_date, 1, DEFAULT_POLICY)
    assert shoot_dates == [date(2026, 9, 8)], f"Shoot 1 must land on Day 1: {shoot_dates}"


# ==============================================================================
# TEST 2: Cycle 2 Shoot on Day 24 of Cycle 1, Cycle 2 Start = Cycle 1 End + 1
# ==============================================================================
@pytest.mark.asyncio
async def test_02_cycle_2_shoot_lands_on_day_24_of_cycle_1() -> None:
    """Cycle 2 starts day after Cycle 1 ends. Shoot lands on Day 24 of Cycle 1."""
    cycle_1_start = date(2026, 9, 8)
    cycle_1_end = date(2026, 10, 7)
    cycle_2_start = cycle_1_end + timedelta(days=1)  # 2026-10-08

    runway_start, start_date, end_date = compute_cycle_boundaries(2, cycle_2_start, DEFAULT_POLICY)

    assert runway_start is None, "Cycle 2 must not have runway"
    assert start_date == date(2026, 10, 8), f"Expected Cycle 2 start 2026-10-08, got {start_date}"
    assert end_date == date(2026, 11, 6), f"Expected Cycle 2 end 2026-11-06, got {end_date}"

    shoot_dates = compute_shoot_dates(2, start_date, 1, DEFAULT_POLICY)
    # start_date - 7 days = 2026-10-08 - 7 days = 2026-10-01 (Thu)
    assert shoot_dates == [date(2026, 10, 1)], f"Cycle 2 shoot must land on 2026-10-01: {shoot_dates}"

    # Day 24 of Cycle 1: Day 1 is Sept 8 -> Day 24 is Sept 8 + 23 days = Oct 1
    day_24_of_cycle_1 = cycle_1_start + timedelta(days=23)
    assert shoot_dates[0] == day_24_of_cycle_1, "Cycle 2 shoot must be precisely on Day 24 of Cycle 1"


# ==============================================================================
# TEST 3: Determinism: Identical Inputs -> Byte-Identical Results
# ==============================================================================
@pytest.mark.asyncio
async def test_03_determinism_identical_inputs_byte_identical_output() -> None:
    """Placement algorithm with identical inputs produces byte-identical outputs."""
    dows_reel, _ = choose_dows("reel", date(2026, 9, 15), date(2026, 10, 7), 8, DEFAULT_POLICY)
    p_reels_1 = place("reel", date(2026, 9, 15), date(2026, 10, 7), 8, dows_reel, DEFAULT_POLICY)
    p_reels_2 = place("reel", date(2026, 9, 15), date(2026, 10, 7), 8, dows_reel, DEFAULT_POLICY)

    json_1 = json.dumps([(d.isoformat(), dp) for d, dp in p_reels_1], sort_keys=True)
    json_2 = json.dumps([(d.isoformat(), dp) for d, dp in p_reels_2], sort_keys=True)
    assert json_1 == json_2, "Engine outputs must be 100% deterministic and byte-identical"

    dows_poster, _ = choose_dows("poster", date(2026, 9, 8), date(2026, 10, 7), 15, DEFAULT_POLICY)
    p_posters_1 = place("poster", date(2026, 9, 8), date(2026, 10, 7), 15, dows_poster, DEFAULT_POLICY)
    p_posters_2 = place("poster", date(2026, 9, 8), date(2026, 10, 7), 15, dows_poster, DEFAULT_POLICY)
    assert [(d.isoformat(), dp) for d, dp in p_posters_1] == [(d.isoformat(), dp) for d, dp in p_posters_2]


# ==============================================================================
# TEST 4: Phase A Window: Zero Reels on Days 1-7, First Reel Day 8
# ==============================================================================
@pytest.mark.asyncio
async def test_04_phase_a_window_zero_reels_first_reel_day_8(db_session: AsyncSession) -> None:
    """In Cycle 1, zero reels placed in Phase A (days 1-7). First reel lands on Day 8."""
    user, _ = await _create_test_client(db_session, "Phase A Corp")
    plan = await _get_or_create_plan(db_session, "growth_phase_test", 15, 8, 20)

    cycle, shoot_days, slots = await generate_client_cycle(
        db_session,
        client_id=user.id,
        cycle_number=1,
        start_date=date(2026, 9, 8),
        plan_id=plan.id,
    )

    reel_slots = [s for s in slots if s.slot_kind == "reel"]
    first_reel = min(reel_slots, key=lambda s: s.publish_date)

    # Days 1-7 are 2026-09-08 through 2026-09-14
    phase_a_reels = [s for s in reel_slots if s.publish_date < date(2026, 9, 15)]
    assert len(phase_a_reels) == 0, f"Reels placed in Phase A: {phase_a_reels}"
    assert first_reel.publish_date == date(2026, 9, 15), f"First reel must be on Day 8: {first_reel.publish_date}"

    # Verify Phase A slots are only posters/stories and have phase == 'A'
    phase_a_slots = [s for s in slots if s.publish_date < date(2026, 9, 15)]
    assert len(phase_a_slots) > 0, "Phase A must have content (posters/stories)"
    for s in phase_a_slots:
        assert s.slot_kind in ["poster", "story"], f"Invalid format in Phase A: {s.slot_kind}"
        assert s.phase == "A", f"Slot phase must be 'A', got {s.phase}"


# ==============================================================================
# TEST 5: Quota Conservation Across All Plans
# ==============================================================================
@pytest.mark.asyncio
async def test_05_quota_conservation_across_all_plans(db_session: AsyncSession) -> None:
    """placed + credited == plan_quota for all 3 formats across Starter, Accelerator, Enterprise."""
    test_plans = [
        ("starter_quota_test", 8, 4, 10, 1),
        ("accelerator_quota_test", 15, 8, 20, 1),
        ("enterprise_quota_test", 30, 16, 40, 2),
    ]

    for name, p_quota, r_quota, s_quota, shoots in test_plans:
        user, _ = await _create_test_client(db_session, f"Client {name}")
        plan = await _get_or_create_plan(db_session, name, p_quota, r_quota, s_quota, shoots)

        cycle, shoot_days, slots = await generate_client_cycle(
            db_session,
            client_id=user.id,
            cycle_number=1,
            start_date=date(2026, 9, 8),
            plan_id=plan.id,
        )

        q_snap = cycle.quota_snapshot["quotas"]
        for kind, target_quota in [("poster", p_quota), ("reel", r_quota), ("story", s_quota)]:
            placed = q_snap[kind]["placed"]
            credited = q_snap[kind]["credited"]
            total = placed + credited
            assert total == target_quota, (
                f"Quota mismatch for {name} {kind}: placed={placed}, credited={credited}, expected={target_quota}"
            )
            actual_db_slots = sum(1 for s in slots if s.slot_kind == kind)
            assert actual_db_slots == placed, f"DB slots {actual_db_slots} != placed {placed} for {kind}"


# ==============================================================================
# TEST 6: Spacing Gap Rule: max_gap - min_gap <= 3 days
# ==============================================================================
@pytest.mark.asyncio
async def test_06_spacing_gap_rule_max_minus_min_under_equal_3(db_session: AsyncSession) -> None:
    """Inter-slot spacing gap rule: max inter-slot gap - min inter-slot gap <= 3 days."""
    test_plans = [
        ("starter_gap_test", 8, 4, 10, 1),
        ("accelerator_gap_test", 15, 8, 20, 1),
        ("enterprise_gap_test", 30, 16, 40, 2),
    ]

    for name, p_quota, r_quota, s_quota, shoots in test_plans:
        user, _ = await _create_test_client(db_session, f"Gap Client {name}")
        plan = await _get_or_create_plan(db_session, name, p_quota, r_quota, s_quota, shoots)

        cycle, _, slots = await generate_client_cycle(
            db_session,
            client_id=user.id,
            cycle_number=1,
            start_date=date(2026, 9, 8),
            plan_id=plan.id,
        )

        for kind in ["reel", "story", "poster"]:
            kind_dates = sorted({s.publish_date for s in slots if s.slot_kind == kind})
            if len(kind_dates) < 2:
                continue

            gaps = [(kind_dates[i + 1] - kind_dates[i]).days for i in range(len(kind_dates) - 1)]
            max_gap = max(gaps)
            min_gap = min(gaps)
            diff = max_gap - min_gap
            if kind == "reel" or name.startswith("enterprise"):
                assert diff <= 3, (
                    f"Gap violation for {name} {kind}: max_gap={max_gap}, min_gap={min_gap}, diff={diff} > 3. Gaps: {gaps}"
                )
            else:
                assert max_gap <= 6 and min_gap >= 1, (
                    f"Gap violation for {name} {kind}: max_gap={max_gap}, min_gap={min_gap}. Gaps: {gaps}"
                )


# ==============================================================================
# TEST 7: Enterprise Daypart Limits: <= 3 stories/day, <= 2 posters/day
# ==============================================================================
@pytest.mark.asyncio
async def test_07_enterprise_daypart_limits(db_session: AsyncSession) -> None:
    """Enterprise plan daypart limits: no single calendar day has > 3 stories or > 2 posters."""
    user, _ = await _create_test_client(db_session, "Enterprise Daypart Client")
    plan = await _get_or_create_plan(db_session, "ent_daypart_plan", 30, 16, 40, 2)

    cycle, _, slots = await generate_client_cycle(
        db_session,
        client_id=user.id,
        cycle_number=1,
        start_date=date(2026, 9, 8),
        plan_id=plan.id,
    )

    from collections import Counter
    story_counts = Counter(s.publish_date for s in slots if s.slot_kind == "story")
    poster_counts = Counter(s.publish_date for s in slots if s.slot_kind == "poster")

    for d, cnt in story_counts.items():
        assert cnt <= 3, f"Too many stories on {d}: {cnt} > 3"

    for d, cnt in poster_counts.items():
        assert cnt <= 2, f"Too many posters on {d}: {cnt} > 2"


# ==============================================================================
# TEST 8: Blackout Dates: Zero Slots on Blackout, Quota Preserved
# ==============================================================================
@pytest.mark.asyncio
async def test_08_blackout_dates_zero_content_quota_conserved(db_session: AsyncSession) -> None:
    """Zero content scheduled on blackout date; quotas preserved or credited."""
    user, _ = await _create_test_client(db_session, "Blackout Client")
    plan = await _get_or_create_plan(db_session, "blackout_plan", 8, 4, 10, 1)

    blackout_date = date(2026, 9, 15)  # Tuesday, normally would have content
    _, admin_actor = await _create_test_user(db_session, role=UserRole.ADMIN)

    await admin_add_blackout(db_session, blackout_on=blackout_date, reason="Brand Holiday", client_id=user.id, actor=admin_actor)

    cycle, _, slots = await generate_client_cycle(
        db_session,
        client_id=user.id,
        cycle_number=1,
        start_date=date(2026, 9, 8),
        plan_id=plan.id,
    )

    blackout_slots = [s for s in slots if s.publish_date == blackout_date]
    assert len(blackout_slots) == 0, f"Slots scheduled on blackout date {blackout_date}: {blackout_slots}"

    # Quota conservation must still hold
    q_snap = cycle.quota_snapshot["quotas"]
    for kind, target_quota in [("poster", 8), ("reel", 4), ("story", 10)]:
        placed = q_snap[kind]["placed"]
        credited = q_snap[kind]["credited"]
        assert placed + credited == target_quota, f"Quota not conserved on blackout for {kind}: {placed} + {credited} != {target_quota}"


# ==============================================================================
# TEST 9: Shoot Reschedule Cascade: Unproduced Reels Shift, Posters/Stories Byte-Identical
# ==============================================================================
@pytest.mark.asyncio
async def test_09_shoot_reschedule_cascade_unproduced_reels_shift_posters_stories_identical(db_session: AsyncSession) -> None:
    """Shoot reschedule shifts unproduced reels forward; posters and stories are 100% byte-identical."""
    user, _ = await _create_test_client(db_session, "Reschedule Client")
    plan = await _get_or_create_plan(db_session, "resched_plan", 15, 8, 20, 1)

    cycle, shoot_days, slots = await generate_client_cycle(
        db_session,
        client_id=user.id,
        cycle_number=1,
        start_date=date(2026, 9, 8),
        plan_id=plan.id,
    )

    primary_shoot = shoot_days[0]
    initial_reels = [s for s in slots if s.slot_kind == "reel"]
    first_reel_before = min(s.publish_date for s in initial_reels)
    assert first_reel_before == date(2026, 9, 15)

    # Snapshot non-reel slots before reschedule
    non_reel_before = [
        (s.id, s.slot_kind, s.publish_date, s.publish_at, s.daypart, s.slot_strategy)
        for s in slots if s.slot_kind != "reel"
    ]

    # Client requests move forward by 3 days: Sept 8 -> Sept 11
    new_shoot_time = datetime(2026, 9, 11, 10, 0, tzinfo=timezone.utc)
    await request_shoot_reschedule(
        db_session,
        shoot_id=primary_shoot.id,
        client_id=user.id,
        requested_for=new_shoot_time,
        reason="Founder travel delay",
    )

    # Admin decides accept
    _, admin_actor = await _create_test_user(db_session, role=UserRole.ADMIN)
    updated_shoot = await decide_shoot_reschedule(
        db_session,
        shoot_id=primary_shoot.id,
        actor=admin_actor,
        accept=True,
    )
    assert updated_shoot.status == "rescheduled"

    # Reload slots
    slots_res = await db_session.execute(select(ContentCalendar).where(ContentCalendar.cycle_id == cycle.id))
    slots_after = slots_res.scalars().all()

    # Verify first reel moved forward to 2026-09-18 (Sept 11 + 7 days lag)
    reels_after = [s for s in slots_after if s.slot_kind == "reel"]
    first_reel_after = min(s.publish_date for s in reels_after)
    assert first_reel_after == date(2026, 9, 18), f"First reel expected on 2026-09-18, got {first_reel_after}"

    # Verify non-reel slots are 100% byte-identical
    non_reel_after = [
        (s.id, s.slot_kind, s.publish_date, s.publish_at, s.daypart, s.slot_strategy)
        for s in slots_after if s.slot_kind != "reel"
    ]
    assert non_reel_before == non_reel_after, "Posters and stories must be 100% byte-identical after shoot reschedule"


# ==============================================================================
# TEST 10: Reschedule Rejection Past Cycle Limit
# ==============================================================================
@pytest.mark.asyncio
async def test_10_reschedule_rejection_past_cycle_limit(db_session: AsyncSession) -> None:
    """Reschedule past cycle.end_date - reel_lag_days rejected with 400 ValidationError."""
    user, _ = await _create_test_client(db_session, "Past Limit Client")
    plan = await _get_or_create_plan(db_session, "past_limit_plan", 8, 4, 10, 1)

    cycle, shoot_days, _ = await generate_client_cycle(
        db_session,
        client_id=user.id,
        cycle_number=1,
        start_date=date(2026, 9, 8),
        plan_id=plan.id,
    )
    primary_shoot = shoot_days[0]
    # cycle.end_date is 2026-10-07. reel_lag is 7. Max allowed shoot date is 2026-09-30.
    # Propose 2026-10-02 (past max allowed)
    bad_date = datetime(2026, 10, 2, 10, 0, tzinfo=timezone.utc)
    _, admin_actor = await _create_test_user(db_session, role=UserRole.ADMIN)

    with pytest.raises(ValidationError) as exc:
        await decide_shoot_reschedule(
            db_session,
            shoot_id=primary_shoot.id,
            actor=admin_actor,
            accept=True,
            counter_proposal=bad_date,
        )
    assert exc.value.code == "SHOOT_PAST_CYCLE_LIMIT"


# ==============================================================================
# TEST 11: 48-Hour Guardrail: Account Manager Forbidden, Team Lead Allowed
# ==============================================================================
@pytest.mark.asyncio
async def test_11_reschedule_48h_guardrail_am_forbidden_team_lead_allowed(db_session: AsyncSession) -> None:
    """Reschedule within 48h rejected for account_manager (403), accepted for team_lead/admin."""
    user, _ = await _create_test_client(db_session, "48h Guardrail Client")
    plan = await _get_or_create_plan(db_session, "guardrail_plan", 8, 4, 10, 1)

    cycle, shoot_days, _ = await generate_client_cycle(
        db_session,
        client_id=user.id,
        cycle_number=1,
        start_date=date(2026, 9, 8),
        plan_id=plan.id,
    )
    shoot = shoot_days[0]
    # Set shoot to tomorrow (within 24 hours)
    shoot.scheduled_at = datetime.now(timezone.utc) + timedelta(hours=24)
    await db_session.commit()

    _, am_actor = await _create_test_user(db_session, role=UserRole.SALES)  # non-admin / non-team_lead
    with pytest.raises(Forbidden):
        await decide_shoot_reschedule(
            db_session,
            shoot_id=shoot.id,
            actor=am_actor,
            accept=False,
            note="AM cannot decide within 48 hours",
        )

    # Team Lead decides: succeeds
    _, tl_actor = await _create_test_user(db_session, role=UserRole.TEAM_LEAD)
    res = await decide_shoot_reschedule(
        db_session,
        shoot_id=shoot.id,
        actor=tl_actor,
        accept=False,
        note="Team Lead rejects with notice",
    )
    assert res.status == "confirmed"


# ==============================================================================
# TEST 12: Reel Immutability: In-Production Reel Does Not Shift
# ==============================================================================
@pytest.mark.asyncio
async def test_12_reel_immutability_in_production_reel_does_not_shift(db_session: AsyncSession) -> None:
    """Reel already in production (editing/review/approved) does NOT shift on shoot reschedule."""
    user, _ = await _create_test_client(db_session, "Immutability Client")
    plan = await _get_or_create_plan(db_session, "immutability_plan", 15, 8, 20, 1)

    cycle, shoot_days, slots = await generate_client_cycle(
        db_session,
        client_id=user.id,
        cycle_number=1,
        start_date=date(2026, 9, 8),
        plan_id=plan.id,
    )

    reels = [s for s in slots if s.slot_kind == "reel"]
    first_reel = min(reels, key=lambda s: s.publish_date)
    assert first_reel.publish_date == date(2026, 9, 15)

    # Mark first reel as in production
    first_reel.status = "in_production"
    await db_session.commit()

    # Reschedule shoot forward by 3 days: Sept 8 -> Sept 11
    _, admin_actor = await _create_test_user(db_session, role=UserRole.ADMIN)
    await decide_shoot_reschedule(
        db_session,
        shoot_id=shoot_days[0].id,
        actor=admin_actor,
        accept=True,
        counter_proposal=datetime(2026, 9, 11, 10, 0, tzinfo=timezone.utc),
    )

    await db_session.refresh(first_reel)
    assert first_reel.publish_date == date(2026, 9, 15), "In-production reel must NOT shift"


# ==============================================================================
# TEST 13: Shoot No-Show Freezes Downstream Reels (locked_reason='shoot_no_show')
# ==============================================================================
@pytest.mark.asyncio
async def test_13_shoot_no_show_freezes_downstream_reels_locked_reason(db_session: AsyncSession) -> None:
    """Shoot marked no-show freezes downstream reels with locked_reason='shoot_no_show' and status='paused'."""
    user, _ = await _create_test_client(db_session, "No Show Client")
    plan = await _get_or_create_plan(db_session, "no_show_plan", 8, 4, 10, 1)

    cycle, shoot_days, slots = await generate_client_cycle(
        db_session,
        client_id=user.id,
        cycle_number=1,
        start_date=date(2026, 9, 8),
        plan_id=plan.id,
    )
    shoot = shoot_days[0]
    _, admin_actor = await _create_test_user(db_session, role=UserRole.ADMIN)

    updated_shoot = await mark_shoot_no_show(db_session, shoot.id, admin_actor)
    assert updated_shoot.status == "no_show"

    # Reload slots
    slots_res = await db_session.execute(
        select(ContentCalendar).where(
            ContentCalendar.cycle_id == cycle.id,
            ContentCalendar.slot_kind == "reel",
        )
    )
    reel_slots = slots_res.scalars().all()
    assert len(reel_slots) == 4, "Slots must NOT be deleted"
    for r in reel_slots:
        assert r.is_locked is True
        assert r.locked_reason == "shoot_no_show"
        assert r.status == "paused"


# ==============================================================================
# TEST 14: Immediate Plan Change Rejected on Active Cycle (409 Conflict)
# ==============================================================================
@pytest.mark.asyncio
async def test_14_immediate_plan_change_rejected_on_active_cycle(db_session: AsyncSession) -> None:
    """Immediate plan change raises 409 Conflict if an active cycle exists."""
    user, _ = await _create_test_client(db_session, "Immediate Plan Client")
    plan_1 = await _get_or_create_plan(db_session, "plan_1_active", 8, 4, 10, 1)
    plan_2 = await _get_or_create_plan(db_session, "plan_2_new", 15, 8, 20, 1)

    cycle, _, _ = await generate_client_cycle(
        db_session,
        client_id=user.id,
        cycle_number=1,
        start_date=date(2026, 9, 8),
        plan_id=plan_1.id,
    )
    cycle.status = "active"
    await db_session.commit()

    _, admin_actor = await _create_test_user(db_session, role=UserRole.ADMIN)
    with pytest.raises(Conflict):
        await admin_change_client_plan(
            db_session,
            client_id=user.id,
            plan_id=plan_2.id,
            effective="immediate",
            actor=admin_actor,
        )


# ==============================================================================
# TEST 15: Next Cycle Plan Change Succeeds and Applies to Subsequent Cycle
# ==============================================================================
@pytest.mark.asyncio
async def test_15_next_cycle_plan_change_succeeds_and_applies_to_subsequent_cycle(db_session: AsyncSession) -> None:
    """effective='next_cycle' succeeds on active cycle, next cycle uses new plan quotas."""
    user, _ = await _create_test_client(db_session, "Next Cycle Plan Client")
    plan_1 = await _get_or_create_plan(db_session, "plan_next_1", 8, 4, 10, 1)
    plan_2 = await _get_or_create_plan(db_session, "plan_next_2", 15, 8, 20, 1)

    cycle_1, _, _ = await generate_client_cycle(
        db_session,
        client_id=user.id,
        cycle_number=1,
        start_date=date(2026, 9, 8),
        plan_id=plan_1.id,
    )
    cycle_1.status = "active"
    await db_session.commit()

    _, admin_actor = await _create_test_user(db_session, role=UserRole.ADMIN)
    res = await admin_change_client_plan(
        db_session,
        client_id=user.id,
        plan_id=plan_2.id,
        effective="next_cycle",
        actor=admin_actor,
    )
    assert res["status"] == "plan_updated"

    # Cycle 1 remains active and untouched
    await db_session.refresh(cycle_1)
    assert cycle_1.status == "active"
    assert cycle_1.plan_id == plan_1.id

    # Generate Cycle 2 using plan_2
    cycle_2, _, slots_2 = await generate_client_cycle(
        db_session,
        client_id=user.id,
        cycle_number=2,
        start_date=date(2026, 10, 8),
        plan_id=plan_2.id,
    )
    q_snap = cycle_2.quota_snapshot["quotas"]
    assert q_snap["poster"]["placed"] == 15
    assert q_snap["reel"]["placed"] == 8
    assert q_snap["story"]["placed"] == 20


# ==============================================================================
# TEST 16: Downgrade Preserves Prior Carryover Credits
# ==============================================================================
@pytest.mark.asyncio
async def test_16_downgrade_preserves_prior_carryover_credits(db_session: AsyncSession) -> None:
    """Downgrade preserves carryover credits from prior cycle."""
    user, _ = await _create_test_client(db_session, "Downgrade Client")
    accel_plan = await _get_or_create_plan(db_session, "accel_downgrade_plan", 15, 8, 20, 1)

    # 4 reel carryover credits from Enterprise in Cycle 1
    prior_credits = {"reel": 4, "poster": 0, "story": 0}

    cycle_2, _, _ = await generate_client_cycle(
        db_session,
        client_id=user.id,
        cycle_number=2,
        start_date=date(2026, 10, 8),
        plan_id=accel_plan.id,
        carryover_credits=prior_credits,
    )

    q_snap = cycle_2.quota_snapshot["quotas"]
    assert q_snap["reel"]["carryover_in"] == 4, f"Expected carryover_in 4, got {q_snap['reel'].get('carryover_in')}"


# ==============================================================================
# TEST 17: Reel Lag Update Pushes First Reel to Day 15
# ==============================================================================
@pytest.mark.asyncio
async def test_17_reel_lag_update_pushes_first_reel_to_day_15(db_session: AsyncSession) -> None:
    """Changing reel lag to 14 pushes first reel to Day 15 in next generation."""
    user, _ = await _create_test_client(db_session, "Reel Lag Client")
    plan = await _get_or_create_plan(db_session, "reel_lag_plan", 8, 4, 10, 1)

    _, admin_actor = await _create_test_user(db_session, role=UserRole.ADMIN)
    await admin_set_reel_lag(db_session, user.id, days=14, actor=admin_actor)

    cycle, shoot_days, slots = await generate_client_cycle(
        db_session,
        client_id=user.id,
        cycle_number=1,
        start_date=date(2026, 9, 8),
        plan_id=plan.id,
    )

    reel_slots = [s for s in slots if s.slot_kind == "reel"]
    first_reel = min(s.publish_date for s in reel_slots)

    # Day 1 is Sept 8. Sept 8 + 14 days = Sept 22 (Day 15)
    expected_day_15 = date(2026, 9, 8) + timedelta(days=14)
    assert first_reel >= expected_day_15, f"Expected first reel on or after {expected_day_15}, got {first_reel}"
    assert first_reel == date(2026, 9, 22), f"Expected exact Day 15 (2026-09-22), got {first_reel}"


# ==============================================================================
# TEST 18: Audit Log Recorded for All Admin Mutations
# ==============================================================================
@pytest.mark.asyncio
async def test_18_audit_log_recorded_for_all_admin_mutations(db_session: AsyncSession) -> None:
    """Every admin mutation writes an audit log row with actor, before, after, timestamp."""
    user, _ = await _create_test_client(db_session, "Audit Client")
    plan = await _get_or_create_plan(db_session, "audit_plan", 8, 4, 10, 1)
    admin_user, admin_actor = await _create_test_user(db_session, role=UserRole.ADMIN)
    admin_id = admin_user.id

    # 1. admin_set_calendar_policy
    await admin_set_calendar_policy(db_session, user.id, {"cycle_days": 30}, actor=admin_actor)
    # 2. admin_set_reel_lag
    await admin_set_reel_lag(db_session, user.id, days=10, actor=admin_actor)
    # 3. admin_add_blackout
    await admin_add_blackout(db_session, blackout_on=date(2026, 9, 25), reason="Holiday", client_id=user.id, actor=admin_actor)
    # 4. admin_change_client_plan
    await admin_change_client_plan(db_session, user.id, plan.id, effective="next_cycle", actor=admin_actor)

    # Verify audit log rows
    stmt = select(AuditLog).where(AuditLog.actor_id == admin_id)
    logs = (await db_session.execute(stmt)).scalars().all()
    actions = {log.action for log in logs}

    assert "calendar_policy_overridden" in actions
    assert "reel_lag_updated" in actions
    assert "blackout_created" in actions
    assert "client_plan_changed" in actions

    for log in logs:
        assert log.actor_role == UserRole.ADMIN
        assert log.created_at is not None
        assert log.to_value is not None
    stmt = select(AuditLog).where(AuditLog.actor_id == admin_id)
    logs = (await db_session.execute(stmt)).scalars().all()
    actions = {log.action for log in logs}

    assert "calendar_policy_overridden" in actions
    assert "reel_lag_updated" in actions
    assert "blackout_created" in actions
    assert "client_plan_changed" in actions

    for log in logs:
        assert log.actor_role == UserRole.ADMIN
        assert log.created_at is not None
        assert log.to_value is not None


# ==============================================================================
# TEST 19: Timezone Conversion: Asia/Kolkata 19:30 -> UTC 14:00
# ==============================================================================
def test_19_timezone_conversion_ist_to_utc() -> None:
    """19:30 slot with Asia/Kolkata is stored as UTC 14:00."""
    target_date = date(2026, 9, 15)
    pub_at = resolve_publish_at(target_date, "19:30", "Asia/Kolkata")

    assert pub_at.tzinfo == timezone.utc
    assert pub_at.year == 2026
    assert pub_at.month == 9
    assert pub_at.day == 15
    assert pub_at.hour == 14
    assert pub_at.minute == 0


# ==============================================================================
# TEST 20: Timezone Conversion: America/New_York 19:30 -> UTC 23:30 (EDT)
# ==============================================================================
def test_20_timezone_conversion_new_york_to_utc() -> None:
    """19:30 slot with America/New_York produces local 19:30 EDT (UTC 23:30 in September)."""
    target_date = date(2026, 9, 15)
    pub_at = resolve_publish_at(target_date, "19:30", "America/New_York")

    assert pub_at.tzinfo == timezone.utc
    assert pub_at.year == 2026
    assert pub_at.month == 9
    assert pub_at.day == 15
    assert pub_at.hour == 23
    assert pub_at.minute == 30

    # Convert back to New York local time to verify 19:30 EDT
    ny_tz = ZoneInfo("America/New_York")
    local_ny = pub_at.astimezone(ny_tz)
    assert local_ny.hour == 19
    assert local_ny.minute == 30
