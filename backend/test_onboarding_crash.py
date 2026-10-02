import asyncio
import uuid
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.services.onboarding_service import complete_onboarding

async def main():
    async with AsyncSessionLocal() as db:
        # Fetch client who is almost done onboarding
        result = await db.execute(select(User).where(User.email.like('%stage5%')).limit(1))
        client = result.scalar_one_or_none()
        if not client:
            print("No stage 5 client found")
            return
            
        # Ensure terms are accepted
        from app.models.user import ClientProfile
        profile_res = await db.execute(select(ClientProfile).where(ClientProfile.user_id == client.id))
        profile = profile_res.scalar_one_or_none()
        from datetime import datetime, timezone
        profile.terms_accepted_at = datetime.now(timezone.utc)
        
        # Ensure questionnaire
        from app.models.questionnaire import Questionnaire
        q_res = await db.execute(select(Questionnaire).where(Questionnaire.user_id == client.id))
        quest = q_res.scalar_one_or_none()
        quest.section_a = {"brand_name": "x"}
        quest.section_b = {"ideal_customer": "x"}
        quest.section_c = {"voice_words": "x"}
        quest.section_d = {"colours": "x"}
        quest.section_e = {"shoot_locations": "x"}
        quest.core_completed_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        print(f"Completing onboarding for client {client.id} ({client.email})")
        try:
            await complete_onboarding(db, client.id)
            print("Successfully completed onboarding!")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
