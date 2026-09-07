"""Idempotent seed script for Creo platform.

Seeds:
- 3 subscription plans (starter, growth, pro) with pricing and quotas
- 5 staff members (1 super_admin, 1 team_lead, 2 editors, 1 designer) with staff_profiles
- 4 clients representing onboarding stages 1, 2, 3, and 5
- ~40 deliverables across all deliverable statuses for stage-5 client
- ~25 tasks across all task statuses
- 3 support tickets with complete conversation threads
- usage_counters for the current billing period
"""

import asyncio
import sys
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

# Ensure backend root is in sys.path
sys.path.insert(0, ".")

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.billing import Plan, Subscription, UsageCounter
from app.models.enums import (
    AccountStatus,
    DeliverableStatus,
    DeliverableType,
    PaymentProvider,
    SubscriptionStatus,
    TaskStatus,
    TicketPriority,
    TicketStatus,
    UserRole,
)
from app.models.questionnaire import Questionnaire
from app.models.support import Ticket, TicketMessage
from app.models.user import ClientProfile, StaffProfile, User
from app.models.work import Deliverable, Task


async def seed() -> None:
    print("Starting idempotent database seeding...")
    engine = create_async_engine(
        settings.DIRECT_DATABASE_URL, connect_args={"statement_cache_size": 0}
    )
    async_session = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    now = datetime.now(UTC)
    today = now.date()
    month_start = date(today.year, today.month, 1)
    # Next month start
    if today.month == 12:
        month_end = date(today.year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(today.year, today.month + 1, 1) - timedelta(days=1)

    async with async_session() as db:
        # =====================================================================
        # 1. PLANS
        # =====================================================================
        print("Seeding plans...")
        plans_data = [
            {
                "name": "starter",
                "display_name": "Starter Growth",
                "price_minor": 2500000,
                "currency": "INR",
                "monthly_price": Decimal("25000.00"),
                "poster_quota": 8,
                "reel_quota": 4,
                "story_quota": 10,
                "revision_rounds": 1,
                "has_dedicated_manager": False,
                "highlights": [
                    "8 Static Posts / Mo",
                    "4 High-Impact Reels",
                    "10 Story Assets",
                    "1 Round of Revisions",
                ],
                "is_recommended": False,
                "is_active": True,
            },
            {
                "name": "growth",
                "display_name": "Brand Accelerator",
                "price_minor": 5000000,
                "currency": "INR",
                "monthly_price": Decimal("50000.00"),
                "poster_quota": 15,
                "reel_quota": 8,
                "story_quota": 20,
                "revision_rounds": 2,
                "has_dedicated_manager": True,
                "highlights": [
                    "15 Static Posts / Mo",
                    "8 High-Impact Reels",
                    "20 Story Assets",
                    "2 Rounds of Revisions",
                    "Dedicated Account Manager",
                ],
                "is_recommended": True,
                "is_active": True,
            },
            {
                "name": "pro",
                "display_name": "Enterprise Domination",
                "price_minor": 9500000,
                "currency": "INR",
                "monthly_price": Decimal("95000.00"),
                "poster_quota": 30,
                "reel_quota": 16,
                "story_quota": 40,
                "revision_rounds": 3,
                "has_dedicated_manager": True,
                "highlights": [
                    "30 Static Posts / Mo",
                    "16 High-Impact Reels",
                    "40 Story Assets",
                    "3 Rounds of Revisions",
                    "Dedicated Creative Pod",
                    "1 Shoot Day Included",
                ],
                "is_recommended": False,
                "is_active": True,
            },
        ]

        plans_by_name = {}
        for p_data in plans_data:
            stmt = select(Plan).where(Plan.name == p_data["name"])
            res = await db.execute(stmt)
            plan = res.scalars().first()
            if not plan:
                plan = Plan(**p_data)
                db.add(plan)
                await db.flush()
            plans_by_name[p_data["name"]] = plan

        # =====================================================================
        # 2. STAFF & SUPER ADMIN
        # =====================================================================
        print("Seeding staff and admin users...")
        staff_defs = [
            {
                "email": "admin@creo.agency",
                "auth_id": "auth_admin_001",
                "full_name": "Antigravity Super Admin",
                "role": UserRole.SUPER_ADMIN,
                "dept": "executive",
                "skills": ["governance", "finance", "admin"],
                "capacity": 10,
            },
            {
                "email": "lead@creo.agency",
                "auth_id": "auth_lead_001",
                "full_name": "Sarah Connor (Team Lead)",
                "role": UserRole.TEAM_LEAD,
                "dept": "creative",
                "skills": ["qa", "video", "motion", "storyboarding"],
                "capacity": 8,
            },
            {
                "email": "editor1@creo.agency",
                "auth_id": "auth_editor_001",
                "full_name": "Liam Vance (Senior Video Editor)",
                "role": UserRole.EDITOR,
                "dept": "video",
                "skills": ["reels", "premiere", "after_effects", "sound_design"],
                "capacity": 4,
            },
            {
                "email": "editor2@creo.agency",
                "auth_id": "auth_editor_002",
                "full_name": "Maya Lin (Motion Designer)",
                "role": UserRole.EDITOR,
                "dept": "video",
                "skills": ["reels", "3d", "motion_graphics", "color_grading"],
                "capacity": 4,
            },
            {
                "email": "designer1@creo.agency",
                "auth_id": "auth_designer_001",
                "full_name": "Ethan Hunt (Lead Graphic Designer)",
                "role": UserRole.DESIGNER,
                "dept": "design",
                "skills": ["carousels", "posters", "typography", "figma"],
                "capacity": 5,
            },
        ]

        staff_by_email = {}
        for s_def in staff_defs:
            stmt = select(User).where(User.email == s_def["email"])
            res = await db.execute(stmt)
            user = res.scalars().first()
            if not user:
                user = User(
                    email=s_def["email"],
                    auth_id=s_def["auth_id"],
                    full_name=s_def["full_name"],
                    role=s_def["role"],
                    account_status=AccountStatus.ACTIVE,
                    email_verified_at=now,
                )
                db.add(user)
                await db.flush()

                # Add staff profile
                profile = StaffProfile(
                    user_id=user.id,
                    department=s_def["dept"],
                    skills=s_def["skills"],
                    daily_capacity=s_def["capacity"],
                    is_accepting_work=True,
                )
                db.add(profile)
                await db.flush()
            staff_by_email[s_def["email"]] = user

        # =====================================================================
        # 3. CLIENTS (Stages 1, 2, 3, 5)
        # =====================================================================
        print("Seeding clients across derived onboarding stages...")
        clients_def = [
            {
                "stage": 1,
                "email": "client1@stage1.com",
                "auth_id": "auth_client_001",
                "name": "Nova Health (Stage 1)",
                "plan": None,
                "has_terms": False,
                "has_sub": False,
                "has_quest": False,
                "has_completed": False,
            },
            {
                "stage": 2,
                "email": "client2@stage2.com",
                "auth_id": "auth_client_002",
                "name": "Kite Real Estate (Stage 2)",
                "plan": None,
                "has_terms": True,
                "has_sub": False,
                "has_quest": False,
                "has_completed": False,
            },
            {
                "stage": 3,
                "email": "client3@stage3.com",
                "auth_id": "auth_client_003",
                "name": "Blue Aura Skincare (Stage 3)",
                "plan": "growth",
                "has_terms": True,
                "has_sub": True,
                "has_quest": False,
                "has_completed": False,
            },
            {
                "stage": 5,
                "email": "client5@stage5.com",
                "auth_id": "auth_client_005",
                "name": "Apex Velocity Fitness (Stage 5)",
                "plan": "pro",
                "has_terms": True,
                "has_sub": True,
                "has_quest": True,
                "has_completed": True,
            },
        ]

        clients_by_stage = {}
        for c_def in clients_def:
            stmt = select(User).where(User.email == c_def["email"])
            res = await db.execute(stmt)
            user = res.scalars().first()
            if not user:
                user = User(
                    email=c_def["email"],
                    auth_id=c_def["auth_id"],
                    full_name=c_def["name"],
                    role=UserRole.CLIENT,
                    account_status=AccountStatus.ACTIVE,
                    email_verified_at=now,
                )
                db.add(user)
                await db.flush()

                # Client profile
                cp = ClientProfile(
                    user_id=user.id,
                    company_name=c_def["name"],
                    instagram_username=f"@{c_def['name'].lower().replace(' ', '')}",
                    terms_accepted_at=now if c_def["has_terms"] else None,
                    terms_version="v1.0" if c_def["has_terms"] else None,
                    onboarding_completed_at=now if c_def["has_completed"] else None,
                    brand_summary=(
                        "High-energy athletic conditioning and strength training lifestyle brand."
                    ),
                    brand_dna={
                        "tone": "Bold, Motivational, Authoritative",
                        "palette": ["#0E1116", "#F0A202", "#4C6FFF"],
                        "target_audience": "25-40 fitness enthusiasts and hybrid athletes",
                    }
                    if c_def["has_quest"]
                    else {},
                )
                db.add(cp)
                await db.flush()

                if c_def["has_sub"] and c_def["plan"]:
                    plan_obj = plans_by_name[c_def["plan"]]
                    sub = Subscription(
                        client_id=user.id,
                        plan_id=plan_obj.id,
                        status=SubscriptionStatus.ACTIVE,
                        gateway=PaymentProvider.RAZORPAY,
                        gateway_subscription_id=f"sub_test_{user.id.hex[:8]}",
                        amount=plan_obj.monthly_price,
                        current_period_start=now - timedelta(days=5),
                        current_period_end=now + timedelta(days=25),
                    )
                    db.add(sub)

                    # Seed usage counters
                    counters = [
                        UsageCounter(
                            client_id=user.id,
                            period_start=month_start,
                            period_end=month_end,
                            kind=DeliverableType.REEL,
                            quota=plan_obj.reel_quota,
                            used=2,
                        ),
                        UsageCounter(
                            client_id=user.id,
                            period_start=month_start,
                            period_end=month_end,
                            kind=DeliverableType.STATIC_POST,
                            quota=plan_obj.poster_quota,
                            used=4,
                        ),
                        UsageCounter(
                            client_id=user.id,
                            period_start=month_start,
                            period_end=month_end,
                            kind=DeliverableType.STORY,
                            quota=plan_obj.story_quota,
                            used=6,
                        ),
                    ]
                    db.add_all(counters)
                    await db.flush()

                if c_def["has_quest"]:
                    quest = Questionnaire(
                        user_id=user.id,
                        answers={
                            "niche": "Fitness & Hybrid Athletic Performance",
                            "pillars": [
                                "Workout Breakdowns",
                                "Nutrition Tips",
                                "Client Transformations",
                            ],
                            "competitors": ["Gymshark", "Equinox"],
                            "hex_codes": ["#0E1116", "#F0A202", "#23A26D"],
                        },
                        ai_summary_line=(
                            "Premium functional fitness training with an editorial look."
                        ),
                    )
                    db.add(quest)
                    await db.flush()

            clients_by_stage[c_def["stage"]] = user

        stage5_client = clients_by_stage[5]
        assigned_editor = staff_by_email["editor1@creo.agency"]
        assigned_designer = staff_by_email["designer1@creo.agency"]
        team_lead = staff_by_email["lead@creo.agency"]

        # =====================================================================
        # 4. TASKS (~25 tasks across statuses)
        # =====================================================================
        print("Seeding ~25 tasks across all statuses...")
        task_statuses = list(TaskStatus)
        created_tasks = []
        for i in range(25):
            t_status = task_statuses[i % len(task_statuses)]
            t_type = DeliverableType.REEL if i % 2 == 0 else DeliverableType.CAROUSEL
            assignee = assigned_editor if t_type == DeliverableType.REEL else assigned_designer

            # Check if exists
            stmt = (
                select(Task)
                .where(Task.client_id == stage5_client.id)
                .where(Task.status == t_status)
                .limit(1)
            )
            res = await db.execute(stmt)
            t = res.scalars().first()
            if not t or len(created_tasks) < 25:
                t = Task(
                    client_id=stage5_client.id,
                    assigned_to=assignee.id,
                    deliverable_type=t_type,
                    status=t_status,
                    due_date=today + timedelta(days=(i % 14) + 1),
                    sla_due_at=now + timedelta(hours=(i * 12) + 24),
                )
                db.add(t)
                await db.flush()
            created_tasks.append(t)

        # =====================================================================
        # 5. DELIVERABLES (~40 deliverables across all 12 statuses)
        # =====================================================================
        print("Seeding ~40 deliverables across all deliverable statuses...")
        all_deliv_statuses = list(DeliverableStatus)

        stmt = select(Deliverable).where(Deliverable.client_id == stage5_client.id)
        res = await db.execute(stmt)
        existing_delivs = res.scalars().all()

        if len(existing_delivs) < 40:
            for i in range(40):
                d_status = all_deliv_statuses[i % len(all_deliv_statuses)]
                is_video = i % 3 != 0
                file_ext = "mp4" if is_video else "png"
                root_uuid = uuid.uuid4()
                assigned_task = created_tasks[i % len(created_tasks)]

                deliv = Deliverable(
                    root_id=root_uuid,
                    version=1,
                    client_id=stage5_client.id,
                    task_id=assigned_task.id,
                    submitted_by=assigned_editor.id if is_video else assigned_designer.id,
                    file_url=f"https://rndrwcgjmbnhixkurara.supabase.co/storage/v1/object/public/creo-deliverables/seed_{i:03d}.{file_ext}",
                    file_type="video/mp4" if is_video else "image/png",
                    file_size_bytes=38450000 if is_video else 2450000,
                    status=d_status,
                    revision_round=1,
                    rejection_comment="Pacing in second hook needs to be snappier."
                    if d_status
                    in (DeliverableStatus.REVISION_REQUESTED, DeliverableStatus.QA_REJECTED)
                    else None,
                    approved_at=now - timedelta(days=2)
                    if d_status in (DeliverableStatus.APPROVED, DeliverableStatus.PUBLISHED)
                    else None,
                    scheduled_at=now + timedelta(days=3)
                    if d_status == DeliverableStatus.SCHEDULED
                    else (
                        now - timedelta(days=1) if d_status == DeliverableStatus.PUBLISHED else None
                    ),
                    ig_creation_id=f"ig_container_{uuid.uuid4().hex[:12]}"
                    if d_status in (DeliverableStatus.PUBLISHING, DeliverableStatus.PUBLISHED)
                    else None,
                    ig_media_id=f"ig_media_{uuid.uuid4().hex[:12]}"
                    if d_status == DeliverableStatus.PUBLISHED
                    else None,
                    ig_permalink="https://instagram.com/p/DApexSeed123"
                    if d_status == DeliverableStatus.PUBLISHED
                    else None,
                )
                db.add(deliv)

        await db.flush()

        # =====================================================================
        # 6. SUPPORT TICKETS (3 complete threads)
        # =====================================================================
        print("Seeding 3 support tickets with conversation threads...")
        tickets_def = [
            {
                "title": "Need custom banner aspect ratio for website integration",
                "priority": TicketPriority.MEDIUM,
                "status": TicketStatus.IN_PROGRESS,
                "messages": [
                    (
                        "Can we get high-res frame renders in 16:9 for our upcoming "
                        "hero section on the landing page?"
                    ),
                    "Certainly! I've assigned Liam to export the key frames in 4K 16:9.",
                ],
            },
            {
                "title": "Brand color hex update for Spring Campaign",
                "priority": TicketPriority.LOW,
                "status": TicketStatus.RESOLVED,
                "messages": [
                    (
                        "Hey team, we are updating our secondary accent from amber to "
                        "neon cyan (#00F5D4)."
                    ),
                    "Noted! We have updated Brand DNA assets in your profile and creative pods.",
                ],
            },
            {
                "title": "Urgent: Instagram Token Re-authorization",
                "priority": TicketPriority.URGENT,
                "status": TicketStatus.OPEN,
                "messages": [
                    "We received a notice that our Instagram Graph API token is expiring soon.",
                    (
                        "Our system will attempt an automated silent refresh, but keep your "
                        "business manager login handy if 2FA re-auth is triggered."
                    ),
                ],
            },
        ]

        for t_info in tickets_def:
            stmt = (
                select(Ticket)
                .where(Ticket.client_id == stage5_client.id)
                .where(Ticket.title == t_info["title"])
            )
            res = await db.execute(stmt)
            ticket = res.scalars().first()
            if not ticket:
                ticket = Ticket(
                    client_id=stage5_client.id,
                    assigned_to=team_lead.id,
                    title=t_info["title"],
                    description=t_info["messages"][0],
                    status=t_info["status"],
                    priority=t_info["priority"],
                )
                db.add(ticket)
                await db.flush()

                for msg_text in t_info["messages"]:
                    msg = TicketMessage(
                        ticket_id=ticket.id,
                        sender_id=stage5_client.id
                        if msg_text == t_info["messages"][0]
                        else team_lead.id,
                        message=msg_text,
                    )
                    db.add(msg)
                await db.flush()

        await db.commit()
    await engine.dispose()
    print("Database seeding completed successfully and idempotently!")


if __name__ == "__main__":
    asyncio.run(seed())
