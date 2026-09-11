"""Reset database to clean production state:
- Purges all mock data across deliverables (reels, posters, carousels), tasks, tickets, and mock users.
- Sets up exactly:
    1 Super Admin: admin@creo.agency
    2 Admins: ops.admin@creo.agency, creative.admin@creo.agency
    4 Creative Teams (Pods), each with 3 members:
        Pod Alpha: Lead, Video Editor, Graphic Designer
        Pod Beta:  Lead, Video Editor, Graphic Designer
        Pod Gamma: Lead, Video Editor, Graphic Designer
        Pod Delta: Lead, Video Editor, Graphic Designer
    (Total = 15 core agency staff, all with password: Admin123!)
- Preserves real registered clients (@gmail.com).
- Re-dispatches pod assignment and feasible schedule for onboarded clients.
"""

from __future__ import annotations

import asyncio
import sys
import uuid
from datetime import UTC, datetime

# Ensure backend directory is in path
sys.path.insert(0, ".")

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from typing import TypedDict

from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models.billing import Plan
from app.models.enums import AccountStatus, UserRole
from app.models.user import ClientProfile, StaffProfile, User
from app.models.work import ClientAssignment, ContentCalendar, Deliverable, Task
from app.services.fair_dispatch_service import assign_client_and_generate_schedule


class StaffRosterItem(TypedDict):
    email: str
    full_name: str
    role: UserRole
    department: str
    skills: list[str]
    team_lead_email: str | None


# Defined roster of 1 Super Admin, 2 Admins, and 4 Teams (each 3 members)
STAFF_ROSTER: list[StaffRosterItem] = [
    # 1. Super Admin
    {
        "email": "admin@creo.agency",
        "full_name": "Antigravity Super Admin",
        "role": UserRole.SUPER_ADMIN,
        "department": "executive",
        "skills": ["governance", "finance", "strategy", "operations"],
        "team_lead_email": None,
    },
    # 2. Admins (2)
    {
        "email": "ops.admin@creo.agency",
        "full_name": "Aarav Sharma (Operations Admin)",
        "role": UserRole.ADMIN,
        "department": "operations",
        "skills": ["workflow_dispatch", "sla_monitoring", "quality_control", "client_relations"],
        "team_lead_email": None,
    },
    {
        "email": "creative.admin@creo.agency",
        "full_name": "Pooja Nambiar (Creative Admin)",
        "role": UserRole.ADMIN,
        "department": "creative",
        "skills": ["creative_direction", "brand_strategy", "art_direction", "video_production"],
        "team_lead_email": None,
    },
    # 3. Team 1 — Pod Alpha (3 members)
    {
        "email": "lead.alpha@creo.agency",
        "full_name": "Vikram Malhotra (Lead - Pod Alpha)",
        "role": UserRole.TEAM_LEAD,
        "department": "creative",
        "skills": ["creative_direction", "storyboarding", "qa", "client_management"],
        "team_lead_email": None,
    },
    {
        "email": "editor.alpha@creo.agency",
        "full_name": "Karthik Raja (Editor - Pod Alpha)",
        "role": UserRole.EDITOR,
        "department": "video",
        "skills": ["reels", "premiere_pro", "sound_design", "color_grading"],
        "team_lead_email": "lead.alpha@creo.agency",
    },
    {
        "email": "designer.alpha@creo.agency",
        "full_name": "Ananya Deshmukh (Designer - Pod Alpha)",
        "role": UserRole.DESIGNER,
        "department": "design",
        "skills": ["carousels", "posters", "figma", "typography", "branding"],
        "team_lead_email": "lead.alpha@creo.agency",
    },
    # 4. Team 2 — Pod Beta (3 members)
    {
        "email": "lead.beta@creo.agency",
        "full_name": "Sarah Connor (Lead - Pod Beta)",
        "role": UserRole.TEAM_LEAD,
        "department": "creative",
        "skills": ["creative_direction", "motion_supervision", "qa", "client_success"],
        "team_lead_email": None,
    },
    {
        "email": "editor.beta@creo.agency",
        "full_name": "Liam Vance (Editor - Pod Beta)",
        "role": UserRole.EDITOR,
        "department": "video",
        "skills": ["after_effects", "3d_motion", "viral_hooks", "short_form"],
        "team_lead_email": "lead.beta@creo.agency",
    },
    {
        "email": "designer.beta@creo.agency",
        "full_name": "Ethan Hunt (Designer - Pod Beta)",
        "role": UserRole.DESIGNER,
        "department": "design",
        "skills": ["visual_identity", "editorial_design", "photoshop", "infographics"],
        "team_lead_email": "lead.beta@creo.agency",
    },
    # 5. Team 3 — Pod Gamma (3 members)
    {
        "email": "lead.gamma@creo.agency",
        "full_name": "Rohan Roy (Lead - Pod Gamma)",
        "role": UserRole.TEAM_LEAD,
        "department": "creative",
        "skills": ["creative_direction", "brand_narrative", "pacing", "review_cycles"],
        "team_lead_email": None,
    },
    {
        "email": "editor.gamma@creo.agency",
        "full_name": "Maya Lin (Editor - Pod Gamma)",
        "role": UserRole.EDITOR,
        "department": "video",
        "skills": ["motion_graphics", "dynamic_typography", "davinci_resolve", "reels"],
        "team_lead_email": "lead.gamma@creo.agency",
    },
    {
        "email": "designer.gamma@creo.agency",
        "full_name": "Zara Sheikh (Designer - Pod Gamma)",
        "role": UserRole.DESIGNER,
        "department": "design",
        "skills": ["modern_minimalism", "illustrations", "figma", "social_banners"],
        "team_lead_email": "lead.gamma@creo.agency",
    },
    # 6. Team 4 — Pod Delta (3 members)
    {
        "email": "lead.delta@creo.agency",
        "full_name": "Aditya Verma (Lead - Pod Delta)",
        "role": UserRole.TEAM_LEAD,
        "department": "creative",
        "skills": ["creative_direction", "content_strategy", "qa_pipeline", "team_coaching"],
        "team_lead_email": None,
    },
    {
        "email": "editor.delta@creo.agency",
        "full_name": "Dev Patel (Editor - Pod Delta)",
        "role": UserRole.EDITOR,
        "department": "video",
        "skills": ["reels", "cinematic_edits", "pace_cutting", "audio_engineering"],
        "team_lead_email": "lead.delta@creo.agency",
    },
    {
        "email": "designer.delta@creo.agency",
        "full_name": "Meera Joshi (Designer - Pod Delta)",
        "role": UserRole.DESIGNER,
        "department": "design",
        "skills": ["brand_guidelines", "story_templates", "carousel_mastery", "typography"],
        "team_lead_email": "lead.delta@creo.agency",
    },
]


async def run_cleanup_and_reseed() -> None:
    now = datetime.now(UTC)
    standard_password_hash = hash_password("Admin123!")

    async with async_session_factory() as db:
        print("\n=== STEP 1: PURGE ALL MOCK REELS, DELIVERABLES, AND OPERATIONAL TABLES ===")
        # 1. Truncate mock support, leaves, announcements, deliverables
        await db.execute(text("DELETE FROM ticket_messages;"))
        await db.execute(text("DELETE FROM tickets;"))
        await db.execute(text("DELETE FROM leave_requests;"))
        await db.execute(text("DELETE FROM announcements;"))
        await db.execute(text("DELETE FROM notifications;"))
        await db.execute(text("DELETE FROM deliverables;"))  # Remove all mock reels & deliverables
        await db.commit()
        print("[OK] Purged tickets, ticket messages, leave requests, announcements, and deliverables.")

        # 2. Get real clients to preserve
        real_clients_res = await db.execute(
            select(User.id, User.email).where(User.email.like("%@gmail.com"))
        )
        real_clients = real_clients_res.fetchall()
        real_client_ids = [r[0] for r in real_clients]
        real_client_emails = [r[1] for r in real_clients]
        print(f"[OK] Preserved real clients: {real_client_emails}")

        # 3. Clean client assignments, tasks, calendar for non-real clients
        if real_client_ids:
            await db.execute(delete(ClientAssignment).where(~ClientAssignment.client_id.in_(real_client_ids)))
            await db.execute(delete(ContentCalendar).where(~ContentCalendar.client_id.in_(real_client_ids)))
            await db.execute(delete(Task).where(~Task.client_id.in_(real_client_ids)))
            await db.execute(text("DELETE FROM usage_counters WHERE client_id NOT IN (SELECT id FROM users WHERE email LIKE '%@gmail.com')"))
            await db.execute(text("DELETE FROM subscriptions WHERE client_id NOT IN (SELECT id FROM users WHERE email LIKE '%@gmail.com')"))
            await db.execute(text("DELETE FROM questionnaires WHERE user_id NOT IN (SELECT id FROM users WHERE email LIKE '%@gmail.com')"))
            await db.execute(delete(ClientProfile).where(~ClientProfile.user_id.in_(real_client_ids)))
        else:
            await db.execute(delete(ClientAssignment))
            await db.execute(delete(ContentCalendar))
            await db.execute(delete(Task))
            await db.execute(text("DELETE FROM usage_counters;"))
            await db.execute(text("DELETE FROM subscriptions;"))
            await db.execute(text("DELETE FROM questionnaires;"))
            await db.execute(delete(ClientProfile))

        # Also purge any client assignments / tasks on real clients to cleanly regenerate with new pods
        await db.execute(delete(ClientAssignment))
        await db.execute(delete(ContentCalendar))
        await db.execute(delete(Task))
        await db.commit()
        print("[OK] Cleaned tasks, calendar, and client assignments.")

        # 4. Remove all mock users (anything not a real client and not our staff)
        allowed_staff_emails = [s["email"] for s in STAFF_ROSTER]
        all_preserved_emails = allowed_staff_emails + real_client_emails

        # Clear staff profiles first
        await db.execute(delete(StaffProfile))
        await db.commit()

        # Delete all other users
        await db.execute(delete(User).where(~User.email.in_(all_preserved_emails)))
        await db.commit()
        print("[OK] Deleted all mock users from database.")

        print("\n=== STEP 2: SEED EXACT STAFF ROSTER (1 Super Admin, 2 Admins, 4 Teams x 3 Members) ===")
        # Seed or update all 15 staff members
        created_users: dict[str, User] = {}
        for s_def in STAFF_ROSTER:
            stmt = select(User).where(User.email == s_def["email"])
            user = (await db.execute(stmt)).scalar_one_or_none()

            if not user:
                user = User(
                    id=uuid.uuid4(),
                    auth_id=f"auth-{uuid.uuid4().hex[:12]}",
                    email=s_def["email"],
                    full_name=s_def["full_name"],
                    hashed_password=standard_password_hash,
                    role=s_def["role"],
                    account_status=AccountStatus.ACTIVE,
                    must_reset_password=False,
                    email_verified_at=now,
                )
                db.add(user)
                await db.flush()
                print(f"  + Created {s_def['role'].value:12} | {s_def['email']:30} | {s_def['full_name']}")
            else:
                user.full_name = s_def["full_name"]
                user.role = s_def["role"]
                user.account_status = AccountStatus.ACTIVE
                user.must_reset_password = False
                user.hashed_password = standard_password_hash
                user.email_verified_at = now
                print(f"  ~ Updated {s_def['role'].value:12} | {s_def['email']:30} | {s_def['full_name']}")

            created_users[s_def["email"]] = user

        await db.commit()

        # Now link staff profiles and team leads
        for s_def in STAFF_ROSTER:
            user = created_users[s_def["email"]]
            tl_id = None
            if s_def["team_lead_email"] and s_def["team_lead_email"] in created_users:
                tl_id = created_users[s_def["team_lead_email"]].id

            sp = StaffProfile(
                user_id=user.id,
                team_lead_id=tl_id,
                department=s_def["department"],
                daily_capacity=4,
                skills=s_def["skills"],
                is_accepting_work=True,
            )
            db.add(sp)

        await db.commit()
        print("[OK] Created 15 Staff Profiles with proper department, skills, capacity, and team lead relations.")

        print("\n=== STEP 3: RE-DISPATCH CREATIVE PODS FOR ONBOARDED REAL CLIENTS ===")
        # Check real clients that have completed questionnaire / brand discovery
        for cid, cemail in real_clients:
            cp_stmt = select(ClientProfile).where(ClientProfile.user_id == cid)
            cp = (await db.execute(cp_stmt)).scalar_one_or_none()
            if cp and cp.brand_dna:
                print(f"  -> Generating pod assignments and calendar for {cemail}...")
                try:
                    res = await assign_client_and_generate_schedule(db, cid)
                    print(f"     Pod assigned: Lead={res.get('assigned_lead_id')}, Tasks={res.get('tasks_created')}, Calendar={res.get('calendar_items_created')}")
                except Exception as e:
                    print(f"     Notice on {cemail}: {e}")

        # Refresh materialized views
        mviews_res = await db.execute(text("SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';"))
        for mv in mviews_res.fetchall():
            mv_name = mv[0]
            try:
                await db.execute(text(f"REFRESH MATERIALIZED VIEW {mv_name};"))
                print(f"[OK] Refreshed materialized view: {mv_name}")
            except Exception as e:
                print(f"Notice refreshing {mv_name}: {e}")

        await db.commit()

        # Final audit counts
        user_cnt = (await db.execute(select(func.count(User.id)))).scalar()
        staff_cnt = (await db.execute(select(func.count(StaffProfile.user_id)))).scalar()
        client_cnt = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.CLIENT))).scalar()
        admin_cnt = (await db.execute(select(func.count(User.id)).where(User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN])))).scalar()
        team_cnt = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.TEAM_LEAD))).scalar()
        deliv_cnt = (await db.execute(select(func.count(Deliverable.id)))).scalar()
        task_cnt = (await db.execute(select(func.count(Task.id)))).scalar()
        cal_cnt = (await db.execute(select(func.count(ContentCalendar.id)))).scalar()

        print("\n=========================================================")
        print("  CLEAN DATABASE AUDIT SUMMARY")
        print("=========================================================")
        print(f"  Total Users:           {user_cnt}")
        print(f"  Staff Profiles:        {staff_cnt} (1 Super Admin + 2 Admins + 12 Pod Members)")
        print(f"  Super Admin & Admins:  {admin_cnt}")
        print(f"  Team Leads (4 Pods):   {team_cnt}")
        print(f"  Client Accounts:       {client_cnt}")
        print(f"  Deliverables:          {deliv_cnt} (All mock reels purged)")
        print(f"  Tasks:                 {task_cnt}")
        print(f"  Content Calendar:      {cal_cnt}")
        print("=========================================================\n")


if __name__ == "__main__":
    asyncio.run(run_cleanup_and_reseed())
