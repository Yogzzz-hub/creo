from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from models.enums import DeliverableStatus


class DeliverableBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: str
    client_id: str
    submitted_by: str
    file_url: str
    file_type: str
    file_size_bytes: int
    status: DeliverableStatus = DeliverableStatus.pending_approval
    revision_round: int = 1
    parent_deliverable_id: Optional[str] = None


class DeliverableCreate(BaseModel):
    task_id: str
    client_id: str
    submitted_by: str
    file_url: str
    file_type: str
    file_size_bytes: int
    revision_round: int = 1
    parent_deliverable_id: Optional[str] = None


class DeliverableUpdate(BaseModel):
    status: Optional[DeliverableStatus] = None
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    instagram_published_at: Optional[datetime] = None
    instagram_post_id: Optional[str] = None


class DeliverableOut(DeliverableBase):
    id: str
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    instagram_published_at: Optional[datetime] = None
    instagram_post_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class TaskSubmitRequest(BaseModel):
    file_url: str = Field(..., max_length=2048)
    file_type: str = Field(..., max_length=127)
    file_size_bytes: int = Field(..., ge=1)


class DownloadResponse(BaseModel):
    download_url: str
    expires_in: int = 3600


class DeliverableCommentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    deliverable_id: str
    author_id: str
    comment_text: str = Field(..., max_length=2000)


class DeliverableCommentCreate(BaseModel):
    comment_text: str = Field(..., max_length=2000)


class DeliverableCommentOut(DeliverableCommentBase):
    id: str
    created_at: datetime
