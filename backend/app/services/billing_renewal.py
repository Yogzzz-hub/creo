"""Client pause requests and admin-approved provider changes."""
import uuid
from datetime import UTC, datetime
from sqlalchemy import select
from app.core.errors import Conflict, Forbidden, NotFound
from app.models.billing import Subscription, SubscriptionPauseRequest
from app.models.enums import AccountStatus, UserRole
from app.models.ops import Notification
from app.models.user import User
from app.services import razorpay_subscriptions as gateway


async def client_subscription(db, actor, *, require_paid=True):
    if actor.role != UserRole.CLIENT:
        raise Forbidden("This action is for the client account owner.")
    client = await db.get(User, actor.user_id)
    if not client or client.account_status != AccountStatus.ACTIVE or not client.agency_id:
        raise Forbidden("An active client agency is required.")
    query = select(Subscription).where(Subscription.client_id == actor.user_id)
    if require_paid:
        query = query.where(Subscription.status.in_(["active", "trialing"]), Subscription.current_period_end > datetime.now(UTC))
    else:
        query = query.where(Subscription.gateway_subscription_id.like("sub_%"), Subscription.status != "incomplete")
    sub = (await db.execute(query.order_by(Subscription.created_at.desc()).limit(1).with_for_update())).scalar_one_or_none()
    if not sub:
        raise Conflict("There is no current paid subscription to manage.")
    if not (sub.gateway_subscription_id or "").startswith("sub_"):
        raise Conflict("This plan has no Razorpay AutoPay mandate. Contact your admin to set one up.")
    return client, sub


def serialize(row):
    return {"id": str(row.id), "client_id": str(row.client_id), "status": row.status,
            "reason": row.reason, "effective_at": row.effective_at.isoformat(), "created_at": row.created_at.isoformat()}


async def request_pause(db, actor, reason):
    client, sub = await client_subscription(db, actor)
    existing = (await db.execute(select(SubscriptionPauseRequest).where(
        SubscriptionPauseRequest.subscription_id == sub.id, SubscriptionPauseRequest.status == "pending"))).scalar_one_or_none()
    if existing:
        return {"success": True, "message": "Your pause request is awaiting admin approval. AutoPay remains active.", "is_paused_next_month": False, "pause_request_status": "pending"}
    if (sub.gateway_data or {}).get("mandate_status") == "paused":
        raise Conflict("Your AutoPay renewal is already paused.")
    row = SubscriptionPauseRequest(id=uuid.uuid4(), agency_id=client.agency_id, client_id=client.id,
        subscription_id=sub.id, status="pending", reason=reason, effective_at=sub.current_period_end)
    db.add(row)
    admins = (await db.execute(select(User.id).where(User.agency_id == client.agency_id,
        User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN])))).scalars().all()
    for admin_id in admins:
        db.add(Notification(agency_id=client.agency_id, user_id=admin_id, title="AutoPay pause approval requested",
            message=f"{client.full_name or client.email} requests a pause from {row.effective_at:%d %b %Y}: {reason}", link="/admin/revenue"))
    await db.commit()
    return {"success": True, "message": "Request sent to your admin. AutoPay remains active until approval.", "is_paused_next_month": False, "pause_request_status": "pending"}


async def review(db, actor, request_id, approve):
    if actor.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise Forbidden("Only an administrator can approve billing pauses.")
    row = (await db.execute(select(SubscriptionPauseRequest).where(SubscriptionPauseRequest.id == request_id))).scalar_one_or_none()
    if not row:
        raise NotFound("Pause request not found.")
    if actor.role != UserRole.SUPER_ADMIN and (not actor.agency_id or row.agency_id != actor.agency_id):
        raise Forbidden("This request belongs to another agency.")
    sub = (await db.execute(select(Subscription).where(Subscription.id == row.subscription_id).with_for_update())).scalar_one()
    row = (await db.execute(select(SubscriptionPauseRequest).where(SubscriptionPauseRequest.id == request_id).with_for_update().execution_options(populate_existing=True))).scalar_one()
    if row.status != "pending":
        return serialize(row)
    if approve:
        if sub.current_period_end != row.effective_at or row.effective_at <= datetime.now(UTC):
            raise Conflict("The requested renewal has already changed or passed. Ask the client for a new request.")
        # Razorpay pauses future billing immediately. CREO retains the already-paid
        # period; no entitlement is removed before current_period_end.
        remote = await gateway.fetch(sub.gateway_subscription_id)
        if remote.get("status") != "paused" and int(remote.get("current_end") or 0) != int(row.effective_at.timestamp()):
            raise Conflict("Razorpay's billing cycle changed. Refresh billing and request the new renewal date.")
        remote = await gateway.change(sub.gateway_subscription_id, "pause")
        sub.gateway_data = {**(sub.gateway_data or {}), "mandate_status": remote["status"], "pause_effective_at": row.effective_at.isoformat()}
    row.status = "approved" if approve else "rejected"
    row.reviewed_by, row.reviewed_at = actor.user_id, datetime.now(UTC)
    db.add(Notification(agency_id=row.agency_id, user_id=row.client_id,
        title="AutoPay pause approved" if approve else "AutoPay pause declined",
        message=f"Future charges are paused. Paid access continues until {row.effective_at:%d %b %Y}." if approve else "AutoPay remains active. Contact your agency for details.", link="/portal/account"))
    await db.commit()
    return serialize(row)


async def resume(db, actor):
    client, sub = await client_subscription(db, actor, require_paid=False)
    pending = (await db.execute(select(SubscriptionPauseRequest).where(
        SubscriptionPauseRequest.subscription_id == sub.id, SubscriptionPauseRequest.status == "pending").with_for_update())).scalar_one_or_none()
    if pending:
        pending.status = "withdrawn"
    remote = await gateway.fetch(sub.gateway_subscription_id)
    if remote.get("status") == "paused":
        remote = await gateway.change(sub.gateway_subscription_id, "resume")
    if remote.get("status") != "active":
        raise Conflict("This Razorpay mandate is no longer active. Contact your agency to authorize AutoPay again.")
    sub.gateway_data = {**(sub.gateway_data or {}), "mandate_status": remote["status"], "pause_effective_at": None}
    await db.commit()
    return {"success": True, "message": "AutoPay remains active. Any pending pause request has been withdrawn.", "is_paused_next_month": False}
