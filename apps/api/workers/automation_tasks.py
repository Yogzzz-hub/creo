import asyncio
import html as html_mod
import logging
from datetime import date, datetime, timedelta, timezone

from celery import shared_task
from sqlalchemy import and_, func, select, update

from core.database import async_session
from models.addon import Addon
from models.content_calendar import ContentCalendar
from models.content_plan import ContentPlan
from models.enums import (
    AddonStatus,
    CalendarEntryStatus,
    ContentPlanStatus,
    DeliverableType,
    LeaveStatus,
    TaskStatus,
)
from models.escalation import Escalation
from models.leave import LeaveRequest
from models.plan import Plan
from models.subscription import Subscription
from models.task import Task
from models.team import TeamMember
from models.user import User

logger = logging.getLogger(__name__)

ADMIN_EMAILS = ["admin@creo.app", "ops@creo.app"]

QUOTA_THRESHOLD = 0.80

DELIVERABLE_MONTHLY_SCHEDULE = {
    DeliverableType.poster: 8,
    DeliverableType.reel: 4,
    DeliverableType.story: 10,
    DeliverableType.shoot_day: 6,
}


def _mask_email(email: str) -> str:
    if not email or "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    return f"{local[:3]}***@{domain}"


def _mask_phone(phone: str) -> str:
    if not phone or len(phone) < 4:
        return "***"
    return f"***{phone[-4:]}"


def _run_async(coro):
    """Run an async coroutine in a new event loop for Celery sync tasks."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Task 9.12 — check_sla_breaches
# ---------------------------------------------------------------------------
async def _check_sla_breaches_async():
    from services.email import send_email

    today = date.today()
    breaches_found = 0

    async with async_session() as db:
        result = await db.execute(
            select(Task).where(
                Task.status.in_([TaskStatus.pending, TaskStatus.in_progress]),
                Task.due_date.isnot(None),
                Task.due_date < today,
            )
        )
        overdue_tasks = result.scalars().all()

        for task in overdue_tasks:
            existing = await db.execute(
                select(Escalation).where(
                    Escalation.task_id == task.id,
                    Escalation.status != "resolved",
                )
            )
            if existing.scalar_one_or_none() is not None:
                continue

            overdue_bdays = _count_business_days(task.due_date, today)
            severity = min(3, max(1, overdue_bdays // 2))

            escalation = Escalation(
                task_id=task.id,
                client_id=task.client_id,
                severity=severity,
                description=(
                    f"Auto-escalated: Task is {overdue_bdays} business day(s) overdue "
                    f"(due {task.due_date.isoformat()})."
                ),
                status="open",
            )
            db.add(escalation)
            breaches_found += 1

            task.status = TaskStatus.overdue

        revision_result = await db.execute(
            select(Task).where(
                Task.status == TaskStatus.revision,
                Task.updated_at.isnot(None),
            )
        )
        revision_tasks = revision_result.scalars().all()

        for task in revision_tasks:
            existing = await db.execute(
                select(Escalation).where(
                    Escalation.task_id == task.id,
                    Escalation.status != "resolved",
                )
            )
            if existing.scalar_one_or_none() is not None:
                continue

            revision_start = task.updated_at.date() if task.updated_at.tzinfo else task.updated_at.replace(tzinfo=timezone.utc).date()
            bdays_since_revision = _count_business_days(revision_start, today)

            if bdays_since_revision > 1:
                escalation = Escalation(
                    task_id=task.id,
                    client_id=task.client_id,
                    severity="high",
                    description=(
                        f"Auto-escalated: Revision pending for {bdays_since_revision} "
                        f"business day(s) (since {revision_start.isoformat()}). "
                        f"Exceeds 24-business-hour SLA."
                    ),
                    status="open",
                )
                db.add(escalation)
                breaches_found += 1

        await db.commit()

    if breaches_found > 0:
        for admin_email in ADMIN_EMAILS:
            try:
                await send_email(
                    to_email=admin_email,
                    subject=f"[Creo] SLA Breach Alert — {breaches_found} overdue task(s)",
                    html_content=(
                        f"<h2>SLA Breach Alert</h2>"
                        f"<p>{breaches_found} task(s) have passed their due date "
                        f"and have been automatically escalated.</p>"
                        f"<p>Please review open escalations in the admin panel.</p>"
                    ),
                )
            except Exception as exc:
                logger.error("Failed to send SLA breach email to %s: %s", _mask_email(admin_email), exc)

    logger.info("check_sla_breaches completed — %d breach(es) found", breaches_found)
    return breaches_found


@shared_task(name="check_sla_breaches")
def check_sla_breaches():
    return _run_async(_check_sla_breaches_async())


# ---------------------------------------------------------------------------
# Task 9.13 — send_renewal_reminders
# ---------------------------------------------------------------------------
async def _send_renewal_reminders_async():
    from services.email import send_email

    now = datetime.now(timezone.utc)
    target_date = now + timedelta(days=3)
    target_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    target_end = target_start + timedelta(days=1)

    reminders_sent = 0

    async with async_session() as db:
        result = await db.execute(
            select(Subscription, User, Plan)
            .join(User, User.id == Subscription.user_id)
            .join(Plan, Plan.id == Subscription.plan_id)
            .where(
                Subscription.status == "active",
                Subscription.current_period_end >= target_start,
                Subscription.current_period_end < target_end,
            )
        )
        expiring = result.all()

        for subscription, user, plan in expiring:
            try:
                portal_url = "https://creo.app/portal/payments"
                html_content = (
                    f"<h2>Renewal Reminder</h2>"
                    f"<p>Hi {html_mod.escape(user.full_name)},</p>"
                    f"<p>Your <strong>{plan.display_name}</strong> subscription "
                    f"will renew on <strong>"
                    f"{subscription.current_period_end.strftime('%B %d, %Y')}</strong>.</p>"
                    f"<p>No action is needed if you'd like to continue. "
                    f"If you want to change your plan, visit your portal:</p>"
                    f'<p><a href="{portal_url}" style="color:#2B7BC4;">'
                    f"Manage Subscription</a></p>"
                    f"<p>— The Creo Team</p>"
                )
                await send_email(
                    to_email=user.email,
                    subject="Your Creo subscription renews in 3 days",
                    html_content=html_content,
                )
                reminders_sent += 1
            except Exception as exc:
                logger.error(
                    "Failed to send renewal reminder to user %s: %s", user.id, exc
                )

    logger.info(
        "send_renewal_reminders completed — %d reminder(s) sent", reminders_sent
    )
    return reminders_sent


@shared_task(name="send_renewal_reminders")
def send_renewal_reminders():
    return _run_async(_send_renewal_reminders_async())


# ---------------------------------------------------------------------------
# Task 9.14 — check_quota_exhaustion
# ---------------------------------------------------------------------------
async def _check_quota_exhaustion_async():
    from services.email import send_email
    from services.whatsapp import send_whatsapp_message

    now = datetime.now(timezone.utc)
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if period_start.month == 12:
        period_end = period_start.replace(year=period_start.year + 1, month=1)
    else:
        period_end = period_start.replace(month=period_start.month + 1)

    notifications_sent = 0

    async with async_session() as db:
        active_subs = await db.execute(
            select(Subscription, User, Plan)
            .join(User, User.id == Subscription.user_id)
            .join(Plan, Plan.id == Subscription.plan_id)
            .where(
                Subscription.status == "active",
            )
        )
        subscriptions = active_subs.all()

        for subscription, user, plan in subscriptions:
            poster_count_result = await db.execute(
                select(func.count(Addon.id)).where(
                    Addon.client_id == user.id,
                    Addon.deliverable_type == DeliverableType.poster,
                    Addon.status == AddonStatus.completed,
                    Addon.created_at >= period_start,
                    Addon.created_at < period_end,
                )
            )
            poster_count = poster_count_result.scalar() or 0

            reel_count_result = await db.execute(
                select(func.count(Addon.id)).where(
                    Addon.client_id == user.id,
                    Addon.deliverable_type == DeliverableType.reel,
                    Addon.status == AddonStatus.completed,
                    Addon.created_at >= period_start,
                    Addon.created_at < period_end,
                )
            )
            reel_count = reel_count_result.scalar() or 0

            story_count_result = await db.execute(
                select(func.count(Addon.id)).where(
                    Addon.client_id == user.id,
                    Addon.deliverable_type == DeliverableType.story,
                    Addon.status == AddonStatus.completed,
                    Addon.created_at >= period_start,
                    Addon.created_at < period_end,
                )
            )
            story_count = story_count_result.scalar() or 0

            quota_warnings = []

            if plan.poster_quota > 0:
                poster_pct = poster_count / plan.poster_quota
                if poster_pct >= QUOTA_THRESHOLD:
                    quota_warnings.append(
                        f"Posters: {poster_count}/{plan.poster_quota} "
                        f"({poster_pct:.0%} used)"
                    )

            if plan.reel_quota > 0:
                reel_pct = reel_count / plan.reel_quota
                if reel_pct >= QUOTA_THRESHOLD:
                    quota_warnings.append(
                        f"Reels: {reel_count}/{plan.reel_quota} "
                        f"({reel_pct:.0%} used)"
                    )

            if plan.story_quota > 0:
                story_pct = story_count / plan.story_quota
                if story_pct >= QUOTA_THRESHOLD:
                    quota_warnings.append(
                        f"Stories: {story_count}/{plan.story_quota} "
                        f"({story_pct:.0%} used)"
                    )

            if not quota_warnings:
                continue

            warning_list = "".join(f"<li>{w}</li>" for w in quota_warnings)
            addons_url = "https://creo.app/portal/addons"

            html_content = (
                f"<h2>Quota Usage Alert</h2>"
                f"<p>Hi {html_mod.escape(user.full_name)},</p>"
                f"<p>You're approaching your monthly content quota:</p>"
                f"<ul>{warning_list}</ul>"
                f"<p>Consider purchasing Add-ons to keep your content pipeline running:</p>"
                f'<p><a href="{addons_url}" style="color:#2B7BC4;">'
                f"Purchase Add-ons</a></p>"
                f"<p>— The Creo Team</p>"
            )

            try:
                await send_email(
                    to_email=user.email,
                    subject="You're running low on content quota",
                    html_content=html_content,
                )
                notifications_sent += 1
            except Exception as exc:
                logger.error(
                    "Failed to send quota email to user %s: %s", user.id, exc
                )

            if user.phone:
                try:
                    await send_whatsapp_message(
                        phone_number=user.phone,
                        template_id="creo_quota_alert",
                        parameters={
                            "name": user.full_name,
                            "warning": quota_warnings[0],
                        },
                    )
                except Exception as exc:
                    logger.warning(
                        "Failed to send quota WhatsApp to user %s: %s", user.id, exc
                    )

    logger.info(
        "check_quota_exhaustion completed — %d notification(s) sent",
        notifications_sent,
    )
    return notifications_sent


@shared_task(name="check_quota_exhaustion")
def check_quota_exhaustion():
    return _run_async(_check_quota_exhaustion_async())


# ---------------------------------------------------------------------------
# Task 9.15 — auto_assign_tasks
# ---------------------------------------------------------------------------
async def _auto_assign_tasks_async():
    now = datetime.now(timezone.utc)
    today = now.date()

    tasks_assigned = 0

    async with async_session() as db:
        unassigned_result = await db.execute(
            select(Task).where(
                Task.assigned_to.is_(None),
                Task.status.in_([TaskStatus.pending, TaskStatus.assignment_requested]),
            ).order_by(
                Task.is_expedited.desc(),
                Task.priority.asc(),
                Task.created_at.asc(),
            )
        )
        unassigned_tasks = unassigned_result.scalars().all()

        if not unassigned_tasks:
            logger.info("auto_assign_tasks — no unassigned tasks found")
            return 0

        members_result = await db.execute(
            select(TeamMember).where(TeamMember.is_active.is_(True))
        )
        team_members = members_result.scalars().all()

        if not team_members:
            logger.info("auto_assign_tasks — no active team members found")
            return 0

        on_leave_ids: set[str] = set()
        if team_members:
            leave_result = await db.execute(
                select(LeaveRequest.team_member_id).where(
                    LeaveRequest.status == LeaveStatus.approved,
                    LeaveRequest.start_date <= today,
                    LeaveRequest.end_date >= today,
                )
            )
            on_leave_ids = {row[0] for row in leave_result.all()}

        available_members = [m for m in team_members if m.id not in on_leave_ids]

        if not available_members:
            logger.info(
                "auto_assign_tasks — all active team members are on leave"
            )
            return 0

        member_caps: dict[str, dict[str, int]] = {}
        for member in available_members:
            posters_result = await db.execute(
                select(func.count(Task.id)).where(
                    Task.assigned_to == member.id,
                    Task.deliverable_type == DeliverableType.poster,
                    Task.created_at >= today.isoformat(),
                )
            )
            posters_used = posters_result.scalar() or 0

            reels_result = await db.execute(
                select(func.count(Task.id)).where(
                    Task.assigned_to == member.id,
                    Task.deliverable_type == DeliverableType.reel,
                    Task.created_at >= today.isoformat(),
                )
            )
            reels_used = reels_result.scalar() or 0

            stories_result = await db.execute(
                select(func.count(Task.id)).where(
                    Task.assigned_to == member.id,
                    Task.deliverable_type == DeliverableType.story,
                    Task.created_at >= today.isoformat(),
                )
            )
            stories_used = stories_result.scalar() or 0

            member_caps[member.id] = {
                "posters_remaining": max(0, member.daily_cap_posters - posters_used),
                "reels_remaining": max(0, member.daily_cap_reels - reels_used),
                "stories_remaining": max(0, member.daily_cap_stories - stories_used),
            }

        skill_map = {
            DeliverableType.poster: "poster",
            DeliverableType.reel: "reel",
            DeliverableType.story: "story",
        }

        for task in unassigned_tasks:
            best_member = None
            best_remaining = -1
            required_skill = skill_map.get(task.deliverable_type)

            for member in available_members:
                member_skills = member.skills or []
                if required_skill and member_skills and required_skill not in member_skills:
                    continue

                caps = member_caps[member.id]

                if task.deliverable_type == DeliverableType.poster:
                    remaining = caps["posters_remaining"]
                elif task.deliverable_type == DeliverableType.reel:
                    remaining = caps["reels_remaining"]
                else:
                    remaining = caps["stories_remaining"]

                if remaining > best_remaining:
                    best_remaining = remaining
                    best_member = member

            if best_member is not None and best_remaining > 0:
                task.assigned_to = best_member.id
                task.assigned_by = None
                task.status = TaskStatus.pending
                task.assignment_date = today

                caps = member_caps[best_member.id]
                if task.deliverable_type == DeliverableType.poster:
                    caps["posters_remaining"] -= 1
                elif task.deliverable_type == DeliverableType.reel:
                    caps["reels_remaining"] -= 1
                else:
                    caps["stories_remaining"] -= 1

                tasks_assigned += 1

        await db.commit()

    logger.info("auto_assign_tasks completed — %d task(s) assigned", tasks_assigned)
    return tasks_assigned


@shared_task(name="auto_assign_tasks")
def auto_assign_tasks():
    return _run_async(_auto_assign_tasks_async())


# ---------------------------------------------------------------------------
# Task 9.16 — generate_content_calendar
# ---------------------------------------------------------------------------
ONBOARDING_BUFFER_DAYS = 7


def _next_month_range(now: datetime):
    """Return (start, end) dates for the month following *now*."""
    from datetime import date as date_type

    y, m = now.year, now.month
    if m == 12:
        start = date_type(y + 1, 1, 1)
        end = date_type(y + 1, 2, 1) - timedelta(days=1)
    else:
        start = date_type(y, m + 1, 1)
        if m + 1 == 12:
            end = date_type(y + 1, 1, 1) - timedelta(days=1)
        else:
            end = date_type(y, m + 2, 1) - timedelta(days=1)
    return start, end


def _distribute_items(count: int, pool: list):
    """Evenly place *count* items into *pool* positions, returning chosen indices."""
    if count <= 0 or not pool:
        return []
    step = len(pool) / count
    return [pool[int(i * step)] for i in range(count) if int(i * step) < len(pool)]


async def _generate_content_calendar_async():
    now = datetime.now(timezone.utc)
    next_month_start, next_month_end = _next_month_range(now)

    # Build the full list of dates for the target month
    all_dates = []
    d = next_month_start
    while d <= next_month_end:
        all_dates.append(d)
        d += timedelta(days=1)

    # The first 7 days are reserved for onboarding — no deliverables
    available_dates = all_dates[ONBOARDING_BUFFER_DAYS:]

    entries_created = 0

    async with async_session() as db:
        active_subs_result = await db.execute(
            select(Subscription, User, Plan)
            .join(User, User.id == Subscription.user_id)
            .join(Plan, Plan.id == Subscription.plan_id)
            .where(Subscription.status == "active")
        )
        active_subs = active_subs_result.all()

    for subscription, user, plan in active_subs:
        async with async_session() as db:
            # Skip if entries already exist for this month
            existing_result = await db.execute(
                select(func.count(ContentCalendar.id)).where(
                    ContentCalendar.client_id == user.id,
                    ContentCalendar.scheduled_date >= next_month_start,
                    ContentCalendar.scheduled_date <= next_month_end,
                )
            )
            if (existing_result.scalar() or 0) > 0:
                continue

            reel_quota = plan.reel_quota
            poster_quota = plan.poster_quota
            story_quota = plan.story_quota
            total_needed = reel_quota + poster_quota + story_quota

            if total_needed == 0:
                continue

            # We need at least total_needed available days after the buffer.
            # If the plan quota exceeds available days, cap each type proportionally.
            if total_needed > len(available_dates):
                ratio = len(available_dates) / total_needed
                reel_quota = max(0, int(reel_quota * ratio))
                poster_quota = max(0, int(poster_quota * ratio))
                story_quota = max(0, int(story_quota * ratio))
                total_needed = reel_quota + poster_quota + story_quota

            # Create or find the content plan for this month
            target_month = next_month_start.month
            target_year = next_month_start.year

            cp_result = await db.execute(
                select(ContentPlan).where(
                    ContentPlan.client_id == user.id,
                    ContentPlan.month == target_month,
                    ContentPlan.year == target_year,
                )
            )
            content_plan = cp_result.scalar_one_or_none()
            if content_plan is None:
                content_plan = ContentPlan(
                    client_id=user.id,
                    month=target_month,
                    year=target_year,
                    status=ContentPlanStatus.draft,
                )
                db.add(content_plan)
                await db.flush()

            used_dates = set()
            client_entries = 0
            biz_name = html_mod.escape(user.business_name or user.full_name or "Client")

            # --- Step 1: Schedule Reels evenly across available dates ---
            reel_indices = _distribute_items(reel_quota, list(range(len(available_dates))))
            for idx in reel_indices:
                scheduled_date = available_dates[idx]
                entry = ContentCalendar(
                    client_id=user.id,
                    content_plan_id=content_plan.id,
                    scheduled_date=scheduled_date,
                    deliverable_type=DeliverableType.reel,
                    content_topic=f"Auto-generated reel for {biz_name}",
                    status=CalendarEntryStatus.draft,
                )
                db.add(entry)
                used_dates.add(scheduled_date)
                client_entries += 1

            # --- Step 2: Distribute Posters and Stories on remaining dates ---
            remaining = [d for i, d in enumerate(available_dates) if i not in reel_indices]
            remaining = [d for d in remaining if d not in used_dates]

            # Build interleaved list: [P, S, P, S, ...] until quotas are met
            ps_queue = []
            for _ in range(poster_quota):
                ps_queue.append(DeliverableType.poster)
            for _ in range(story_quota):
                ps_queue.append(DeliverableType.story)

            if ps_queue and remaining:
                ps_indices = _distribute_items(len(ps_queue), list(range(len(remaining))))
                for i, del_type in enumerate(ps_queue):
                    if i >= len(ps_indices):
                        break
                    idx = ps_indices[i]
                    if idx >= len(remaining):
                        break
                    scheduled_date = remaining[idx]
                    if scheduled_date in used_dates:
                        continue

                    entry = ContentCalendar(
                        client_id=user.id,
                        content_plan_id=content_plan.id,
                        scheduled_date=scheduled_date,
                        deliverable_type=del_type,
                        content_topic=f"Auto-generated {del_type.value} for {biz_name}",
                        status=CalendarEntryStatus.draft,
                    )
                    db.add(entry)
                    used_dates.add(scheduled_date)
                    client_entries += 1

            if client_entries > 0:
                await db.commit()
                entries_created += client_entries

    logger.info(
        "generate_content_calendar completed — %d draft entry(ies) created",
        entries_created,
    )
    return entries_created


@shared_task(name="generate_content_calendar")
def generate_content_calendar():
    return _run_async(_generate_content_calendar_async())


# ---------------------------------------------------------------------------
# Single-user generation (for test endpoint)
# ---------------------------------------------------------------------------
async def _generate_calendar_for_user_async(user_id: str) -> int:
    """Generate calendar entries for a single user (admin/test trigger)."""
    now = datetime.now(timezone.utc)
    next_month_start, next_month_end = _next_month_range(now)

    all_dates = []
    d = next_month_start
    while d <= next_month_end:
        all_dates.append(d)
        d += timedelta(days=1)

    available_dates = all_dates[ONBOARDING_BUFFER_DAYS:]

    async with async_session() as db:
        result = await db.execute(
            select(Subscription, User, Plan)
            .join(User, User.id == Subscription.user_id)
            .join(Plan, Plan.id == Subscription.plan_id)
            .where(Subscription.user_id == user_id, Subscription.status == "active")
        )
        row = result.first()
        if row is None:
            logger.warning("No active subscription found for user %s", user_id)
            return 0

        subscription, user, plan = row

        # Skip if entries already exist
        existing_result = await db.execute(
            select(func.count(ContentCalendar.id)).where(
                ContentCalendar.client_id == user.id,
                ContentCalendar.scheduled_date >= next_month_start,
                ContentCalendar.scheduled_date <= next_month_end,
            )
        )
        if (existing_result.scalar() or 0) > 0:
            return 0

        reel_quota = plan.reel_quota
        poster_quota = plan.poster_quota
        story_quota = plan.story_quota
        total_needed = reel_quota + poster_quota + story_quota

        if total_needed == 0:
            return 0

        if total_needed > len(available_dates):
            ratio = len(available_dates) / total_needed
            reel_quota = max(0, int(reel_quota * ratio))
            poster_quota = max(0, int(poster_quota * ratio))
            story_quota = max(0, int(story_quota * ratio))

        target_month = next_month_start.month
        target_year = next_month_start.year

        cp_result = await db.execute(
            select(ContentPlan).where(
                ContentPlan.client_id == user.id,
                ContentPlan.month == target_month,
                ContentPlan.year == target_year,
            )
        )
        content_plan = cp_result.scalar_one_or_none()
        if content_plan is None:
            content_plan = ContentPlan(
                client_id=user.id,
                month=target_month,
                year=target_year,
                status=ContentPlanStatus.draft,
            )
            db.add(content_plan)
            await db.flush()

        used_dates = set()
        client_entries = 0
        biz_name = html_mod.escape(user.business_name or user.full_name or "Client")

        reel_indices = _distribute_items(reel_quota, list(range(len(available_dates))))
        for idx in reel_indices:
            scheduled_date = available_dates[idx]
            entry = ContentCalendar(
                client_id=user.id,
                content_plan_id=content_plan.id,
                scheduled_date=scheduled_date,
                deliverable_type=DeliverableType.reel,
                content_topic=f"Auto-generated reel for {biz_name}",
                status=CalendarEntryStatus.draft,
            )
            db.add(entry)
            used_dates.add(scheduled_date)
            client_entries += 1

        remaining = [d for i, d in enumerate(available_dates) if i not in reel_indices]
        remaining = [d for d in remaining if d not in used_dates]

        ps_queue = []
        for _ in range(poster_quota):
            ps_queue.append(DeliverableType.poster)
        for _ in range(story_quota):
            ps_queue.append(DeliverableType.story)

        if ps_queue and remaining:
            ps_indices = _distribute_items(len(ps_queue), list(range(len(remaining))))
            for i, del_type in enumerate(ps_queue):
                if i >= len(ps_indices):
                    break
                idx = ps_indices[i]
                if idx >= len(remaining):
                    break
                scheduled_date = remaining[idx]
                if scheduled_date in used_dates:
                    continue

                entry = ContentCalendar(
                    client_id=user.id,
                    content_plan_id=content_plan.id,
                    scheduled_date=scheduled_date,
                    deliverable_type=del_type,
                    content_topic=f"Auto-generated {del_type.value} for {biz_name}",
                    status=CalendarEntryStatus.draft,
                )
                db.add(entry)
                used_dates.add(scheduled_date)
                client_entries += 1

        await db.commit()

    logger.info(
        "generate_calendar_for_user(%s) — %d entries created",
        user_id,
        client_entries,
    )
    return client_entries


@shared_task(name="generate_calendar_for_user")
def generate_calendar_for_user(user_id: str) -> int:
    return _run_async(_generate_calendar_for_user_async(user_id))


async def _cleanup_failed_payments_async() -> int:
    """Move users stuck in pending_payment for >48 hours to lapsed."""
    from models.enums import AccountStatus

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=48)

    async with async_session() as db:
        result = await db.execute(
            select(User).where(
                User.account_status == AccountStatus.pending_payment,
                User.created_at < cutoff,
                User.deleted_at.is_(None),
            )
        )
        stuck_users = result.scalars().all()

        if not stuck_users:
            return 0

        for user in stuck_users:
            user.account_status = AccountStatus.lapsed

        await db.commit()
        return len(stuck_users)


@shared_task(name="cleanup_failed_payments")
def cleanup_failed_payments():
    count = _run_async(_cleanup_failed_payments_async())
    if count:
        logger.info("[cleanup_failed_payments] Marked %d stuck users as lapsed", count)


async def _proactive_token_refresh_async() -> int:
    """Refresh Instagram tokens expiring within 7 days for active users."""
    from core.security import decrypt_token, encrypt_token
    from services.instagram import refresh_access_token

    now = datetime.now(timezone.utc)
    expires_soon = now + timedelta(days=7)

    async with async_session() as db:
        result = await db.execute(
            select(User).where(
                User.instagram_access_token.isnot(None),
                User.instagram_user_id.isnot(None),
                User.account_status == AccountStatus.active,
                User.deleted_at.is_(None),
                User.instagram_token_expires_at.isnot(None),
                User.instagram_token_expires_at < expires_soon,
            )
        )
        users_with_tokens = result.scalars().all()

        if not users_with_tokens:
            return 0

        refreshed = 0
        for user in users_with_tokens:
            try:
                decrypted = decrypt_token(user.instagram_access_token)
                refreshed_data = _run_async(refresh_access_token(decrypted))
                user.instagram_access_token = encrypt_token(refreshed_data["access_token"])
                user.instagram_token_expires_at = now + timedelta(
                    seconds=refreshed_data.get("expires_in", 5184000)
                )
                refreshed += 1
            except Exception:
                logger.warning(
                    "[proactive_token_refresh] Failed to refresh token for user %s",
                    user.id,
                )

        await db.commit()
        return refreshed


@shared_task(name="proactive_token_refresh")
def proactive_token_refresh():
    count = _run_async(_proactive_token_refresh_async())
    logger.info("[proactive_token_refresh] Refreshed %d Instagram tokens", count)
