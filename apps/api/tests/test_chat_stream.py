import asyncio
import json
from collections.abc import AsyncIterator
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from pydantic_ai.messages import ModelMessage, ToolReturnPart
from pydantic_ai.models.function import (
    AgentInfo,
    DeltaToolCall,
    DeltaToolCalls,
    FunctionModel,
)
from tomo.chat.agents.timesheet import timesheet_agent
from tomo.chat.orchestrator import momo
from tomo.chat.schemas import ChatRequestSchema
from tomo.chat.service import chat_service
from tomo.context import AuthContext

from tests.conftest import USER_ID
from tests.fakes.chat_db import ChatTable, FakeChatClient
from tests.fakes.timesheet_db import FakeTimesheetClient, TimesheetTable

MANILA = ZoneInfo("Asia/Manila")
TODAY = datetime(2026, 9, 21, 15, 0, tzinfo=MANILA)
MOMO_REPLY = ["You clocked in at ", "8:00 AM."]
TOKI_REPLY = "Clocked in 8:00 AM."


class FakeAppClient:
    """Routes each table to the fake that owns it."""

    def __init__(self, chat: ChatTable, timesheet: TimesheetTable) -> None:
        self._chat = FakeChatClient(chat)
        self._timesheet = FakeTimesheetClient(timesheet)

    def from_(self, name: str):
        if name == "chat_conversations":
            return self._chat.from_(name)
        return self._timesheet.from_(name)


def _answered(messages: list[ModelMessage]) -> bool:
    """True once a tool result came back, so the model can reply."""

    return any(
        isinstance(part, ToolReturnPart)
        for message in messages
        for part in message.parts
    )


async def _momo_stream(
    messages: list[ModelMessage], _info: AgentInfo
) -> AsyncIterator[str | DeltaToolCalls]:
    if _answered(messages):
        for chunk in MOMO_REPLY:
            yield chunk
        return

    yield {
        0: DeltaToolCall(
            name="delegate_task",
            json_args=json.dumps({"agent_name": "Toki", "task": "attendance today"}),
            tool_call_id="call-1",
        )
    }


async def _toki_stream(
    messages: list[ModelMessage], _info: AgentInfo
) -> AsyncIterator[str | DeltaToolCalls]:
    if _answered(messages):
        yield TOKI_REPLY
        return

    yield {
        0: DeltaToolCall(
            name="get_today_status", json_args="{}", tool_call_id="call-2"
        )
    }


async def _momo_fails(
    _messages: list[ModelMessage], _info: AgentInfo
) -> AsyncIterator[str]:
    raise RuntimeError("model is down")
    yield ""


@pytest.fixture
def chat_table() -> ChatTable:
    return ChatTable()


@pytest.fixture
def fake_agents(freeze_manila):
    freeze_manila(TODAY)
    with (
        momo.override(model=FunctionModel(stream_function=_momo_stream)),
        timesheet_agent.override(model=FunctionModel(stream_function=_toki_stream)),
    ):
        yield


@pytest.fixture
def broken_model():
    with momo.override(model=FunctionModel(stream_function=_momo_fails)):
        yield


def _stream(chat_table: ChatTable, message: str) -> list[dict]:
    async def collect() -> list[dict]:
        auth_context = AuthContext(
            client=FakeAppClient(chat_table, TimesheetTable()),
            current_user_id=USER_ID,
            token="test-token",
        )
        payload = ChatRequestSchema(message=message)
        return [
            json.loads(chunk.removeprefix("data: "))
            async for chunk in chat_service.stream(payload, auth_context)
        ]

    return asyncio.run(asyncio.wait_for(collect(), timeout=5))


def _statuses(events: list[dict]) -> list[str | None]:
    return [event.get("text") for event in events if event["type"] == "status"]


def test_status_follows_momo_and_her_specialist(chat_table, fake_agents) -> None:
    events = _stream(chat_table, "was I in today?")

    assert _statuses(events) == [
        "Thinking",
        "Calling Toki",
        "Checking attendance",
        "Thinking",
        None,
    ]


def test_each_status_says_what_kind_it_is(chat_table, fake_agents) -> None:
    events = _stream(chat_table, "was I in today?")

    assert [
        (event["text"], event.get("kind"))
        for event in events
        if event["type"] == "status"
    ] == [
        ("Thinking", "thinking"),
        ("Calling Toki", "agent"),
        ("Checking attendance", "tool"),
        ("Thinking", "thinking"),
        (None, None),
    ]


def test_reply_text_still_streams(chat_table, fake_agents) -> None:
    events = _stream(chat_table, "was I in today?")

    deltas = [event["delta"] for event in events if event["type"] == "text"]
    assert "".join(deltas) == "".join(MOMO_REPLY)


def test_specialist_reply_is_not_streamed_to_the_user(chat_table, fake_agents) -> None:
    events = _stream(chat_table, "was I in today?")

    deltas = [event["delta"] for event in events if event["type"] == "text"]
    assert TOKI_REPLY not in "".join(deltas)


def test_status_clears_right_before_the_first_text(chat_table, fake_agents) -> None:
    events = _stream(chat_table, "was I in today?")

    first_text = next(
        index for index, event in enumerate(events) if event["type"] == "text"
    )
    assert events[0]["type"] == "conversation"
    assert events[first_text - 1] == {"type": "status", "text": None}
    assert events[-1] == {"type": "done"}


def test_a_failed_run_ends_in_an_error(chat_table, broken_model) -> None:
    events = _stream(chat_table, "was I in today?")

    assert events[-1] == {
        "type": "error",
        "detail": "Failed to chat with the user.",
    }
    assert chat_table.rows == []


def test_run_is_saved_with_the_delegation(chat_table, fake_agents) -> None:
    _stream(chat_table, "was I in today?")

    assert len(chat_table.rows) == 1
    saved = json.dumps(chat_table.rows[0]["messages"])
    assert "delegate_task" in saved
    assert MOMO_REPLY[-1] in saved
