import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.core.rbac import Actor
from app.models.enums import UserRole
from app.routers.admin import (
    AdminDeliverableCreate,
    approve_leave_request,
    reject_leave_request,
    complete_admin_addon_request,
    create_admin_deliverable,
    get_admin_sales,
)


def rows(values):
    return SimpleNamespace(all=lambda: values, scalars=lambda: SimpleNamespace(all=lambda: values))


@pytest.mark.asyncio
async def test_empty_sales_database_has_no_demo_plans_or_deals():
    db = SimpleNamespace(execute=AsyncMock(side_effect=[rows([]), rows([]), rows([])]))
    result = await get_admin_sales(db=db, actor=Actor(user_id=uuid.uuid4(), role=UserRole.ADMIN))
    assert result == {"plans": [], "custom_pricing_requests": []}


@pytest.mark.asyncio
async def test_sales_uses_actual_plan_id_price_and_zero_subscribers():
    plan = SimpleNamespace(id=uuid.uuid4(), name="custom", display_name="Actual plan", price_minor=1234500, scarcity_slots=None)
    db = SimpleNamespace(execute=AsyncMock(side_effect=[rows([]), rows([plan]), rows([])]))
    result = await get_admin_sales(db=db, actor=Actor(user_id=uuid.uuid4(), role=UserRole.ADMIN))
    assert result["plans"][0] == {"id": str(plan.id), "name": "custom", "display_name": "Actual plan", "monthly_price": 12345, "active_subs": 0, "scarcity_slots": None}


@pytest.mark.asyncio
@pytest.mark.parametrize("handler", [approve_leave_request, reject_leave_request])
@pytest.mark.parametrize("leave_id", ["demo-leave", str(uuid.uuid4())])
async def test_missing_leave_cannot_report_success(handler, leave_id):
    db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(first=lambda: None)), commit=AsyncMock())
    with pytest.raises(HTTPException) as error:
        await handler(leave_id, db=db, actor=Actor(user_id=uuid.uuid4(), role=UserRole.ADMIN))
    assert error.value.status_code == 404
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_unconfigured_addon_fulfillment_does_not_claim_completion():
    with pytest.raises(HTTPException) as error:
        await complete_admin_addon_request("addon-shoot-day", actor=Actor(user_id=uuid.uuid4(), role=UserRole.ADMIN))
    assert error.value.status_code == 501


@pytest.mark.asyncio
async def test_deliverable_requires_actual_media_instead_of_stock_photo():
    client_id = uuid.uuid4()
    db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(id=client_id)), commit=AsyncMock())
    with pytest.raises(HTTPException) as error:
        await create_admin_deliverable(AdminDeliverableCreate(client_id=client_id), db=db, actor=Actor(user_id=uuid.uuid4(), role=UserRole.ADMIN))
    assert error.value.status_code == 422
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_upload_cannot_link_a_task_from_a_different_client():
    client_id = uuid.uuid4()
    db = SimpleNamespace(get=AsyncMock(side_effect=[SimpleNamespace(id=client_id), SimpleNamespace(client_id=uuid.uuid4())]), commit=AsyncMock())
    with pytest.raises(HTTPException) as error:
        await create_admin_deliverable(AdminDeliverableCreate(client_id=client_id, task_id=uuid.uuid4(), file_url="/static/upload.mp4"), db=db, actor=Actor(user_id=uuid.uuid4(), role=UserRole.ADMIN))
    assert error.value.status_code == 422
    db.commit.assert_not_awaited()
