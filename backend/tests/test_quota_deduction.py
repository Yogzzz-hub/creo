import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import async_session_factory
from sqlalchemy import select
from app.models.work import Deliverable, Task
from app.models.billing import UsageCounter
from app.models.enums import DeliverableStatus, DeliverableType, UserRole
from app.services.deliverable_state import transition

async def verify():
    async with async_session_factory() as db:
        client_id = uuid.UUID("63e53bb6-a349-4de6-8cfc-18767682b6ea")
        
        # 1. Check initial usage
        uc = await db.scalar(select(UsageCounter).where(UsageCounter.client_id == client_id, UsageCounter.kind == DeliverableType.REEL))
        print(f"Initial used: {uc.used}, Quota: {uc.quota}, Remaining: {uc.quota - uc.used}")
        initial_used = uc.used
        
        # 2. Create a new task & deliverable in pending_qa
        task = Task(
            client_id=client_id,
            deliverable_type=DeliverableType.REEL,
        )
        db.add(task)
        await db.flush()
        
        deliv = Deliverable(
            root_id=uuid.uuid4(),
            version=1,
            client_id=client_id,
            task_id=task.id,
            file_url="https://example.com/test_reel.mp4",
            file_type="video/mp4",
            status=DeliverableStatus.PENDING_QA,
        )
        db.add(deliv)
        await db.commit()
        await db.refresh(uc)
        print(f"After pending_qa upload - used: {uc.used}")
        assert uc.used == initial_used, f"Expected {initial_used}, got {uc.used}"
        
        # 3. Team lead approves QA -> transitions to pending_approval (SENT TO CLIENT)
        await transition(db, deliv, DeliverableStatus.PENDING_APPROVAL, actor_role=UserRole.TEAM_LEAD)
        await db.refresh(uc)
        print(f"After QA approval -> pending_approval (sent to client) - used: {uc.used}, Remaining: {uc.quota - uc.used}")
        assert uc.used == initial_used + 1, f"Expected {initial_used + 1}, got {uc.used}"
        
        # 4. Client requests revision -> transitions to revision_requested
        await transition(db, deliv, DeliverableStatus.REVISION_REQUESTED, actor_role=UserRole.CLIENT, reason="Fix color grading")
        await db.refresh(uc)
        print(f"After revision requested - used: {uc.used}")
        assert uc.used == initial_used + 1
        
        # 5. Version 2 is submitted and QA approved
        deliv_v2 = Deliverable(
            root_id=deliv.root_id,
            version=2,
            client_id=client_id,
            task_id=task.id,
            file_url="https://example.com/test_reel_v2.mp4",
            file_type="video/mp4",
            status=DeliverableStatus.PENDING_QA,
        )
        db.add(deliv_v2)
        await db.commit()
        
        await transition(db, deliv_v2, DeliverableStatus.PENDING_APPROVAL, actor_role=UserRole.TEAM_LEAD)
        await db.refresh(uc)
        print(f"After v2 QA approved - used: {uc.used} (remains unchanged because same root_id)")
        assert uc.used == initial_used + 1, f"Expected {initial_used + 1}, got {uc.used}"
        
        # Clean up test records
        await db.delete(deliv_v2)
        await db.delete(deliv)
        await db.delete(task)
        await db.commit()
        await db.refresh(uc)
        print(f"After test cleanup - used: {uc.used} (reverted back to initial)")
        assert uc.used == initial_used, f"Expected {initial_used}, got {uc.used}"
        
        print("\n>>> ALL TESTS PASSED SUCCESSFULLY! Quota reduction works perfectly! <<<")

if __name__ == "__main__":
    asyncio.run(verify())
