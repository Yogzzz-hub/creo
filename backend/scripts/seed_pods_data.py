"""Seed realistic pod tasks, deliverables, and assignments for Pods Alpha, Beta, Gamma, Delta."""
import asyncio
import sys
import uuid
from datetime import UTC, date, datetime, timedelta

sys.path.insert(0, ".")

from sqlalchemy import delete, select, text
from app.db.session import async_session_factory
from app.models.user import User, StaffProfile, ClientProfile
from app.models.work import Task, Deliverable, ClientAssignment, ContentCalendar
from app.models.ops import LeaveRequest
from app.models.support import Ticket
from app.models.enums import TaskStatus, DeliverableType, DeliverableStatus, UserRole, AccountStatus
from app.core.security import hash_password

async def seed_pod_data():
    now = datetime.now(UTC)
    today = now.date()
    pw_hash = hash_password("Admin123!")

    async with async_session_factory() as db:
        print("Ensuring alias lead@creo.agency exists...")
        # Check if lead@creo.agency exists, if not create or link as Team Lead
        stmt = select(User).where(User.email == "lead@creo.agency")
        lead_alias = (await db.execute(stmt)).scalar_one_or_none()
        
        # Get lead.beta
        beta_lead = (await db.execute(select(User).where(User.email == "lead.beta@creo.agency"))).scalar_one_or_none()
        
        if not lead_alias:
            lead_alias = User(
                id=uuid.uuid4(),
                auth_id=f"auth-{uuid.uuid4().hex[:12]}",
                email="lead@creo.agency",
                full_name="Sarah Connor (Lead - Pod Beta)",
                hashed_password=pw_hash,
                role=UserRole.TEAM_LEAD,
                account_status=AccountStatus.ACTIVE,
                must_reset_password=False,
                email_verified_at=now,
            )
            db.add(lead_alias)
            await db.flush()
            
            sp = StaffProfile(
                user_id=lead_alias.id,
                team_lead_id=None,
                department="creative",
                daily_capacity=8,
                skills=["qa", "video_direction", "motion_supervision", "client_success"],
                is_accepting_work=True,
            )
            db.add(sp)
            await db.flush()
        else:
            lead_alias.hashed_password = pw_hash
            lead_alias.account_status = AccountStatus.ACTIVE
        # Ensure member aliases (david.kim@creo.agency, member@creo.agency) exist
        for member_email, member_name in [
            ("david.kim@creo.agency", "David Kim (Sr. Motion Specialist - Pod A)"),
            ("member@creo.agency", "David Kim (Sr. Motion Specialist - Pod A)"),
        ]:
            m_user = (await db.execute(select(User).where(User.email == member_email))).scalar_one_or_none()
            if not m_user:
                m_user = User(
                    id=uuid.uuid4(),
                    auth_id=f"auth-{uuid.uuid4().hex[:12]}",
                    email=member_email,
                    full_name=member_name,
                    hashed_password=pw_hash,
                    role=UserRole.EDITOR,
                    account_status=AccountStatus.ACTIVE,
                    must_reset_password=False,
                    email_verified_at=now,
                )
                db.add(m_user)
                await db.flush()
                m_sp = StaffProfile(
                    user_id=m_user.id,
                    team_lead_id=lead_alias.id,
                    department="video",
                    daily_capacity=8,
                    skills=["3d_motion", "after_effects", "octane", "color_grading"],
                    is_accepting_work=True,
                )
                db.add(m_sp)
                await db.flush()
            else:
                m_user.hashed_password = pw_hash
                m_user.account_status = AccountStatus.ACTIVE
                m_user.must_reset_password = False

        # Get all users by email
        users_res = await db.execute(select(User))
        users = {u.email: u for u in users_res.scalars().all()}
        
        # Define clients for Pods
        pod_clients_def = [
            {"email": "client.alpha@nordic.com", "name": "Nordic Aesthetics", "pod": "alpha"},
            {"email": "client.beta@apex.com", "name": "Apex Velocity Pro", "pod": "beta"},
            {"email": "client.gamma@aura.com", "name": "Blue Aura Glow", "pod": "gamma"},
            {"email": "client.delta@kite.com", "name": "Kite Urban Living", "pod": "delta"},
        ]
        
        pod_clients = {}
        for pcd in pod_clients_def:
            c = (await db.execute(select(User).where(User.email == pcd["email"]))).scalar_one_or_none()
            if not c:
                c = User(
                    id=uuid.uuid4(),
                    auth_id=f"auth-{uuid.uuid4().hex[:10]}",
                    email=pcd["email"],
                    full_name=pcd["name"],
                    hashed_password=pw_hash,
                    role=UserRole.CLIENT,
                    account_status=AccountStatus.ACTIVE,
                    email_verified_at=now,
                )
                db.add(c)
                await db.flush()
                cp = ClientProfile(
                    user_id=c.id,
                    company_name=pcd["name"],
                    brand_summary=f"Brand identity and content assets for {pcd['name']}",
                    brand_dna={"tone": "Modern & Sleek", "palette": ["#2B7BC4", "#1E293B"]},
                    terms_accepted_at=now,
                    terms_version="v1.0",
                    onboarding_completed_at=now,
                )
                db.add(cp)
                await db.flush()
            pod_clients[pcd["pod"]] = c

        # Setup Pod definitions
        pods = [
            {
                "key": "alpha",
                "name": "Pod Alpha",
                "lead_email": "lead.alpha@creo.agency",
                "editor_email": "editor.alpha@creo.agency",
                "designer_email": "designer.alpha@creo.agency",
                "client": pod_clients["alpha"],
            },
            {
                "key": "beta",
                "name": "Pod Beta",
                "lead_email": "lead.beta@creo.agency",
                "editor_email": "editor.beta@creo.agency",
                "designer_email": "designer.beta@creo.agency",
                "client": pod_clients["beta"],
            },
            {
                "key": "gamma",
                "name": "Pod Gamma",
                "lead_email": "lead.gamma@creo.agency",
                "editor_email": "editor.gamma@creo.agency",
                "designer_email": "designer.gamma@creo.agency",
                "client": pod_clients["gamma"],
            },
            {
                "key": "delta",
                "name": "Pod Delta",
                "lead_email": "lead.delta@creo.agency",
                "editor_email": "editor.delta@creo.agency",
                "designer_email": "designer.delta@creo.agency",
                "client": pod_clients["delta"],
            },
        ]

        # Link staff_profiles team_lead_id properly and seed tasks
        for p in pods:
            lead_user = (await db.execute(select(User).where(User.email == p["lead_email"]))).scalar_one_or_none()
            editor_user = (await db.execute(select(User).where(User.email == p["editor_email"]))).scalar_one_or_none()
            designer_user = (await db.execute(select(User).where(User.email == p["designer_email"]))).scalar_one_or_none()

            if lead_user and editor_user:
                sp_ed = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == editor_user.id))).scalar_one_or_none()
                if sp_ed:
                    sp_ed.team_lead_id = lead_user.id
            if lead_user and designer_user:
                sp_ds = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == designer_user.id))).scalar_one_or_none()
                if sp_ds:
                    sp_ds.team_lead_id = lead_user.id

            # Create Client Assignments
            if lead_user and p["client"]:
                ca_lead = (await db.execute(select(ClientAssignment).where(ClientAssignment.client_id == p["client"].id, ClientAssignment.user_id == lead_user.id))).scalar_one_or_none()
                if not ca_lead:
                    db.add(ClientAssignment(client_id=p["client"].id, user_id=lead_user.id, role="team_lead", craft_role="team_lead", is_primary=True))
                if editor_user:
                    ca_ed = (await db.execute(select(ClientAssignment).where(ClientAssignment.client_id == p["client"].id, ClientAssignment.user_id == editor_user.id))).scalar_one_or_none()
                    if not ca_ed:
                        db.add(ClientAssignment(client_id=p["client"].id, user_id=editor_user.id, role="editor", craft_role="video_editor", is_primary=False))
                if designer_user:
                    ca_ds = (await db.execute(select(ClientAssignment).where(ClientAssignment.client_id == p["client"].id, ClientAssignment.user_id == designer_user.id))).scalar_one_or_none()
                    if not ca_ds:
                        db.add(ClientAssignment(client_id=p["client"].id, user_id=designer_user.id, role="designer", craft_role="graphic_designer", is_primary=False))

            # Create sample tasks across all statuses for this Pod
            if lead_user and editor_user and designer_user and p["client"]:
                sample_tasks_plan = [
                    # 1. Backlog / Yet to do
                    {"type": DeliverableType.REEL, "status": TaskStatus.BACKLOG, "assignee": editor_user.id, "due_days": 2, "sla_hours": 36, "blueprint": {"hook": "3 Secrets to 10x ROI", "scene_count": 4, "format": "9:16 Vertical Reel"}},
                    {"type": DeliverableType.CAROUSEL, "status": TaskStatus.BACKLOG, "assignee": designer_user.id, "due_days": 3, "sla_hours": 48, "blueprint": {"slides": 7, "topic": "Q3 Growth Playbook", "format": "4:5 Carousel"}},
                    {"type": DeliverableType.STATIC_POST, "status": TaskStatus.BACKLOG, "assignee": None, "due_days": 1, "sla_hours": 18, "blueprint": {"headline": "Weekend Masterclass Announcement", "format": "1:1 Square"}},
                    
                    # 2. In Production
                    {"type": DeliverableType.REEL, "status": TaskStatus.IN_PRODUCTION, "assignee": editor_user.id, "due_days": 1, "sla_hours": 14, "blueprint": {"hook": "Why Traditional Agencies Fail", "scene_count": 5, "format": "9:16 High-Pace Reel"}},
                    {"type": DeliverableType.CAROUSEL, "status": TaskStatus.IN_PRODUCTION, "assignee": designer_user.id, "due_days": 2, "sla_hours": 26, "blueprint": {"slides": 6, "topic": "Visual Hierarchy in UI", "format": "4:5 Carousel"}},

                    # 3. Internal QA (Needing Lead Review!)
                    {"type": DeliverableType.REEL, "status": TaskStatus.INTERNAL_QA, "assignee": editor_user.id, "due_days": 0, "sla_hours": 6, "blueprint": {"hook": "The 60-Second Brand Transformation", "format": "4K 60fps Motion Reel", "preview_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"}},
                    {"type": DeliverableType.CAROUSEL, "status": TaskStatus.INTERNAL_QA, "assignee": designer_user.id, "due_days": 0, "sla_hours": 8, "blueprint": {"slides": 8, "topic": "Brand Color Psychology 2026", "format": "4:5 Carousel", "preview_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"}},

                    # 4. Client Review
                    {"type": DeliverableType.REEL, "status": TaskStatus.CLIENT_REVIEW, "assignee": editor_user.id, "due_days": 1, "sla_hours": 24, "blueprint": {"hook": "Customer Spotlight Feature", "format": "9:16 Story Reel"}},

                    # 5. Ready to Publish / Approved
                    {"type": DeliverableType.STATIC_POST, "status": TaskStatus.READY_TO_PUBLISH, "assignee": designer_user.id, "due_days": 0, "sla_hours": 0, "blueprint": {"headline": "Official Product Launch Graphic", "format": "1:1 Poster"}},
                ]

                for st in sample_tasks_plan:
                    t = Task(
                        id=uuid.uuid4(),
                        client_id=p["client"].id,
                        assigned_to=st["assignee"],
                        deliverable_type=st["type"],
                        status=st["status"],
                        due_date=today + timedelta(days=st["due_days"]),
                        sla_due_at=now + timedelta(hours=st["sla_hours"]),
                        effort_points=2 if st["type"] == DeliverableType.REEL else 1,
                        blueprint=st["blueprint"],
                    )
                    db.add(t)
                    await db.flush()

                    # If INTERNAL_QA or READY_TO_PUBLISH, create deliverable record too
                    if st["status"] in (TaskStatus.INTERNAL_QA, TaskStatus.CLIENT_REVIEW, TaskStatus.READY_TO_PUBLISH):
                        deliv_status = DeliverableStatus.PENDING_QA if st["status"] == TaskStatus.INTERNAL_QA else (
                            DeliverableStatus.PENDING_APPROVAL if st["status"] == TaskStatus.CLIENT_REVIEW else DeliverableStatus.APPROVED
                        )
                        deliv = Deliverable(
                            id=uuid.uuid4(),
                            root_id=uuid.uuid4(),
                            version=1,
                            client_id=p["client"].id,
                            task_id=t.id,
                            submitted_by=st["assignee"],
                            file_url=st["blueprint"].get("preview_url", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"),
                            file_type="video/mp4" if st["type"] == DeliverableType.REEL else "image/png",
                            file_size_bytes=15000000 if st["type"] == DeliverableType.REEL else 2400000,
                            status=deliv_status,
                            revision_round=1,
                        )
                        db.add(deliv)

        # Also let's seed 2 leave requests for the pods
        editor_alpha = users.get("editor.alpha@creo.agency")
        designer_gamma = users.get("designer.gamma@creo.agency")
        if editor_alpha:
            lr1 = LeaveRequest(
                id=uuid.uuid4(),
                user_id=editor_alpha.id,
                start_date=today + timedelta(days=3),
                end_date=today + timedelta(days=5),
                reason="Family Event / Personal Leave",
                status="pending",
            )
            db.add(lr1)
        if designer_gamma:
            lr2 = LeaveRequest(
                id=uuid.uuid4(),
                user_id=designer_gamma.id,
                start_date=today + timedelta(days=1),
                end_date=today + timedelta(days=2),
                reason="Medical Consultation",
                status="pending",
            )
            db.add(lr2)

        await db.commit()
        print("Successfully seeded all 4 pods with realistic tasks, deliverables, and team relations!")

if __name__ == "__main__":
    asyncio.run(seed_pod_data())
