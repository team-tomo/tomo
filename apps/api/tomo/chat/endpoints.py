from fastapi import APIRouter, Request

from tomo.chat.schemas import ChatRequestSchema
from tomo.core.rate_limiter import limiter

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/")
@limiter.limit("20/minute")
async def chat(request: Request, payload: ChatRequestSchema):
    return {"message": "Hello, world!"}
