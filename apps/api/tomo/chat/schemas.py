from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from tomo.leave.schemas import LeaveCoverage, LeaveType


class ChatRequestSchema(BaseModel):
    message: str = Field(
        min_length=1,
    )
    conversation_id: UUID | None = None


class LeaveDraftSchema(BaseModel):
    id: str | None = None
    date: date
    leave_type: LeaveType
    coverage: LeaveCoverage
    reason: str
    status: Literal["pending", "filed", "cancelled"] = "pending"


class UpdateLeaveDraftSchema(BaseModel):
    id: str = Field(min_length=1)
    status: Literal["filed", "cancelled"]


class ChatMessageSchema(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    text: str
    leave_drafts: list[LeaveDraftSchema] = Field(default_factory=list)


class ConversationSchema(BaseModel):
    id: UUID
    messages: list[ChatMessageSchema]
    updated_at: datetime


class ConversationSummarySchema(BaseModel):
    id: UUID
    title: str
    updated_at: datetime
