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
