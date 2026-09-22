import asyncio
from datetime import datetime
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from pydantic_ai.messages import (
    ModelMessagesTypeAdapter,
    ModelRequest,
    ModelResponse,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)
from tomo.chat.service import chat_service
from tomo.context import AuthContext
from tomo.dependencies import get_auth_context
from tomo.main import app

from tests.conftest import OTHER_USER_ID, USER_ID
from tests.fakes.chat_db import ChatTable, FakeChatClient

MANILA = ZoneInfo("Asia/Manila")
LIST = "/api/v1/chat"
LATEST = "/api/v1/chat/latest"
MIDDAY = datetime(2026, 9, 13, 15, 0, tzinfo=MANILA)
YESTERDAY = datetime(2026, 9, 12, 15, 0, tzinfo=MANILA)
EARLIER_TODAY = datetime(2026, 9, 13, 10, 0, tzinfo=MANILA)


def _dump(*messages) -> list:
    return ModelMessagesTypeAdapter.dump_python(list(messages), mode="json")


def _thread(prompt: str, reply: str, *, with_tool: bool = False) -> list:
    messages = [ModelRequest(parts=[UserPromptPart(content=prompt)])]
    if with_tool:
        messages.append(
            ModelResponse(parts=[ToolCallPart(tool_name="get_today_status", args={})])
        )
        messages.append(
            ModelRequest(
                parts=[
                    ToolReturnPart(
                        tool_name="get_today_status",
                        content="ok",
                        tool_call_id="call-1",
                    )
                ]
            )
        )
    messages.append(ModelResponse(parts=[TextPart(content=reply)]))
    return _dump(*messages)


@pytest.fixture
def chat_table() -> ChatTable:
    return ChatTable()


@pytest.fixture
def chat_api(chat_table: ChatTable):
    async def _auth_context() -> AuthContext:
        return AuthContext(
            client=FakeChatClient(chat_table),
            current_user_id=USER_ID,
            token="test-token",
        )

    app.dependency_overrides[get_auth_context] = _auth_context
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def freeze_now(monkeypatch):
    def _freeze(when: datetime) -> datetime:
        class FrozenDateTime(datetime):
            @classmethod
            def now(cls, tz=None):
                return when.astimezone(tz) if tz is not None else when

        monkeypatch.setattr("tomo.chat.service.datetime", FrozenDateTime)
        return when

    return _freeze


class TestUnauthenticated:
    def test_list_requires_auth(self) -> None:
        response = TestClient(app).get(LIST)
        assert response.status_code == 401

    def test_latest_requires_auth(self) -> None:
        response = TestClient(app).get(LATEST)
        assert response.status_code == 401

    def test_get_requires_auth(self) -> None:
        response = TestClient(app).get(f"{LIST}/{uuid4()}")
        assert response.status_code == 401

    def test_update_leave_draft_requires_auth(self) -> None:
        response = TestClient(app).patch(
            f"{LIST}/{uuid4()}/leave-drafts",
            json={"id": "1:0", "status": "filed"},
        )
        assert response.status_code == 401


class TestListConversations:
    def test_empty_list_is_ok(self, chat_api) -> None:
        response = chat_api.get(LIST)

        assert response.status_code == 200
        assert response.json() == []

    def test_returns_newest_first_without_other_users(
        self, chat_api, chat_table
    ) -> None:
        older = chat_table.seed(
            user_id=USER_ID,
            messages=_thread("older", "ok"),
            updated_at=YESTERDAY.isoformat(),
        )
        newer = chat_table.seed(
            user_id=USER_ID,
            messages=_thread("newer", "ok"),
            updated_at=MIDDAY.isoformat(),
        )
        chat_table.seed(
            user_id=OTHER_USER_ID,
            messages=_thread("not mine", "ok"),
            updated_at=MIDDAY.isoformat(),
        )

        response = chat_api.get(LIST)

        assert response.status_code == 200
        body = response.json()
        assert [row["id"] for row in body] == [newer["id"], older["id"]]
        assert [row["title"] for row in body] == ["newer", "older"]

    def test_caps_at_ten(self, chat_api, chat_table) -> None:
        ids: list[str] = []
        for index in range(11):
            seeded = chat_table.seed(
                user_id=USER_ID,
                messages=_thread(f"chat {index}", "ok"),
                updated_at=datetime(2026, 9, 13, 10, index, tzinfo=MANILA).isoformat(),
            )
            ids.append(seeded["id"])

        response = chat_api.get(LIST)

        assert response.status_code == 200
        assert [row["id"] for row in response.json()] == list(reversed(ids[1:]))


class TestLatestConversation:
    def test_none_when_empty(self, chat_api, freeze_now) -> None:
        freeze_now(MIDDAY)

        response = chat_api.get(LATEST)

        assert response.status_code == 200
        assert response.json() is None

    def test_ignores_yesterday(self, chat_api, chat_table, freeze_now) -> None:
        freeze_now(MIDDAY)
        chat_table.seed(
            user_id=USER_ID,
            messages=_thread("yesterday", "ok"),
            updated_at=YESTERDAY.isoformat(),
        )

        response = chat_api.get(LATEST)

        assert response.status_code == 200
        assert response.json() is None

    def test_returns_todays_newest_without_tool_parts(
        self, chat_api, chat_table, freeze_now
    ) -> None:
        freeze_now(MIDDAY)
        chat_table.seed(
            user_id=USER_ID,
            messages=_thread("earlier", "ok"),
            updated_at=EARLIER_TODAY.isoformat(),
        )
        latest = chat_table.seed(
            user_id=USER_ID,
            messages=_thread("today status", "You can clock out.", with_tool=True),
            updated_at=MIDDAY.isoformat(),
        )

        response = chat_api.get(LATEST)

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == latest["id"]
        assert [(item["role"], item["text"]) for item in body["messages"]] == [
            ("user", "today status"),
            ("assistant", "You can clock out."),
        ]


class TestGetConversation:
    def test_returns_saved_leave_draft_from_a_delegation(
        self, chat_api, chat_table
    ) -> None:
        row = chat_table.seed(
            user_id=USER_ID,
            messages=_dump(
                ModelRequest(parts=[UserPromptPart(content="File sick leave")]),
                ModelResponse(
                    parts=[
                        ToolCallPart(
                            tool_name="delegate_task",
                            args={"agent_name": "Kyu", "task": "draft sick leave"},
                            tool_call_id="call-1",
                        )
                    ]
                ),
                ModelRequest(
                    parts=[
                        ToolReturnPart(
                            tool_name="delegate_task",
                            content="I prepared a draft.",
                            tool_call_id="call-1",
                        )
                    ]
                ),
                ModelResponse(parts=[TextPart(content="Here is the draft.")]),
            ),
            leave_drafts=[
                {
                    "message_index": 3,
                    "drafts": [
                        {
                            "date": "2026-09-21",
                            "leave_type": "sl",
                            "coverage": "whole",
                            "reason": "Fever",
                        }
                    ],
                }
            ],
            updated_at=MIDDAY.isoformat(),
        )

        response = chat_api.get(f"{LIST}/{row['id']}")

        assert response.status_code == 200
        assistant = response.json()["messages"][1]
        assert assistant["text"] == "Here is the draft."
        assert assistant["leave_drafts"] == [
            {
                "id": "3:0",
                "date": "2026-09-21",
                "leave_type": "sl",
                "coverage": "whole",
                "reason": "Fever",
                "status": "pending",
            }
        ]

    def test_returns_leave_draft_with_the_reply(self, chat_api, chat_table) -> None:
        row = chat_table.seed(
            user_id=USER_ID,
            messages=_dump(
                ModelRequest(parts=[UserPromptPart(content="File VL Friday")]),
                ModelResponse(
                    parts=[
                        ToolCallPart(
                            tool_name="propose_leave",
                            args={},
                            tool_call_id="call-1",
                        )
                    ]
                ),
                ModelRequest(
                    parts=[
                        ToolReturnPart(
                            tool_name="propose_leave",
                            content={
                                "ok": True,
                                "date": "2026-09-25",
                                "leave_type": "vl",
                                "coverage": "whole",
                                "reason": "Trip",
                            },
                            tool_call_id="call-1",
                        )
                    ]
                ),
                ModelResponse(parts=[TextPart(content="Here is the draft.")]),
            ),
            updated_at=MIDDAY.isoformat(),
        )

        response = chat_api.get(f"{LIST}/{row['id']}")

        assert response.status_code == 200
        assistant = response.json()["messages"][1]
        assert assistant["text"] == "Here is the draft."
        assert assistant["leave_drafts"] == [
            {
                "id": None,
                "date": "2026-09-25",
                "leave_type": "vl",
                "coverage": "whole",
                "reason": "Trip",
                "status": "pending",
            }
        ]

    def test_returns_requested_thread(self, chat_api, chat_table) -> None:
        row = chat_table.seed(
            user_id=USER_ID,
            messages=_thread("hello", "hi"),
            updated_at=MIDDAY.isoformat(),
        )

        response = chat_api.get(f"{LIST}/{row['id']}")

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == row["id"]
        assert [(item["role"], item["text"]) for item in body["messages"]] == [
            ("user", "hello"),
            ("assistant", "hi"),
        ]

    def test_later_turn_keeps_the_earlier_saved_draft(
        self, chat_api, chat_table
    ) -> None:
        first = [
            ModelRequest(parts=[UserPromptPart(content="File sick leave")]),
            ModelResponse(parts=[TextPart(content="Here is the draft.")]),
        ]
        row = chat_table.seed(
            user_id=USER_ID,
            messages=_dump(*first),
            leave_drafts=[
                {
                    "message_index": 1,
                    "drafts": [
                        {
                            "date": "2026-09-21",
                            "leave_type": "sl",
                            "coverage": "whole",
                            "reason": "Fever",
                        }
                    ],
                }
            ],
            updated_at=MIDDAY.isoformat(),
        )
        later = [
            *first,
            ModelRequest(parts=[UserPromptPart(content="And Friday")]),
            ModelResponse(parts=[TextPart(content="Second draft.")]),
        ]

        async def save() -> None:
            auth_context = AuthContext(
                client=FakeChatClient(chat_table),
                current_user_id=USER_ID,
                token="test-token",
            )
            await chat_service._save_history(
                UUID(row["id"]),
                auth_context,
                later,
                [
                    {
                        "date": "2026-09-25",
                        "leave_type": "vl",
                        "coverage": "whole",
                        "reason": "Trip",
                    }
                ],
            )

        asyncio.run(save())

        response = chat_api.get(f"{LIST}/{row['id']}")

        assert response.status_code == 200
        drafts = [
            message["leave_drafts"]
            for message in response.json()["messages"]
            if message["role"] == "assistant"
        ]
        assert drafts == [
            [
                {
                    "id": "1:0",
                    "date": "2026-09-21",
                    "leave_type": "sl",
                    "coverage": "whole",
                    "reason": "Fever",
                    "status": "pending",
                }
            ],
            [
                {
                    "id": "3:0",
                    "date": "2026-09-25",
                    "leave_type": "vl",
                    "coverage": "whole",
                    "reason": "Trip",
                    "status": "pending",
                }
            ],
        ]

    def test_missing_id_is_not_found(self, chat_api) -> None:
        response = chat_api.get(f"{LIST}/{uuid4()}")

        assert response.status_code == 404
        assert response.json()["detail"] == "Conversation not found"

    def test_other_users_thread_is_not_found(self, chat_api, chat_table) -> None:
        row = chat_table.seed(
            user_id=OTHER_USER_ID,
            messages=_thread("secret", "nope"),
            updated_at=MIDDAY.isoformat(),
        )

        response = chat_api.get(f"{LIST}/{row['id']}")

        assert response.status_code == 404
        assert response.json()["detail"] == "Conversation not found"


class TestUpdateLeaveDraft:
    def _seed(self, chat_table: ChatTable) -> dict:
        return chat_table.seed(
            user_id=USER_ID,
            messages=_dump(
                ModelRequest(parts=[UserPromptPart(content="File sick leave")]),
                ModelResponse(parts=[TextPart(content="Here is the draft.")]),
            ),
            leave_drafts=[
                {
                    "message_index": 1,
                    "drafts": [
                        {
                            "date": "2026-09-21",
                            "leave_type": "sl",
                            "coverage": "whole",
                            "reason": "Fever",
                        }
                    ],
                }
            ],
            updated_at=MIDDAY.isoformat(),
        )

    def test_filed_status_is_still_there_when_reopened(
        self, chat_api, chat_table
    ) -> None:
        row = self._seed(chat_table)

        updated = chat_api.patch(
            f"{LIST}/{row['id']}/leave-drafts",
            json={"id": "1:0", "status": "filed"},
        )
        loaded = chat_api.get(f"{LIST}/{row['id']}")

        assert updated.status_code == 204
        assert loaded.json()["messages"][1]["leave_drafts"][0]["status"] == "filed"

    def test_cancelled_status_is_still_there_when_reopened(
        self, chat_api, chat_table
    ) -> None:
        row = self._seed(chat_table)

        updated = chat_api.patch(
            f"{LIST}/{row['id']}/leave-drafts",
            json={"id": "1:0", "status": "cancelled"},
        )
        loaded = chat_api.get(f"{LIST}/{row['id']}")

        assert updated.status_code == 204
        draft = loaded.json()["messages"][1]["leave_drafts"][0]
        assert draft["status"] == "cancelled"
        assert draft["reason"] == "Fever"

    def test_unknown_draft_is_not_found(self, chat_api, chat_table) -> None:
        row = self._seed(chat_table)

        response = chat_api.patch(
            f"{LIST}/{row['id']}/leave-drafts",
            json={"id": "9:0", "status": "filed"},
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Leave draft not found"

    def test_other_users_draft_is_not_found(self, chat_api, chat_table) -> None:
        row = chat_table.seed(
            user_id=OTHER_USER_ID,
            messages=_thread("secret", "nope"),
            leave_drafts=[
                {
                    "message_index": 1,
                    "drafts": [
                        {
                            "date": "2026-09-21",
                            "leave_type": "sl",
                            "coverage": "whole",
                            "reason": "Fever",
                        }
                    ],
                }
            ],
            updated_at=MIDDAY.isoformat(),
        )

        response = chat_api.patch(
            f"{LIST}/{row['id']}/leave-drafts",
            json={"id": "1:0", "status": "cancelled"},
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Conversation not found"
