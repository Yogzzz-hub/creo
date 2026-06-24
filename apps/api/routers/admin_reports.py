import io
import tempfile
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.deliverable import Deliverable
from models.enums import AccountStatus, DeliverableStatus, TaskStatus, UserRole
from models.escalation import Escalation
from models.leave import LeaveRequest
from models.enums import LeaveStatus
from models.plan import Plan
from models.subscription import Subscription
from models.task import Task
from models.team import TeamMember
from models.user import User
from utils.exports import generate_excel_report, generate_pdf_report

router = APIRouter(prefix="/api/v1/admin/reports", tags=["admin-reports"])


async def _gather_kpi_data(db: AsyncSession, current_user: RequireAdmin) -> dict:
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    active_clients_result = await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.client,
            User.account_status == AccountStatus.active,
            User.deleted_at.is_(None),
        )
    )
    total_active_clients = active_clients_result.scalar() or 0

    mrr_result = await db.execute(
        select(func.coalesce(func.sum(Plan.monthly_price), 0.0))
        .join(Subscription, Subscription.plan_id == Plan.id)
        .join(User, User.id == Subscription.user_id)
        .where(
            Subscription.status == "active",
            User.role == UserRole.client,
            User.deleted_at.is_(None),
        )
    )
    mrr_estimate = float(mrr_result.scalar() or 0.0)

    approved_count_result = await db.execute(
        select(func.count(Deliverable.id)).where(
            Deliverable.status == DeliverableStatus.approved,
            Deliverable.created_at >= thirty_days_ago,
        )
    )
    approved_count = approved_count_result.scalar() or 0

    total_submitted_result = await db.execute(
        select(func.count(Deliverable.id)).where(
            Deliverable.created_at >= thirty_days_ago,
        )
    )
    total_submitted = total_submitted_result.scalar() or 0

    delivery_rate = (approved_count / total_submitted) * 100.0 if total_submitted > 0 else 0.0

    escalations_result = await db.execute(
        select(func.count(Escalation.id)).where(Escalation.status != "resolved")
    )
    active_escalations = escalations_result.scalar() or 0

    team_members_result = await db.execute(
        select(TeamMember, User)
        .join(User, User.id == TeamMember.user_id)
        .where(TeamMember.is_active.is_(True))
        .order_by(User.full_name.asc())
    )
    team_rows = team_members_result.all()

    active_member_ids = [tm.id for tm, _ in team_rows]

    load_counts_result = await db.execute(
        select(Task.assigned_to, func.count(Task.id).label("task_count"))
        .where(
            Task.assigned_to.in_(active_member_ids),
            Task.status.in_([TaskStatus.pending, TaskStatus.in_progress]),
        )
        .group_by(Task.assigned_to)
    )
    load_map = {row.assigned_to: row.task_count for row in load_counts_result.all()}

    capacity_rows = []
    for tm, user in team_rows:
        member_capacity = tm.daily_cap_posters + tm.daily_cap_reels + tm.daily_cap_stories
        capacity_rows.append({
            "Team Member": user.full_name,
            "Current Load": load_map.get(tm.id, 0),
            "Daily Capacity": member_capacity,
            "Utilization %": round((load_map.get(tm.id, 0) / member_capacity) * 100, 1) if member_capacity > 0 else 0.0,
        })

    return {
        "overview": {
            "Report Generated": now.strftime("%Y-%m-%d %H:%M UTC"),
            "Active Clients": total_active_clients,
            "MRR Estimate": f"₹{mrr_estimate:,.0f}",
            "Delivery Rate (30d)": f"{round(delivery_rate, 2)}%",
            "Active Escalations": active_escalations,
        },
        "team_capacity": capacity_rows,
    }


@router.get("/export/pdf")
async def export_kpi_pdf(
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    data = await _gather_kpi_data(db, current_user)

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        output_path = tmp.name

    pdf_data = {
        "Platform Overview": data["overview"],
        "Team Capacity": {row["Team Member"]: f"Load: {row['Current Load']}/{row['Daily Capacity']} ({row['Utilization %']}%)" for row in data["team_capacity"]},
    }

    generate_pdf_report("Creo — KPI Report", pdf_data, output_path)

    with open(output_path, "rb") as f:
        pdf_bytes = f.read()

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=creo-kpi-report.pdf"},
    )


@router.get("/export/excel")
async def export_kpi_excel(
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    data = await _gather_kpi_data(db, current_user)

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        output_path = tmp.name

    generate_excel_report("KPI Report", data["team_capacity"], output_path)

    with open(output_path, "rb") as f:
        excel_bytes = f.read()

    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=creo-kpi-report.xlsx"},
    )
