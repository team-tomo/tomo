from uuid import UUID

from pydantic import BaseModel, Field


class ChatRequestSchema(BaseModel):
    message: str = Field(
        min_length=1,
    )
    conversation_id: UUID
