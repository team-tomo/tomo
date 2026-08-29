from pydantic import BaseModel, EmailStr


class CreateDevAccountSchema(BaseModel):
    email: EmailStr
    password: str


class CreateAccountSchema(CreateDevAccountSchema):
    invite_code: str


class CreateInviteCodeSchema(BaseModel):
    invite_code: str
    role: str
