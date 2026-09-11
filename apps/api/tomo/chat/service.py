import logging
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from postgrest.exceptions import APIError
from pydantic_ai.messages import ModelMessagesTypeAdapter

from tomo.account.service import AccountService, account_service
from tomo.chat.deps import ChatDeps
from tomo.chat.orchestrator import toki
from tomo.chat.schemas import ChatRequestSchema, ChatResponseSchema
from tomo.context import AuthContext
from tomo.timesheet.service import TimesheetService, timesheet_service

logger = logging.getLogger(__name__)

_CHAT_CONVERSATIONS = "chat_conversations"


class ChatService:
    def __init__(
        self, timesheet_service: TimesheetService, account_service: AccountService
    ):
        self._timesheet_service = timesheet_service
        self._account_service = account_service

    async def _load_history(
        self, conversation_id: UUID, auth_context: AuthContext, *, must_exist: bool
    ):
        """Load conversation history"""

        try:
            response = (
                await auth_context.client.from_(_CHAT_CONVERSATIONS)
                .select("messages")
                .eq("id", str(conversation_id))
                .eq("user_id", auth_context.current_user_id)
                .limit(1)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to load chat history: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to load chat history",
            )

        if not response.data:
            if must_exist:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found",
                )
            return []

        return ModelMessagesTypeAdapter.validate_python(response.data[0]["messages"])

    async def _save_history(
        self, conversation_id: UUID, auth_context: AuthContext, messages
    ):
        """Save conversation history"""

        row = {
            "id": str(conversation_id),
            "user_id": auth_context.current_user_id,
            "messages": ModelMessagesTypeAdapter.dump_python(messages, mode="json"),
        }

        try:
            await auth_context.client.from_(_CHAT_CONVERSATIONS).upsert(row).execute()
        except APIError as e:
            logger.error(f"Failed to save chat history: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to save chat history",
            )

    async def chat(
        self, payload: ChatRequestSchema, auth_context: AuthContext
    ) -> ChatResponseSchema:
        """Chat with the user."""

        conversation_id = payload.conversation_id or uuid4()
        history = await self._load_history(
            conversation_id,
            auth_context,
            must_exist=payload.conversation_id is not None,
        )

        deps = ChatDeps(
            auth_context=auth_context,
            timesheet_service=self._timesheet_service,
            account_service=self._account_service,
        )

        try:
            result = await toki.run(payload.message, deps=deps, message_history=history)
        except Exception:
            logger.exception("Failed to chat with the user.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to chat with the user.",
            )

        await self._save_history(conversation_id, auth_context, result.all_messages())

        return ChatResponseSchema(
            message=str(result.output), conversation_id=conversation_id
        )


chat_service = ChatService(timesheet_service, account_service)
