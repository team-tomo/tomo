from datetime import UTC, date, datetime, time
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from tomo.core.config import APP_TIME_ZONE


class TodayStatusResponseSchema(BaseModel):
    can_clock_in: bool
    can_clock_out: bool


class ClockOutSchema(BaseModel):
    notes: str | None = None


class AttendanceUpdateSchema(BaseModel):
    time_in: time
    time_out: time | None = None
    notes: Annotated[str, Field(max_length=200)] | None = None

    @field_validator("notes", mode="before")
    @classmethod
    def blank_notes_are_none(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class AttendanceQuerySchema(BaseModel):
    from_date: date | None = None
    to_date: date | None = None


class AttendanceSummarySchema(BaseModel):
    date: date
    status: Literal["on_time", "late", "incomplete"]


class ClockInOutResponseSchema(BaseModel):
    id: UUID
    user_id: UUID
    date: date
    time_in: datetime | None = None
    time_out: datetime | None = None
    is_late: bool
    notes: str | None = None
    # status: str | None = None
    created_at: datetime
    updated_at: datetime

    @field_validator("time_in", "time_out", "created_at", "updated_at", mode="after")
    @classmethod
    def to_app_time_zone(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(APP_TIME_ZONE)
