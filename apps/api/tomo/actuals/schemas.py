from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class ActualSchema(BaseModel):
    id: UUID
    user_id: UUID
    date: date
    description: str
    hours: str
    created_at: datetime
    updated_at: datetime


class CreateActualSchema(BaseModel):
    date: date
    description: str
    hours: str
