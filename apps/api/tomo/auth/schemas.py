from pydantic import BaseModel, EmailStr


class CreateDevAccountSchema(BaseModel):
    email: EmailStr
    password: str


class CreateAccountSchema(CreateDevAccountSchema):
    full_name: str
    invitation_code: str


class CreateInviteCodeSchema(BaseModel):
    code: str
    role: str
