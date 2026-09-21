import asyncio
import json
import logging
from collections.abc import AsyncIterator
from datetime import datetime
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from postgrest.exceptions import APIError
from pydantic_ai import AgentRunResultEvent, AgentStreamEvent
from pydantic_ai.messages import (
    ModelMessagesTypeAdapter,
    PartDeltaEvent,
    PartStartEvent,
    TextPart,
    TextPartDelta,
)

from tomo.account.service import AccountService, account_service
from tomo.chat.deps import ChatDeps, LeaveDrafts
from tomo.chat.orchestrator import momo
from tomo.chat.schemas import (
    ChatRequestSchema,
    ConversationSchema,
    ConversationSummarySchema,
)
from tomo.chat.status import THINKING, status_for
from tomo.chat.stream import ChatStream
from tomo.chat.transcript import preview_title, to_transcript
from tomo.context import AuthContext
from tomo.core.config import APP_TIME_ZONE
from tomo.leave.service import LeaveService, leave_service
from tomo.timesheet.service import TimesheetService, timesheet_service

logger = logging.getLogger(__name__)

_CHAT_CONVERSATIONS = "chat_conversations"


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _today_start() -> datetime:
    return datetime.now(APP_TIME_ZONE).replace(
        hour=0, minute=0, second=0, microsecond=0
    )


def _text_delta(event: AgentStreamEvent) -> str | None:
    """The reply text this event carries, if any."""

    if isinstance(event, PartStartEvent) and isinstance(event.part, TextPart):
        return event.part.content or None
    if isinstance(event, PartDeltaEvent) and isinstance(event.delta, TextPartDelta):
        return event.delta.content_delta or None
    return None


class ChatService:
    def __init__(
        self,
        timesheet_service: TimesheetService,
        account_service: AccountService,
        leave_service: LeaveService,
    ):
        self._timesheet_service = timesheet_service
        self._account_service = account_service
        self._leave_service = leave_service

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

    async def _run(
        self,
        payload: ChatRequestSchema,
        deps: ChatDeps,
        history,
        conversation_id: UUID,
    ) -> None:
        """Run Momo, pushing its status and reply into deps.stream."""

        try:
            async with momo.run_stream_events(
                payload.message,
                deps=deps,
                message_history=history,
            ) as events:
                async for event in events:
                    if isinstance(event, AgentRunResultEvent):
                        await self._save_history(
                            conversation_id,
                            deps.auth_context,
                            event.result.all_messages(),
                        )
                        continue

                    delta = _text_delta(event)
                    if delta is not None:
                        deps.stream.text(delta)
                        continue

                    label = status_for(event)
                    if label is not None:
                        deps.stream.status(label)
        finally:
            deps.stream.close()

    async def stream(
        self, payload: ChatRequestSchema, auth_context: AuthContext
    ) -> AsyncIterator[str]:
        """Chat with the user and stream the response"""

        conversation_id = payload.conversation_id or uuid4()
        history = await self._load_history(
            conversation_id,
            auth_context,
            must_exist=payload.conversation_id is not None,
        )

        stream = ChatStream()
        deps = ChatDeps(
            auth_context=auth_context,
            timesheet_service=self._timesheet_service,
            account_service=self._account_service,
            leave_service=self._leave_service,
            leave_drafts=LeaveDrafts(),
            stream=stream,
        )
        yield _sse({"type": "conversation", "id": str(conversation_id)})
        stream.status(THINKING)

        run = asyncio.create_task(self._run(payload, deps, history, conversation_id))
        try:
            async for event in stream.drain():
                yield _sse(event)
            await run
        except Exception:
            logger.exception("Failed to chat with the user.")
            yield _sse({"type": "error", "detail": "Failed to chat with the user."})
            return
        finally:
            run.cancel()

        for draft in deps.leave_drafts.items:
            yield _sse({"type": "leave_draft", **draft})

        yield _sse({"type": "done"})

    async def get_latest_conversation(
        self, auth_context: AuthContext
    ) -> ConversationSchema | None:
        """Return today's most recent conversation, or None if there is no conversation today."""

        try:
            response = (
                await auth_context.client.from_(_CHAT_CONVERSATIONS)
                .select("id, messages, updated_at")
                .eq("user_id", auth_context.current_user_id)
                .gte("updated_at", _today_start().isoformat())
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to load latest conversation: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to load latest conversation",
            )

        if not response.data:
            return None

        row = response.data[0]
        history = ModelMessagesTypeAdapter.validate_python(row["messages"])
        return ConversationSchema(
            id=row["id"], messages=to_transcript(history), updated_at=row["updated_at"]
        )

    async def list_conversations(
        self, auth_context: AuthContext
    ) -> list[ConversationSummarySchema]:
        """Return the last 10 conversation of the user"""

        try:
            response = (
                await auth_context.client.from_(_CHAT_CONVERSATIONS)
                .select("id, messages, updated_at")
                .eq("user_id", auth_context.current_user_id)
                .order("updated_at", desc=True)
                .limit(10)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to list conversations: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to list conversations",
            )

        summaries: list[ConversationSummarySchema] = []
        for row in response.data:
            history = ModelMessagesTypeAdapter.validate_python(row["messages"])
            summaries.append(
                ConversationSummarySchema(
                    id=row["id"],
                    title=preview_title(history),
                    updated_at=row["updated_at"],
                )
            )

        return summaries

    async def get_conversation(
        self, conversation_id: UUID, auth_context: AuthContext
    ) -> ConversationSchema:
        """Return a conversation by its ID"""

        try:
            response = (
                await auth_context.client.from_(_CHAT_CONVERSATIONS)
                .select("id, messages, updated_at")
                .eq("id", str(conversation_id))
                .eq("user_id", auth_context.current_user_id)
                .limit(1)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to get conversation: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get conversation",
            )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )

        row = response.data[0]
        history = ModelMessagesTypeAdapter.validate_python(row["messages"])
        return ConversationSchema(
            id=row["id"], messages=to_transcript(history), updated_at=row["updated_at"]
        )


chat_service = ChatService(timesheet_service, account_service, leave_service)
