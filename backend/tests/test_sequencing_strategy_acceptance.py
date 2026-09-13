"""Acceptance test suite for the Creo Content Calendar Sequencing Strategy.

Asserts all 16 acceptance criteria and verification fixtures defined in §6 and §7:
1. All three plans: zero dark days within active set (len(dark) == 0).
2. Starter active set is exactly 22 weekdays; zero weekend slots.
3. Accelerator and Enterprise active sets are all 30 days.
4. Full quota delivered: placed == quota for reels, posters, stories.
5. No two reels on consecutive days when reels <= 8 (Starter & Accelerator).
6. Reel gap spread: max - min <= 3 days for Starter and Accelerator.
7. >= 70% of reels land on Mon-Thu across all plans.
8. No consecutive items have the same pillar.
9. Funnel spacing: rolling 5-day window for conversion items (validated on Starter).
10. Cycle funnel mix within +-5% of target 40/40/20 (Reach: 35-45%, Authority: 35-45%, Conversion: 15-25%).
11. Every reel has a teaser story on the preceding active day (wherever quota allows).
12. Max per day: story <= 3, poster <= 2, reel <= 1.
13. Every story has a non-null valid story_role (teaser, echo, coverage, standalone).
14. Week 4 repurposing: contains at least one slot_source='repurpose' slot with source_slot_id pointing to a week 1-3 reel.
15. Determinism: Generating the same cycle twice produces byte-identical slots and attributes.
16. Blackout dates: Adding 3 blackouts -> zero dark days among remaining active days, full quota placed or credited.
"""

from __future__ import annotations

import uuid
from collections import Counter
from datetime import date, timedelta
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import Plan
from app.models.calendar import CalendarBlackout
from app.models.enums import AccountStatus, UserRole
from app.models.user import ClientProfile, User
from app.models.work import ContentCalendar
from app.services.calendar_engine import (
    active_days,
    admin_add_blackout,
    generate_client_cycle,
)


async def _create_test_client(
    db: AsyncSession,
    company: str = "Test Brand",
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
        timezone="Asia/Kolkata",
    )
    db.add(profile)
    await db.flush()
    return user, profile


async def _get_or_create_plan(
    db: AsyncSession,
    name: str,
    posters: int,
    reels: int,
    stories: int,
    shoots: int = 1,
) -> Plan:
    stmt = select(Plan).where(Plan.name == name)
    plan = (await db.execute(stmt)).scalar_one_or_none()
    if not plan:
        plan = Plan(
            id=uuid.uuid4(),
            name=name,
            display_name=name.replace("_", " ").title(),
            price_minor=5000000,
            currency="INR",
            reel_quota=reels,
            poster_quota=posters,
            story_quota=stories,
            revision_rounds=2,
            is_active=True,
        )
        db.add(plan)
        await db.flush()
    return plan


@pytest.mark.asyncio
async def test_01_to_04_coverage_and_active_sets(db_session: AsyncSession) -> None:
    """Criteria 1, 2, 3, 4: Zero dark days, active sets, and full quota delivered."""
    start_date = date(2026, 9, 8)
    cycle_days = [start_date + timedelta(days=i) for i in range(30)]

    plans_to_test = [
        ("starter_coverage", 8, 4, 10, 22, False),
        ("accelerator_coverage", 15, 8, 20, 30, True),
        ("enterprise_coverage", 30, 16, 40, 30, True),
    ]

    for name, p_quota, r_quota, s_quota, exp_active_count, weekend_allowed in plans_to_test:
        user, _ = await _create_test_client(db_session, f"Client {name}")
        plan = await _get_or_create_plan(db_session, name, p_quota, r_quota, s_quota)

        cycle, _, slots = await generate_client_cycle(
            db_session,
            client_id=user.id,
            cycle_number=1,
            start_date=start_date,
            plan_id=plan.id,
        )

        act = active_days(cycle_days, p_quota + r_quota + s_quota)
        assert len(act) == exp_active_count, f"Active set count mismatch for {name}: {len(act)} != {exp_active_count}"

        # 1. Zero dark days within active set
        active_set = set(act)
        slot_dates = {s.publish_date for s in slots}
        dark_days = [d for d in active_set if d not in slot_dates]
        assert len(dark_days) == 0, f"Dark days found in active set for {name}: {dark_days}"

        # 2. Starter: no weekend slots
        if not weekend_allowed:
            weekend_slots = [s for s in slots if s.publish_date.weekday() >= 5]
            assert len(weekend_slots) == 0, f"Weekend slots found for Starter: {weekend_slots}"

        # 3. Full quota delivered: placed == quota
        r_placed = sum(1 for s in slots if s.slot_kind == "reel")
        p_placed = sum(1 for s in slots if s.slot_kind == "poster")
        s_placed = sum(1 for s in slots if s.slot_kind == "story")
        assert r_placed == r_quota, f"Reel mismatch for {name}: {r_placed} != {r_quota}"
        assert p_placed == p_quota, f"Poster mismatch for {name}: {p_placed} != {p_quota}"
        assert s_placed == s_quota, f"Story mismatch for {name}: {s_placed} != {s_quota}"


@pytest.mark.asyncio
async def test_05_to_07_rhythm_reels_spacing_and_dow(db_session: AsyncSession) -> None:
    """Criteria 5, 6, 7: Reel consecutive days, gap spread, and >=70% Mon-Thu."""
    start_date = date(2026, 9, 8)

    plans_to_test = [
        ("starter_rhythm", 8, 4, 10),
        ("accelerator_rhythm", 15, 8, 20),
        ("enterprise_rhythm", 30, 16, 40),
    ]

    for name, p_quota, r_quota, s_quota in plans_to_test:
        user, _ = await _create_test_client(db_session, f"Client {name}")
        plan = await _get_or_create_plan(db_session, name, p_quota, r_quota, s_quota)

        cycle, _, slots = await generate_client_cycle(
            db_session,
            client_id=user.id,
            cycle_number=1,
            start_date=start_date,
            plan_id=plan.id,
        )

        reel_dates = sorted({s.publish_date for s in slots if s.slot_kind == "reel"})
        gaps = [(reel_dates[i + 1] - reel_dates[i]).days for i in range(len(reel_dates) - 1)]

        # 5. No two reels on consecutive days when reels <= 8
        if r_quota <= 8:
            assert min(gaps) >= 2, f"Consecutive reels found for {name}: min_gap={min(gaps)}"

            # 6. Reel gap spread: max - min <= 3 days
            spread = max(gaps) - min(gaps)
            assert spread <= 3, f"Reel gap spread violated for {name}: max={max(gaps)}, min={min(gaps)}, spread={spread}"

        # 7. >= 70% of reels land on Mon-Thu (weekday 0, 1, 2, 3)
        mon_thu_reels = sum(1 for d in reel_dates if d.weekday() in [0, 1, 2, 3])
        mon_thu_pct = mon_thu_reels / len(reel_dates)
        assert mon_thu_pct >= 0.70, f"Mon-Thu reel percentage {mon_thu_pct*100:.1f}% < 70% for {name}"


@pytest.mark.asyncio
async def test_08_to_10_pillars_and_funnel(db_session: AsyncSession) -> None:
    """Criteria 8, 9, 10: Pillar alternation, funnel mix +-5% of 40/40/20, and funnel spacing."""
    start_date = date(2026, 9, 8)

    plans_to_test = [
        ("starter_funnel", 8, 4, 10),
        ("accelerator_funnel", 15, 8, 20),
        ("enterprise_funnel", 30, 16, 40),
    ]

    for name, p_quota, r_quota, s_quota in plans_to_test:
        user, _ = await _create_test_client(db_session, f"Client {name}")
        plan = await _get_or_create_plan(db_session, name, p_quota, r_quota, s_quota)

        cycle, _, slots = await generate_client_cycle(
            db_session,
            client_id=user.id,
            cycle_number=1,
            start_date=start_date,
            plan_id=plan.id,
        )

        sorted_slots = sorted(slots, key=lambda s: (s.publish_date, s.scheduled_time))

        # 8. No pillar repeats on consecutive items
        for i in range(len(sorted_slots) - 1):
            p1 = sorted_slots[i].pillar
            p2 = sorted_slots[i + 1].pillar
            assert p1 != p2, f"Pillar repeat at index {i}: {p1} == {p2} on {name}"

        # 10. Cycle funnel mix within +-5% of 40/40/20
        total_items = len(sorted_slots)
        mix = Counter(s.funnel_stage for s in sorted_slots)
        reach_pct = mix["reach"] / total_items
        auth_pct = mix["authority"] / total_items
        conv_pct = mix["conversion"] / total_items

        assert 0.35 <= reach_pct <= 0.45, f"Reach mix out of range for {name}: {reach_pct*100:.1f}%"
        assert 0.35 <= auth_pct <= 0.45, f"Authority mix out of range for {name}: {auth_pct*100:.1f}%"
        assert 0.15 <= conv_pct <= 0.25, f"Conversion mix out of range for {name}: {conv_pct*100:.1f}%"

        # First feed post of cycle is never conversion
        feed_slots = [s for s in sorted_slots if s.slot_kind in ["reel", "poster"]]
        assert feed_slots[0].funnel_stage != "conversion", f"First feed post is conversion for {name}"

        # 9. Rolling 5-day window for conversion items on Starter:
        if name.startswith("starter"):
            conv_dates = [s.publish_date for s in sorted_slots if s.funnel_stage == "conversion"]
            conv_gaps = [(conv_dates[i + 1] - conv_dates[i]).days for i in range(len(conv_dates) - 1)]
            assert min(conv_gaps) >= 5, f"Conversion items too close on Starter: {conv_gaps}"


@pytest.mark.asyncio
async def test_11_to_13_stories_orbit_and_roles(db_session: AsyncSession) -> None:
    """Criteria 11, 12, 13: Teaser story before reel, daypart capacity, and non-null story_role."""
    start_date = date(2026, 9, 8)
    cycle_days = [start_date + timedelta(days=i) for i in range(30)]

    for name, p_quota, r_quota, s_quota in [
        ("starter_stories", 8, 4, 10),
        ("accelerator_stories", 15, 8, 20),
        ("enterprise_stories", 30, 16, 40),
    ]:
        user, _ = await _create_test_client(db_session, f"Client {name}")
        plan = await _get_or_create_plan(db_session, name, p_quota, r_quota, s_quota)

        cycle, _, slots = await generate_client_cycle(
            db_session,
            client_id=user.id,
            cycle_number=1,
            start_date=start_date,
            plan_id=plan.id,
        )

        act = set(active_days(cycle_days, p_quota + r_quota + s_quota))
        story_slots = [s for s in slots if s.slot_kind == "story"]
        reel_slots = [s for s in slots if s.slot_kind == "reel"]
        poster_slots = [s for s in slots if s.slot_kind == "poster"]

        # 12. Story <= 3, Poster <= 2, Reel <= 1 per day
        s_by_date = Counter(s.publish_date for s in story_slots)
        p_by_date = Counter(s.publish_date for s in poster_slots)
        r_by_date = Counter(s.publish_date for s in reel_slots)

        for d in act:
            assert s_by_date[d] <= 3, f"Too many stories on {d}: {s_by_date[d]} > 3"
            assert p_by_date[d] <= 2, f"Too many posters on {d}: {p_by_date[d]} > 2"
            assert r_by_date[d] <= 1, f"Too many reels on {d}: {r_by_date[d]} > 1"

        # 13. Every story has non-null story_role in valid set
        valid_roles = {"teaser", "echo", "coverage", "standalone"}
        for s in story_slots:
            assert s.story_role is not None, f"Story on {s.publish_date} has null story_role"
            assert s.story_role in valid_roles, f"Story on {s.publish_date} has invalid role: {s.story_role}"

        # 11. Every reel has a teaser story on preceding active day (when quota allows)
        if name.startswith("accelerator") or name.startswith("enterprise"):
            sorted_act = sorted(act)
            teaser_dates = {s.publish_date for s in story_slots if s.story_role == "teaser"}
            for r in reel_slots:
                preceding = [d for d in sorted_act if d < r.publish_date]
                if preceding:
                    assert preceding[-1] in teaser_dates, f"Missing teaser on {preceding[-1]} for reel on {r.publish_date}"


@pytest.mark.asyncio
async def test_14_repurposing_loop_week_4(db_session: AsyncSession) -> None:
    """Criterion 14: Week 4 contains slot_source='repurpose' pointing to week 1-3 reel."""
    start_date = date(2026, 9, 8)
    w4_start = start_date + timedelta(days=21)
    w4_end = start_date + timedelta(days=27)

    for name, p_quota, r_quota, s_quota in [
        ("acc_repurpose", 15, 8, 20),
        ("ent_repurpose", 30, 16, 40),
    ]:
        user, _ = await _create_test_client(db_session, f"Client {name}")
        plan = await _get_or_create_plan(db_session, name, p_quota, r_quota, s_quota)

        cycle, _, slots = await generate_client_cycle(
            db_session,
            client_id=user.id,
            cycle_number=1,
            start_date=start_date,
            plan_id=plan.id,
        )

        repurpose_slots = [
            s for s in slots
            if s.slot_source == "repurpose" and w4_start <= s.publish_date <= w4_end
        ]
        assert len(repurpose_slots) >= 1, f"No repurpose slots found in Week 4 for {name}"

        # Verify source_slot_id points to a week 1-3 reel
        early_reel_ids = {s.id for s in slots if s.slot_kind == "reel" and s.publish_date < w4_start}
        for r_slot in repurpose_slots:
            assert r_slot.source_slot_id in early_reel_ids, f"Repurpose slot {r_slot.id} has invalid source_slot_id"
            assert "carousel version" in (r_slot.blueprint or {}).get("brief", ""), "Missing repurpose brief"


@pytest.mark.asyncio
async def test_15_determinism(db_session: AsyncSession) -> None:
    """Criterion 15: Generating cycle twice produces byte-identical slots."""
    start_date = date(2026, 9, 8)
    user, _ = await _create_test_client(db_session, "Determinism Client")
    plan = await _get_or_create_plan(db_session, "acc_determinism", 15, 8, 20)

    # Run 1
    cycle1, _, slots1 = await generate_client_cycle(
        db_session, client_id=user.id, cycle_number=1, start_date=start_date, plan_id=plan.id
    )

    # Run 2
    cycle2, _, slots2 = await generate_client_cycle(
        db_session, client_id=user.id, cycle_number=1, start_date=start_date, plan_id=plan.id
    )

    assert len(slots1) == len(slots2)
    s1_tuples = [
        (s.publish_date, s.slot_kind, s.scheduled_time, s.daypart, s.pillar, s.funnel_stage, s.slot_source, s.story_role)
        for s in sorted(slots1, key=lambda x: (x.publish_date, x.scheduled_time, x.slot_kind))
    ]
    s2_tuples = [
        (s.publish_date, s.slot_kind, s.scheduled_time, s.daypart, s.pillar, s.funnel_stage, s.slot_source, s.story_role)
        for s in sorted(slots2, key=lambda x: (x.publish_date, x.scheduled_time, x.slot_kind))
    ]
    assert s1_tuples == s2_tuples, "Deterministic slots mismatch between run 1 and run 2"


@pytest.mark.asyncio
async def test_16_blackout_dates_zero_dark_days_and_quota(db_session: AsyncSession) -> None:
    """Criterion 16: 3 blackout dates -> zero dark days on remaining active days, quota preserved."""
    start_date = date(2026, 9, 8)
    user, _ = await _create_test_client(db_session, "Blackout Sequenced Client")
    plan = await _get_or_create_plan(db_session, "acc_blackouts", 15, 8, 20)

    blackouts = [date(2026, 9, 10), date(2026, 9, 16), date(2026, 9, 22)]
    for b in blackouts:
        await admin_add_blackout(db_session, blackout_on=b, reason="Holiday", client_id=user.id)

    cycle, _, slots = await generate_client_cycle(
        db_session, client_id=user.id, cycle_number=1, start_date=start_date, plan_id=plan.id
    )

    # Verify zero slots on blackouts
    for s in slots:
        assert s.publish_date not in blackouts, f"Slot placed on blackout {s.publish_date}"

    # Verify zero dark days among remaining active days
    cycle_days = [start_date + timedelta(days=i) for i in range(30)]
    act = active_days(cycle_days, 15 + 8 + 20)
    rem_active = [d for d in act if d not in blackouts]
    slot_dates = {s.publish_date for s in slots}
    dark_remaining = [d for d in rem_active if d not in slot_dates]
    assert len(dark_remaining) == 0, f"Dark days found among remaining active days: {dark_remaining}"

    # Quota full
    assert len(slots) == 15 + 8 + 20


@pytest.mark.asyncio
async def test_fixtures_reproduction(db_session: AsyncSession) -> None:
    """Reproduce §6 verification fixtures exactly."""
    start_date = date(2026, 9, 8)

    # 1. Starter Growth
    user_starter, _ = await _create_test_client(db_session, "Fixture Starter")
    plan_starter = await _get_or_create_plan(db_session, "fixture_starter", 8, 4, 10)
    _, _, slots_starter = await generate_client_cycle(
        db_session, client_id=user_starter.id, cycle_number=1, start_date=start_date, plan_id=plan_starter.id
    )

    # Verify Starter reels: Sep 15 Tue, Sep 22 Tue, Sep 30 Wed, Oct 07 Wed
    st_reels = sorted([s.publish_date for s in slots_starter if s.slot_kind == "reel"])
    assert st_reels == [date(2026, 9, 15), date(2026, 9, 22), date(2026, 9, 30), date(2026, 10, 7)]

    # Verify Starter week 1: Sep 08 Tue poster, Sep 09 Wed story, Sep 10 Thu story, Sep 11 Fri poster, Sep 14 Mon story
    wk1_slots = {s.publish_date: s.slot_kind for s in slots_starter if s.publish_date <= date(2026, 9, 14)}
    assert wk1_slots[date(2026, 9, 8)] == "poster"
    assert wk1_slots[date(2026, 9, 9)] == "story"
    assert wk1_slots[date(2026, 9, 10)] == "story"
    assert wk1_slots[date(2026, 9, 11)] == "poster"
    assert wk1_slots[date(2026, 9, 14)] == "story"

    # 2. Brand Accelerator
    user_acc, _ = await _create_test_client(db_session, "Fixture Accelerator")
    plan_acc = await _get_or_create_plan(db_session, "fixture_acc", 15, 8, 20)
    _, _, slots_acc = await generate_client_cycle(
        db_session, client_id=user_acc.id, cycle_number=1, start_date=start_date, plan_id=plan_acc.id
    )

    # Verify Accelerator reels: Sep 15 Tue, Sep 18 Fri, Sep 21 Mon, Sep 24 Thu, Sep 28 Mon, Oct 01 Thu, Oct 04 Sun, Oct 07 Wed
    acc_reels = sorted([s.publish_date for s in slots_acc if s.slot_kind == "reel"])
    assert acc_reels == [
        date(2026, 9, 15),
        date(2026, 9, 18),
        date(2026, 9, 21),
        date(2026, 9, 24),
        date(2026, 9, 28),
        date(2026, 10, 1),
        date(2026, 10, 4),
        date(2026, 10, 7),
    ]

    # Verify Accelerator week 1 items
    acc_w1 = Counter((s.publish_date, s.slot_kind) for s in slots_acc if s.publish_date <= date(2026, 9, 14))
    assert acc_w1[(date(2026, 9, 8), "poster")] == 1 and acc_w1[(date(2026, 9, 8), "story")] == 1
    assert acc_w1[(date(2026, 9, 9), "story")] == 1
    assert acc_w1[(date(2026, 9, 10), "poster")] == 1
    assert acc_w1[(date(2026, 9, 11), "story")] == 1
    assert acc_w1[(date(2026, 9, 12), "poster")] == 1
    assert acc_w1[(date(2026, 9, 13), "story")] == 1
    assert acc_w1[(date(2026, 9, 14), "poster")] == 1 and acc_w1[(date(2026, 9, 14), "story")] == 1
