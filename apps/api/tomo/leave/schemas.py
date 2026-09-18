from datetime import UTC, date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, field_validator

from tomo.core.config import APP_TIME_ZONE

LeaveType = Literal["vl", "sl", "el", "ml", "pl"]
LeaveCoverage = Literal["whole", "half"]
LeaveStatus = Literal["pending", "approved", "rejected", "cancelled"]


class FileLeaveRequestSchema(BaseModel):
    date: date
    leave_type: LeaveType
    coverage: LeaveCoverage
    reason: str

    @field_validator("reason")
    @classmethod
    def strip_reason(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Reason cannot be empty")
        return stripped


class LeaveRequestSchema(BaseModel):
    id: UUID
    profile_id: UUID
    date: date
    leave_type: LeaveType
    coverage: LeaveCoverage
    reason: str
    status: LeaveStatus
    manager_id: UUID
    decided_by: UUID | None = None
    decided_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    @field_validator("decided_at", "created_at", "updated_at", mode="after")
    @classmethod
    def to_app_time_zone(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(APP_TIME_ZONE)
