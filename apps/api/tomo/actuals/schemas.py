from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ActualInputSchema(BaseModel):
    date: date
    description: str
    hours: Decimal = Field(gt=0)

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Description cannot be empty")
        return stripped


class ActualSchema(BaseModel):
    id: UUID
    user_id: UUID
    date: date
    description: str
    hours: Decimal
    created_at: datetime
    updated_at: datetime
