from collections.abc import Sequence

from pydantic_ai.messages import ModelMessage, TextPart, UserPromptPart

from tomo.chat.schemas import ChatMessageSchema

_TITLE_MAX = 60


def _user_text(content: object) -> str:
    if isinstance(content, str):
        return content
    return ""


def to_transcript(messages: Sequence[ModelMessage]) -> list[ChatMessageSchema]:
    """Map stored Pydantic AI messages to ChatMessageSchema."""

    bubbles: list[ChatMessageSchema] = []

    for message in messages:
        for part in message.parts:
            if isinstance(part, UserPromptPart):
                text = _user_text(part.content)
                role = "user"
            elif isinstance(part, TextPart):
                text = part.content
                role = "assistant"
            else:
                continue

            if not text:
                continue

            bubbles.append(
                ChatMessageSchema(id=str(len(bubbles)), role=role, text=text)
            )

    return bubbles


def preview_title(messages: Sequence[ModelMessage]) -> str:
    """Generate a preview title for a conversation."""

    for bubble in to_transcript(messages):
        if bubble.role != "user" or not bubble.text:
            continue
        text = bubble.text.strip()
        if len(text) <= _TITLE_MAX:
            return text
        return text[: _TITLE_MAX - 1].rstrip() + "…"
    return "New conversation"
