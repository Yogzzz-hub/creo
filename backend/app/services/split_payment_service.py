"""Split payment management and automated reminder service.

Handles:
- Splitting total packages into configurable instalments with due dates
- Calculating remaining balance and payment status tracking
- Sending automated client reminders 2 days prior to deadline
- Notifying agency on approaching deadlines and overdue payments
- Manual or gateway payment status updates
- Package and instalment summaries for agency and client dashboards
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Conflict, NotFound
from app.models.billing import PaymentInstalment, SplitPaymentPackage
from app.models.ops import Notification
from app.models.user import ClientProfile, User
from app.services.email_service import send_email

log = structlog.get_logger(__name__)


async def create_split_package(
    db: AsyncSession,
    *,
    agency_id: uuid.UUID | None,
    client_id: uuid.UUID,
    title: str,
    total_amount: Decimal | float,
    currency: str = "INR",
    notes: str | None = None,
    instalments_data: list[dict[str, Any]],
) -> SplitPaymentPackage:
    """Configure total agreed package amount and divide it into multiple instalments."""
    dec_total = Decimal(str(total_amount))
    if dec_total <= 0:
        raise Conflict("Total package amount must be greater than zero", code="INVALID_AMOUNT")
    if not instalments_data:
        raise Conflict("At least one instalment is required", code="NO_INSTALMENTS")

    # Validate sum of instalments equals total package amount
    instalment_sum = sum(Decimal(str(item["amount"])) for item in instalments_data)
    if abs(instalment_sum - dec_total) > Decimal("0.01"):
        raise Conflict(
            f"Sum of instalments ({instalment_sum}) does not match package total ({dec_total})",
            code="INSTALMENT_SUM_MISMATCH",
        )

    package = SplitPaymentPackage(
        agency_id=agency_id,
        client_id=client_id,
        title=title.strip(),
        total_amount=dec_total,
        currency=currency.upper(),
        notes=notes,
        status="active",
    )
    db.add(package)
    await db.flush()

    for idx, item in enumerate(instalments_data, start=1):
        due = item["due_date"]
        if isinstance(due, str):
            due = datetime.strptime(due.split("T")[0], "%Y-%m-%d").date()

        instalment = PaymentInstalment(
            agency_id=agency_id,
            package_id=package.id,
            client_id=client_id,
            instalment_number=item.get("instalment_number", idx),
            amount=Decimal(str(item["amount"])),
            due_date=due,
            paid_amount=Decimal("0.00"),
            status="pending",
            notes=item.get("notes"),
        )
        db.add(instalment)

    await db.commit()
    await db.refresh(package)
    return package


async def mark_instalment_paid(
    db: AsyncSession,
    instalment_id: uuid.UUID,
    *,
    paid_amount: Decimal | float | None = None,
    payment_method: str = "manual",
    transaction_ref: str | None = None,
    notes: str | None = None,
    actor_id: uuid.UUID | None = None,
) -> PaymentInstalment:
    """Record payment receipt for an instalment, updating balance and status."""
    stmt = (
        select(PaymentInstalment)
        .where(PaymentInstalment.id == instalment_id)
    )
    instalment = (await db.execute(stmt)).scalar_one_or_none()
    if not instalment:
        raise NotFound("Payment instalment not found", code="INSTALMENT_NOT_FOUND")

    package = await db.get(SplitPaymentPackage, instalment.package_id)

    dec_paid = Decimal(str(paid_amount)) if paid_amount is not None else instalment.amount
    instalment.paid_amount = (instalment.paid_amount or Decimal("0.00")) + dec_paid
    instalment.paid_at = datetime.now(UTC)
    instalment.payment_method = payment_method
    if transaction_ref:
        instalment.transaction_ref = transaction_ref
    if notes:
        instalment.notes = notes
    if actor_id:
        instalment.recorded_by = actor_id

    if instalment.paid_amount >= instalment.amount:
        instalment.status = "paid"
    elif instalment.paid_amount > 0:
        instalment.status = "partially_paid"

    # Check if all instalments in the package are completed
    if package:
        all_inst_stmt = select(PaymentInstalment).where(PaymentInstalment.package_id == package.id)
        all_insts = (await db.execute(all_inst_stmt)).scalars().all()
        if all(inst.status == "paid" for inst in all_insts):
            package.status = "completed"

    # Notify client
    client_user = await db.get(User, instalment.client_id)
    client_name = client_user.full_name or "Client" if client_user else "Client"
    notification = Notification(
        agency_id=instalment.agency_id,
        user_id=instalment.client_id,
        title=f"Payment Received: Instalment #{instalment.instalment_number}",
        message=f"Received {package.currency if package else 'INR'} {dec_paid:,.2f} via {payment_method}. Thank you!",
        link="/portal/payments",
        is_read=False,
        sent_at=datetime.now(UTC),
    )
    db.add(notification)

    # Branded email acknowledgment
    if client_user and client_user.email:
        subject = f"Payment Receipt: Instalment #{instalment.instalment_number} for {package.title if package else 'Package'}"
        text_body = (
            f"Dear {client_name},\n\n"
            f"We have received your payment of {package.currency if package else 'INR'} {dec_paid:,.2f} for "
            f"Instalment #{instalment.instalment_number} ({package.title if package else 'Service Package'}).\n\n"
            f"Payment Method: {payment_method}\n"
            f"Reference: {transaction_ref or 'N/A'}\n\n"
            f"You can view your complete payment history and invoice receipts in your Creo client portal.\n"
        )
        html_body = f"""
        <div style="font-family: sans-serif; max-width: 600px; color: #161F2D;">
            <h2 style="color: #0D2137;">Payment Receipt Acknowledged</h2>
            <p>Dear {client_name},</p>
            <p>We have successfully recorded your payment of <strong>{package.currency if package else 'INR'} {dec_paid:,.2f}</strong> for Instalment #{instalment.instalment_number}.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="border-bottom: 1px solid #E2E8F0;"><td style="padding: 8px 0; color: #64748B;">Package:</td><td style="font-weight: bold;">{package.title if package else 'Package'}</td></tr>
                <tr style="border-bottom: 1px solid #E2E8F0;"><td style="padding: 8px 0; color: #64748B;">Amount Paid:</td><td style="font-weight: bold; color: #10B981;">{package.currency if package else 'INR'} {dec_paid:,.2f}</td></tr>
                <tr style="border-bottom: 1px solid #E2E8F0;"><td style="padding: 8px 0; color: #64748B;">Method:</td><td>{payment_method}</td></tr>
                <tr style="border-bottom: 1px solid #E2E8F0;"><td style="padding: 8px 0; color: #64748B;">Reference:</td><td>{transaction_ref or 'N/A'}</td></tr>
            </table>
            <p>Access your dashboard anytime to track your remaining balance and service timeline.</p>
        </div>
        """
        try:
            await send_email(client_user.email, subject, html_body, text_body)
        except Exception as e:
            log.warning("instalment_receipt_email_failed", error=str(e), email=client_user.email)

    await db.commit()
    await db.refresh(instalment)
    return instalment


async def update_instalment_deadline(
    db: AsyncSession,
    instalment_id: uuid.UUID,
    new_due_date: date | str,
    notes: str | None = None,
) -> PaymentInstalment:
    """Allow agency to adjust payment deadline for an instalment."""
    instalment = await db.get(PaymentInstalment, instalment_id)
    if not instalment:
        raise NotFound("Payment instalment not found", code="INSTALMENT_NOT_FOUND")

    if isinstance(new_due_date, str):
        new_due_date = datetime.strptime(new_due_date.split("T")[0], "%Y-%m-%d").date()

    instalment.due_date = new_due_date
    if notes:
        instalment.notes = notes

    # If new date is in future and status was overdue, revert to pending
    today = datetime.now(UTC).date()
    if instalment.status == "overdue" and new_due_date >= today:
        instalment.status = "pending"

    await db.commit()
    await db.refresh(instalment)
    return instalment


async def send_automated_instalment_reminder(
    db: AsyncSession,
    instalment: PaymentInstalment,
    package: SplitPaymentPackage | None = None,
) -> bool:
    """Send branded reminder to client 2 days before instalment due date."""
    if instalment.status == "paid":
        return False

    if not package:
        package = await db.get(SplitPaymentPackage, instalment.package_id)

    client_user = await db.get(User, instalment.client_id)
    if not client_user or not client_user.email:
        return False

    client_name = client_user.full_name or "Client"
    due_str = instalment.due_date.strftime("%B %d, %Y")
    curr = package.currency if package else "INR"
    remaining_due = (instalment.amount - (instalment.paid_amount or Decimal("0.00")))

    # 1. In-app notification
    db.add(Notification(
        agency_id=instalment.agency_id,
        user_id=instalment.client_id,
        title=f"Upcoming Payment Reminder: {curr} {remaining_due:,.2f}",
        message=f"Instalment #{instalment.instalment_number} is due on {due_str}. Pay online to keep your service active.",
        link="/portal/payments",
        is_read=False,
        sent_at=datetime.now(UTC),
    ))

    # 2. Branded Email
    subject = f"Payment Reminder: Instalment #{instalment.instalment_number} Due on {due_str}"
    text_body = (
        f"Dear {client_name},\n\n"
        f"This is a friendly reminder that your upcoming instalment for {package.title if package else 'your retainer'} "
        f"is due on {due_str}.\n\n"
        f"Amount Due: {curr} {remaining_due:,.2f}\n"
        f"Instalment: #{instalment.instalment_number}\n\n"
        f"Please log in to your Creo portal at /portal/payments to complete your payment.\n"
    )
    html_body = f"""
    <div style="font-family: sans-serif; max-width: 600px; color: #161F2D;">
        <div style="background: #161F2D; color: #FFFFFF; padding: 20px; border-radius: 12px 12px 0 0;">
            <h2 style="margin: 0; color: #7FA0D6;">Creo Payment Reminder</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px;">
            <p>Dear {client_name},</p>
            <p>This is an automated reminder that an instalment payment for <strong>{package.title if package else 'your service package'}</strong> is due in <strong>2 days</strong>.</p>
            <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7FA0D6;">
                <p style="margin: 0; font-size: 14px; color: #64748B;">Amount Due</p>
                <p style="margin: 4px 0 12px 0; font-size: 24px; font-weight: bold; color: #0D2137;">{curr} {remaining_due:,.2f}</p>
                <p style="margin: 0; font-size: 13px; color: #64748B;">Due Date: <strong>{due_str}</strong></p>
            </div>
            <p style="font-size: 14px; line-height: 1.5; color: #64748B;">You can pay via card, UPI, or bank transfer directly in your portal.</p>
        </div>
    </div>
    """

    try:
        await send_email(client_user.email, subject, html_body, text_body)
    except Exception as e:
        log.warning("automated_payment_reminder_email_failed", error=str(e), email=client_user.email)

    instalment.reminder_sent_at = datetime.now(UTC)
    await db.commit()
    return True


async def check_and_dispatch_reminders(db: AsyncSession) -> dict[str, int]:
    """Automated task checking for approaching deadlines and overdue instalments."""
    today = datetime.now(UTC).date()
    two_days_ahead = today + timedelta(days=2)

    # 1. Instalments due in 2 days that haven't received a reminder
    stmt = (
        select(PaymentInstalment, SplitPaymentPackage)
        .join(SplitPaymentPackage, SplitPaymentPackage.id == PaymentInstalment.package_id)
        .where(
            PaymentInstalment.status.in_(["pending", "partially_paid"]),
            PaymentInstalment.due_date <= two_days_ahead,
            PaymentInstalment.due_date >= today,
            PaymentInstalment.reminder_sent_at.is_(None),
        )
    )
    remind_rows = (await db.execute(stmt)).all()
    reminders_sent = 0
    for inst, pkg in remind_rows:
        sent = await send_automated_instalment_reminder(db, inst, pkg)
        if sent:
            reminders_sent += 1

    # 2. Overdue instalments (due_date < today)
    overdue_stmt = (
        select(PaymentInstalment, SplitPaymentPackage, User)
        .join(SplitPaymentPackage, SplitPaymentPackage.id == PaymentInstalment.package_id)
        .join(User, User.id == PaymentInstalment.client_id)
        .where(
            PaymentInstalment.status.in_(["pending", "partially_paid"]),
            PaymentInstalment.due_date < today,
        )
    )
    overdue_rows = (await db.execute(overdue_stmt)).all()
    overdue_marked = 0
    agency_alerts_sent = 0

    for inst, pkg, client_user in overdue_rows:
        if inst.status != "overdue":
            inst.status = "overdue"
            overdue_marked += 1

        # Notify agency admin if not already alerted
        if inst.agency_notified_at is None:
            # Find agency admins
            admin_stmt = select(User.id).where(
                User.role.in_(["admin", "super_admin"]),
                User.account_status == "active",
            )
            admin_ids = (await db.execute(admin_stmt)).scalars().all()
            for admin_id in admin_ids:
                db.add(Notification(
                    agency_id=inst.agency_id,
                    user_id=admin_id,
                    title=f"Payment Overdue: {client_user.full_name or client_user.email}",
                    message=f"Instalment #{inst.instalment_number} ({pkg.currency} {inst.amount:,.2f}) due on {inst.due_date} is now overdue.",
                    link=f"/admin/billing",
                    is_read=False,
                    sent_at=datetime.now(UTC),
                ))
            inst.agency_notified_at = datetime.now(UTC)
            agency_alerts_sent += 1

    await db.commit()
    return {
        "reminders_sent": reminders_sent,
        "overdue_marked": overdue_marked,
        "agency_alerts_sent": agency_alerts_sent,
    }


async def get_client_split_summary(
    db: AsyncSession,
    client_id: uuid.UUID,
) -> dict[str, Any]:
    """Retrieve full split package breakdown, balances, upcoming deadlines, and payment history."""
    stmt = (
        select(SplitPaymentPackage)
        .where(SplitPaymentPackage.client_id == client_id)
        .order_by(SplitPaymentPackage.created_at.desc())
    )
    packages = (await db.execute(stmt)).scalars().all()

    total_package_amount = Decimal("0.00")
    total_paid_amount = Decimal("0.00")
    packages_data: list[dict[str, Any]] = []
    payment_history: list[dict[str, Any]] = []
    next_due_date: date | None = None
    today = datetime.now(UTC).date()

    for pkg in packages:
        total_package_amount += pkg.total_amount
        inst_stmt = (
            select(PaymentInstalment)
            .where(PaymentInstalment.package_id == pkg.id)
            .order_by(PaymentInstalment.instalment_number.asc())
        )
        instalments = (await db.execute(inst_stmt)).scalars().all()

        pkg_paid = Decimal("0.00")
        instalments_data: list[dict[str, Any]] = []
        for inst in instalments:
            paid = inst.paid_amount or Decimal("0.00")
            pkg_paid += paid
            total_paid_amount += paid

            if inst.status in ("pending", "partially_paid", "overdue"):
                if next_due_date is None or inst.due_date < next_due_date:
                    next_due_date = inst.due_date

            if inst.paid_at is not None:
                payment_history.append({
                    "instalment_id": str(inst.id),
                    "package_title": pkg.title,
                    "instalment_number": inst.instalment_number,
                    "amount": float(paid),
                    "currency": pkg.currency,
                    "payment_date": inst.paid_at.isoformat(),
                    "payment_method": inst.payment_method or "manual",
                    "transaction_ref": inst.transaction_ref,
                    "status": "paid",
                })

            instalments_data.append({
                "id": str(inst.id),
                "package_id": str(inst.package_id),
                "instalment_number": inst.instalment_number,
                "amount": float(inst.amount),
                "currency": pkg.currency,
                "due_date": inst.due_date.isoformat(),
                "paid_amount": float(paid),
                "paid_at": inst.paid_at.isoformat() if inst.paid_at else None,
                "status": inst.status,
                "payment_method": inst.payment_method,
                "transaction_ref": inst.transaction_ref,
                "notes": inst.notes,
                "is_overdue": inst.due_date < today and inst.status != "paid",
            })

        pkg_pending = pkg.total_amount - pkg_paid
        packages_data.append({
            "id": str(pkg.id),
            "title": pkg.title,
            "total_amount": float(pkg.total_amount),
            "currency": pkg.currency,
            "paid_amount": float(pkg_paid),
            "pending_balance": float(max(Decimal("0.00"), pkg_pending)),
            "status": pkg.status,
            "notes": pkg.notes,
            "created_at": pkg.created_at.isoformat() if pkg.created_at else None,
            "instalments": instalments_data,
        })

    pending_balance = max(Decimal("0.00"), total_package_amount - total_paid_amount)
    payment_history.sort(key=lambda x: x["payment_date"], reverse=True)

    return {
        "client_id": str(client_id),
        "total_package_amount": float(total_package_amount),
        "total_paid": float(total_paid_amount),
        "pending_balance": float(pending_balance),
        "currency": packages[0].currency if packages else "INR",
        "next_due_date": next_due_date.isoformat() if next_due_date else None,
        "packages": packages_data,
        "payment_history": payment_history,
    }
