from pydantic_ai.messages import (
    ModelRequest,
    ModelResponse,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)
from tomo.chat.transcript import preview_title, to_transcript


def test_to_transcript_keeps_user_and_assistant_text() -> None:
    messages = [
        ModelRequest(parts=[UserPromptPart(content="Can I clock in?")]),
        ModelResponse(parts=[TextPart(content="Yes, you can clock in.")]),
    ]

    bubbles = to_transcript(messages)

    assert [(bubble.role, bubble.text) for bubble in bubbles] == [
        ("user", "Can I clock in?"),
        ("assistant", "Yes, you can clock in."),
    ]
    assert [bubble.id for bubble in bubbles] == ["0", "1"]


def test_to_transcript_drops_tool_parts() -> None:
    messages = [
        ModelRequest(parts=[UserPromptPart(content="Status?")]),
        ModelResponse(parts=[ToolCallPart(tool_name="get_today_status", args={})]),
        ModelRequest(
            parts=[
                ToolReturnPart(
                    tool_name="get_today_status",
                    content="can clock out",
                    tool_call_id="call-1",
                )
            ]
        ),
        ModelResponse(parts=[TextPart(content="You can clock out.")]),
    ]

    bubbles = to_transcript(messages)

    assert [(bubble.role, bubble.text) for bubble in bubbles] == [
        ("user", "Status?"),
        ("assistant", "You can clock out."),
    ]


def test_to_transcript_skips_empty_text() -> None:
    messages = [
        ModelRequest(parts=[UserPromptPart(content="")]),
        ModelResponse(parts=[TextPart(content="Hello")]),
    ]

    bubbles = to_transcript(messages)

    assert [(bubble.role, bubble.text) for bubble in bubbles] == [
        ("assistant", "Hello")
    ]


def test_to_transcript_attaches_leave_draft_to_following_reply() -> None:
    messages = [
        ModelRequest(parts=[UserPromptPart(content="File VL Friday")]),
        ModelResponse(
            parts=[
                ToolCallPart(
                    tool_name="propose_leave", args={}, tool_call_id="call-1"
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
    ]

    bubbles = to_transcript(messages)

    assert [(bubble.role, bubble.text) for bubble in bubbles] == [
        ("user", "File VL Friday"),
        ("assistant", "Here is the draft."),
    ]
    assert bubbles[1].leave_drafts[0].model_dump(mode="json") == {
        "id": None,
        "date": "2026-09-25",
        "leave_type": "vl",
        "coverage": "whole",
        "reason": "Trip",
        "status": "pending",
    }


def test_to_transcript_groups_leave_drafts_on_one_reply() -> None:
    def _draft(day: str, call_id: str) -> ToolReturnPart:
        return ToolReturnPart(
            tool_name="propose_leave",
            content={
                "ok": True,
                "date": day,
                "leave_type": "vl",
                "coverage": "whole",
                "reason": "Trip",
            },
            tool_call_id=call_id,
        )

    messages = [
        ModelRequest(parts=[UserPromptPart(content="Three days")]),
        ModelRequest(parts=[_draft("2026-09-23", "call-1")]),
        ModelRequest(parts=[_draft("2026-09-24", "call-2")]),
        ModelResponse(parts=[TextPart(content="Three drafts.")]),
    ]

    bubbles = to_transcript(messages)

    assert [draft.date.isoformat() for draft in bubbles[1].leave_drafts] == [
        "2026-09-23",
        "2026-09-24",
    ]


def test_to_transcript_keeps_draft_on_reply_when_text_comes_first() -> None:
    messages = [
        ModelRequest(parts=[UserPromptPart(content="File VL Friday")]),
        ModelResponse(parts=[TextPart(content="Here is the draft.")]),
        ModelRequest(
            parts=[
                ToolReturnPart(
                    tool_name="propose_leave",
                    content={
                        "ok": True,
                        "date": "2026-09-25",
                        "leave_type": "sl",
                        "coverage": "half",
                        "reason": "Checkup",
                    },
                    tool_call_id="call-1",
                )
            ]
        ),
        ModelRequest(parts=[UserPromptPart(content="Thanks")]),
    ]

    bubbles = to_transcript(messages)

    assert bubbles[1].leave_drafts[0].leave_type == "sl"
    assert bubbles[2].role == "user"
    assert bubbles[2].leave_drafts == []


def test_to_transcript_skips_failed_leave_draft() -> None:
    messages = [
        ModelRequest(parts=[UserPromptPart(content="File yesterday")]),
        ModelRequest(
            parts=[
                ToolReturnPart(
                    tool_name="propose_leave",
                    content={"ok": False, "error": "Date cannot be earlier than yesterday"},
                    tool_call_id="call-1",
                )
            ]
        ),
        ModelResponse(parts=[TextPart(content="That date is too early.")]),
    ]

    bubbles = to_transcript(messages)

    assert bubbles[1].leave_drafts == []


def test_preview_title_uses_first_user_bubble() -> None:
    messages = [
        ModelRequest(parts=[UserPromptPart(content="  clock in?  ")]),
        ModelResponse(parts=[TextPart(content="Yes.")]),
        ModelRequest(parts=[UserPromptPart(content="and out?")]),
    ]

    assert preview_title(messages) == "clock in?"


def test_preview_title_truncates_long_user_text() -> None:
    messages = [ModelRequest(parts=[UserPromptPart(content="a" * 70)])]

    assert preview_title(messages) == "a" * 59 + "…"


def test_preview_title_without_user_text() -> None:
    messages = [ModelResponse(parts=[TextPart(content="Hello")])]

    assert preview_title(messages) == "New conversation"
