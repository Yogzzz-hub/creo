"""Client-owned Instagram connection routes; Meta callback is separate from Creo login."""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.services import instagram_connection as service

router = APIRouter(prefix="/portal/integrations/instagram", tags=["Instagram"])


class CallbackBody(BaseModel):
    state: str = Field(min_length=20, max_length=200)
    verifier: str = Field(min_length=20, max_length=200)
    code: str | None = Field(default=None, max_length=4000)
    denied: bool = False


class SelectBody(BaseModel):
    selection_id: uuid.UUID
    account_id: str = Field(pattern=r"^\d+$", max_length=255)


@router.get("")
async def connection_status(
    actor: Actor = Depends(get_current_actor), db: AsyncSession = Depends(get_db)
):
    _, profile = await service.owner(db, actor)
    return service.public_status(profile)


@router.post("/connect")
async def connect(
    provider: Literal["facebook", "instagram"] = "facebook",
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    return await service.start(db, actor, provider)


@router.post("/callback")
async def callback(
    body: CallbackBody,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    return await service.callback(db, actor, **body.model_dump())


@router.post("/select")
async def select_account(
    body: SelectBody, actor: Actor = Depends(get_current_actor), db: AsyncSession = Depends(get_db)
):
    return await service.select_account(db, actor, body.selection_id, body.account_id)


@router.post("/verify")
async def verify(actor: Actor = Depends(get_current_actor), db: AsyncSession = Depends(get_db)):
    _, profile = await service.owner(db, actor)
    return await service.verify(db, profile)


@router.delete("")
async def disconnect(actor: Actor = Depends(get_current_actor), db: AsyncSession = Depends(get_db)):
    return await service.disconnect(db, actor)
