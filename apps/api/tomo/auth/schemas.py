from pydantic import BaseModel, EmailStr


class CreateDevAccountSchema(BaseModel):
    email: EmailStr
    password: str


class CreateAccountSchema(CreateDevAccountSchema):
    invite_code: str
    username: str


class CreateInviteCodeSchema(BaseModel):
    code: str
    role: str
