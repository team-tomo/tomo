from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from tomo.chat.schemas import ChatRequestSchema, ConversationSchema
from tomo.core.rate_limiter import limiter
from tomo.dependencies import AuthContextDependency, ChatServiceDependency

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("")
@limiter.limit("20/minute")
async def chat(
    request: Request,
    payload: ChatRequestSchema,
    auth_context: AuthContextDependency,
    service: ChatServiceDependency,
):
    """Chat with the AI assistant."""
    return StreamingResponse(
        service.stream(payload, auth_context), media_type="text/event-stream"
    )


@router.get("/latest")
@limiter.limit("20/minute")
async def get_latest_conversation(
    request: Request,
    auth_context: AuthContextDependency,
    service: ChatServiceDependency,
) -> ConversationSchema | None:
    """Get the latest conversation for the current user."""
    return await service.get_latest_conversation(auth_context)
