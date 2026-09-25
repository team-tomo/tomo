from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UpdateProfileSchema(BaseModel):
    full_name: str
    username: str | None = None
    bio: str | None = None
    job_title: str | None = None
    phone: str | None = None
    manager_id: UUID | None = None


class ManagerSchema(BaseModel):
    id: UUID
    full_name: str | None = None
    username: str | None = None
    role: str
    job_title: str | None = None


class ProfileListItemSchema(BaseModel):
    id: UUID
    full_name: str
    username: str | None = None
    email: str
    avatar_url: str | None = None
    role: str
    is_active: bool
    manager_id: UUID | None = None
    created_at: datetime


class ReassignManagerSchema(BaseModel):
    manager_id: UUID


class DisableAccountSchema(BaseModel):
    disable_account: bool
