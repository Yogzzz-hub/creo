import asyncio
import uuid
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.tenant import Agency
from app.models.billing import PlatformSubscription, PlatformPaymentEvent
from app.models.ops import AuditLog, PlatformSetting
from app.models.enums import SubscriptionStatus, PaymentProvider, UserRole
from app.models.user import User

async def seed():
    async with AsyncSessionLocal() as db:
        # 1. Update agency to growth plan
        agency_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        agency = await db.get(Agency, agency_id)
        if not agency:
            agency = Agency(
                id=agency_id,
                name="Creo Digital",
                slug="creo",
                status="active",
                plan_tier="growth",
                max_clients=50,
                max_staff=15,
                branding={"primary_color": "#7FA0D6"},
            )
            db.add(agency)
        else:
            agency.plan_tier = "growth"
            agency.status = "active"
            agency.max_clients = 50
            agency.max_staff = 15
        await db.commit()
        print("Updated agency to growth plan:", agency.id, agency.name, agency.plan_tier)

        # 2. Ensure PlatformSubscription
        now = datetime.now(timezone.utc)
        sub_stmt = select(PlatformSubscription).where(PlatformSubscription.agency_id == agency_id)
        sub = (await db.execute(sub_stmt)).scalar_one_or_none()
        if not sub:
            sub = PlatformSubscription(
                id=uuid.uuid4(),
                agency_id=agency_id,
                status=SubscriptionStatus.ACTIVE,
                gateway=PaymentProvider.RAZORPAY,
                gateway_subscription_id="sub_creo_growth_001",
                gateway_customer_id="cust_creo_admin_001",
                amount=Decimal("5999.00"),
                current_period_start=now - timedelta(days=14),
                current_period_end=now + timedelta(days=16),
            )
            db.add(sub)
        else:
            sub.status = SubscriptionStatus.ACTIVE
            sub.amount = Decimal("5999.00")
            sub.current_period_start = now - timedelta(days=14)
            sub.current_period_end = now + timedelta(days=16)
        await db.commit()
        print("Platform Subscription configured:", sub.id, sub.amount, sub.status)

        # 3. Add PlatformPaymentEvent for invoice reconciliation
        event_stmt = select(PlatformPaymentEvent).where(PlatformPaymentEvent.provider_event_id == "pay_growth_inv_001")
        event = (await db.execute(event_stmt)).scalar_one_or_none()
        if not event:
            event = PlatformPaymentEvent(
                id=uuid.uuid4(),
                provider=PaymentProvider.RAZORPAY,
                provider_event_id="pay_growth_inv_001",
                event_type="invoice.paid",
                payload={
                    "invoice_id": "INV-2026-001",
                    "agency_id": str(agency_id),
                    "agency_name": "Creo Digital",
                    "plan": "Growth",
                    "amount_cents": 599900,
                    "currency": "INR",
                    "paid_at": (now - timedelta(days=14)).isoformat(),
                    "customer_email": "admin@creo.agency",
                },
                signature_valid=True,
                processed_at=now - timedelta(days=14),
                received_at=now - timedelta(days=14),
            )
            db.add(event)
            await db.commit()
            print("Platform Payment Event created:", event.provider_event_id)

        # 4. Add initial PlatformSetting records
        for key, val in [
            ("general", {"platform_name": "Creo", "platform_url": "https://creo.agency", "support_email": "superadmin@creo.agency", "timezone": "Asia/Kolkata (IST)"}),
            ("email", {"smtp_host": "smtp.resend.com", "from_email": "noreply@creo.agency", "dunning_days": 7}),
            ("feature_flags", {
                "ff_ai_brand_dna": True,
                "ff_white_label": True,
                "ff_sso": False,
                "ff_api_access": True,
                "ff_razorpay_route": True
            }),
        ]:
            ps_stmt = select(PlatformSetting).where(PlatformSetting.key == key)
            ps = (await db.execute(ps_stmt)).scalar_one_or_none()
            if not ps:
                ps = PlatformSetting(id=uuid.uuid4(), key=key, value=val)
                db.add(ps)
            else:
                ps.value = val
        await db.commit()
        print("Platform settings seeded.")

        # 5. Add initial AuditLog records
        superadmin = (await db.execute(select(User).where(User.email == 'superadmin@creo.agency'))).scalar_one_or_none()
        actor_id = superadmin.id if superadmin else None
        audit = AuditLog(
            actor_id=actor_id,
            actor_role=UserRole.SUPER_ADMIN,
            entity="agency",
            entity_id=agency_id,
            action="agency.activated_growth_plan",
            created_at=now - timedelta(days=14),
        )
        db.add(audit)
        await db.commit()
        print("Audit log seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed())
