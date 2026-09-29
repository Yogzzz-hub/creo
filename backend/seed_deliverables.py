import asyncio
import uuid
import random
from datetime import datetime, timedelta, UTC
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.work import Deliverable
from app.models.enums import DeliverableStatus

async def seed_deliverables():
    async with AsyncSessionLocal() as db:
        # Find a client user
        result = await db.execute(select(User).where(User.role == UserRole.CLIENT))
        client = result.scalars().first()
        
        if not client:
            print("No client user found. Run the seeder to create a client first.")
            return

        agency_id = getattr(client, "agency_id", None)
        print(f"Using client: {client.email} ({client.id})")
        
        mock_data = [
            {
                "status": DeliverableStatus.PENDING_APPROVAL,
                "file_url": "https://creo-ai-dev.s3.amazonaws.com/mock/poster_v1.png",
                "file_type": "image/png",
                "revision_round": 1,
            },
            {
                "status": DeliverableStatus.APPROVED,
                "file_url": "https://creo-ai-dev.s3.amazonaws.com/mock/reel_final.mp4",
                "file_type": "video/mp4",
                "revision_round": 2,
                "approved_at": datetime.now(UTC) - timedelta(days=1)
            },
            {
                "status": DeliverableStatus.REVISION_REQUESTED,
                "file_url": "https://creo-ai-dev.s3.amazonaws.com/mock/story_v1.jpg",
                "file_type": "image/jpeg",
                "revision_round": 1,
                "rejection_comment": "Can we make the logo slightly bigger and change the background to blue?",
                "rejected_at": datetime.now(UTC) - timedelta(hours=5)
            },
            {
                "status": DeliverableStatus.PUBLISHED,
                "file_url": "https://creo-ai-dev.s3.amazonaws.com/mock/poster_published.png",
                "file_type": "image/png",
                "revision_round": 1,
                "approved_at": datetime.now(UTC) - timedelta(days=5),
            },
            {
                "status": DeliverableStatus.PENDING_APPROVAL,
                "file_url": "https://creo-ai-dev.s3.amazonaws.com/mock/social_post_v2.png",
                "file_type": "image/png",
                "revision_round": 2,
            }
        ]

        deliverables = []
        for data in mock_data:
            root_id = uuid.uuid4()
            deliverable = Deliverable(
                agency_id=agency_id,
                root_id=root_id,
                version=1,
                client_id=client.id,
                file_url=data["file_url"],
                file_type=data["file_type"],
                file_size_bytes=random.randint(500000, 5000000),
                status=data["status"],
                revision_round=data["revision_round"],
                revisions_count=data["revision_round"] - 1,
                rejection_comment=data.get("rejection_comment"),
                approved_at=data.get("approved_at"),
                rejected_at=data.get("rejected_at")
            )
            db.add(deliverable)
            deliverables.append(deliverable)
            
        await db.commit()
        print(f"Successfully seeded {len(deliverables)} mock deliverables.")

if __name__ == "__main__":
    asyncio.run(seed_deliverables())
