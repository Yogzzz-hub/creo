import io
import tempfile
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

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
from models.ticket import Ticket
from utils.exports import generate_excel_report, generate_pdf_report

router = APIRouter(prefix="/api/v1/admin/reports", tags=["admin-reports"])


class MonthlyRevenueResponse(BaseModel):
    month: str
    revenue: float


class TicketMetricsResponse(BaseModel):
    total_tickets: int
    resolved: int
    avg_resolution_hours: float
    by_status: dict


class DeliverableMetricsResponse(BaseModel):
    total: int
    approved: int
    pending: int
    revision: int


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


@router.get("/revenue", response_model=list[MonthlyRevenueResponse])
async def get_revenue_report(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            func.date_trunc("month", Subscription.created_at).label("month"),
            func.coalesce(func.sum(Plan.monthly_price), 0.0).label("revenue"),
        )
        .join(Plan, Plan.id == Subscription.plan_id)
        .where(Subscription.status == "active")
        .group_by(func.date_trunc("month", Subscription.created_at))
        .order_by(func.date_trunc("month", Subscription.created_at).desc())
        .limit(12)
    )
    rows = result.all()

    return [
        MonthlyRevenueResponse(
            month=row.month.strftime("%b %Y") if row.month else "Unknown",
            revenue=float(row.revenue),
        )
        for row in rows
    ]


@router.get("/tickets", response_model=TicketMetricsResponse)
async def get_ticket_metrics(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    total_result = await db.execute(select(func.count(Ticket.id)))
    total = total_result.scalar() or 0

    resolved_result = await db.execute(
        select(func.count(Ticket.id)).where(Ticket.status == "resolved")
    )
    resolved = resolved_result.scalar() or 0

    status_result = await db.execute(
        select(Ticket.status, func.count(Ticket.id))
        .group_by(Ticket.status)
    )
    by_status = {}
    for row in status_result.all():
        status_key = row.status.value if hasattr(row.status, 'value') else str(row.status)
        by_status[status_key] = row.count

    avg_hours = 0.0
    if resolved > 0:
        avg_result = await db.execute(
            select(
                func.avg(
                    func.extract("epoch", Ticket.resolved_at - Ticket.created_at) / 3600
                )
            ).where(Ticket.resolved_at.isnot(None))
        )
        avg_hours = float(avg_result.scalar() or 0.0)

    return TicketMetricsResponse(
        total_tickets=total,
        resolved=resolved,
        avg_resolution_hours=round(avg_hours, 1),
        by_status=by_status,
    )


@router.get("/deliverables", response_model=DeliverableMetricsResponse)
async def get_deliverable_metrics(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    total_result = await db.execute(select(func.count(Deliverable.id)))
    total = total_result.scalar() or 0

    approved_result = await db.execute(
        select(func.count(Deliverable.id)).where(Deliverable.status == DeliverableStatus.approved)
    )
    approved = approved_result.scalar() or 0

    pending_result = await db.execute(
        select(func.count(Deliverable.id)).where(
            Deliverable.status == DeliverableStatus.pending_approval
        )
    )
    pending = pending_result.scalar() or 0

    revision_result = await db.execute(
        select(func.count(Deliverable.id)).where(
            Deliverable.status.in_([
                DeliverableStatus.revision_in_progress,
                DeliverableStatus.revised_pending_approval,
            ])
        )
    )
    revision = revision_result.scalar() or 0

    return DeliverableMetricsResponse(
        total=total,
        approved=approved,
        pending=pending,
        revision=revision,
    )
