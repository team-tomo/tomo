from pydantic import BaseModel


class UpdateProfileSchema(BaseModel):
    full_name: str
    username: str | None = None
    bio: str | None = None
    job_title: str | None = None
    phone: str | None = None


class DisableAccountSchema(BaseModel):
    disable_account: bool
