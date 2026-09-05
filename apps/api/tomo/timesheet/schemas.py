from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TodayStatusResponseSchema(BaseModel):
    can_clock_in: bool
    can_clock_out: bool


class ClockinResponseSchema(BaseModel):
    id: UUID
    user_id: UUID
    date: datetime | None = None
    time_in: datetime | None = None
    time_out: datetime | None = None
    is_late: bool
    notes: str | None = None
    status: str | None = None
    created_at: datetime
    updated_at: datetime
