import logging

from fastapi import HTTPException, status

from tomo.account.service import AccountService, account_service
from tomo.chat.deps import ChatDeps
from tomo.chat.orchestrator import toki
from tomo.chat.schemas import ChatRequestSchema, ChatResponseSchema
from tomo.context import AuthContext
from tomo.timesheet.service import TimesheetService, timesheet_service

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(
        self, timesheet_service: TimesheetService, account_service: AccountService
    ):
        self._timesheet_service = timesheet_service
        self._account_service = account_service

    async def chat(
        self, payload: ChatRequestSchema, auth_context: AuthContext
    ) -> ChatResponseSchema:
        """Chat with the user."""

        deps = ChatDeps(
            auth_context=auth_context,
            timesheet_service=self._timesheet_service,
            account_service=self._account_service,
        )

        try:
            result = await toki.run(payload.message, deps=deps)
        except Exception:
            logger.exception("Failed to chat with the user.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to chat with the user.",
            )

        return ChatResponseSchema(message=str(result.output))


chat_service = ChatService(timesheet_service, account_service)
