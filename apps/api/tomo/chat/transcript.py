import json
from collections.abc import Sequence

from pydantic import ValidationError
from pydantic_ai.messages import (
    ModelMessage,
    TextPart,
    ToolReturnPart,
    UserPromptPart,
)

from tomo.chat.schemas import ChatMessageSchema, LeaveDraftSchema

_TITLE_MAX = 60


def _user_text(content: object) -> str:
    if isinstance(content, str):
        return content
    return ""


def _draft_from_part(part: object) -> LeaveDraftSchema | None:
    """A pending leave card from a successful propose_leave result, if this part is one."""

    if not isinstance(part, ToolReturnPart) or part.tool_name != "propose_leave":
        return None

    content = part.content
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except json.JSONDecodeError:
            return None
    if not isinstance(content, dict) or content.get("ok") is not True:
        return None

    try:
        return LeaveDraftSchema.model_validate(content)
    except ValidationError:
        return None


def _attach_drafts(
    bubbles: list[ChatMessageSchema], drafts: list[LeaveDraftSchema]
) -> None:
    """Hang leftover leave cards on the assistant reply that produced them."""

    if not drafts:
        return

    if bubbles and bubbles[-1].role == "assistant":
        last = bubbles[-1]
        bubbles[-1] = last.model_copy(
            update={"leave_drafts": [*last.leave_drafts, *drafts]}
        )
        return

    bubbles.append(
        ChatMessageSchema(
            id=str(len(bubbles)),
            role="assistant",
            text="",
            leave_drafts=list(drafts),
        )
    )


def _anchors(raw: object) -> dict[int, list[LeaveDraftSchema]]:
    """Leave cards saved on the conversation, grouped by the reply that produced them."""

    grouped: dict[int, list[LeaveDraftSchema]] = {}
    if not isinstance(raw, list):
        return grouped

    for entry in raw:
        if not isinstance(entry, dict):
            continue
        index = entry.get("message_index")
        drafts = entry.get("drafts")
        if isinstance(index, bool) or not isinstance(index, int):
            continue
        if not isinstance(drafts, list):
            continue

        parsed: list[LeaveDraftSchema] = []
        for offset, draft in enumerate(drafts):
            if not isinstance(draft, dict):
                continue
            payload = dict(draft)
            payload.setdefault("id", f"{index}:{offset}")
            try:
                parsed.append(LeaveDraftSchema.model_validate(payload))
            except ValidationError:
                continue
        if parsed:
            grouped.setdefault(index, []).extend(parsed)

    return grouped


def to_transcript(
    messages: Sequence[ModelMessage], saved_drafts: object = None
) -> list[ChatMessageSchema]:
    """Map stored messages to chat bubbles, with each leave card on its reply."""

    bubbles: list[ChatMessageSchema] = []
    pending: list[LeaveDraftSchema] = []
    anchors = _anchors(saved_drafts)

    for index, message in enumerate(messages):
        pending.extend(anchors.get(index, []))
        for part in message.parts:
            if isinstance(part, UserPromptPart):
                _attach_drafts(bubbles, pending)
                pending = []
                text = _user_text(part.content)
                if not text:
                    continue
                bubbles.append(
                    ChatMessageSchema(id=str(len(bubbles)), role="user", text=text)
                )
                continue

            if isinstance(part, TextPart):
                if not part.content:
                    continue
                bubbles.append(
                    ChatMessageSchema(
                        id=str(len(bubbles)),
                        role="assistant",
                        text=part.content,
                        leave_drafts=list(pending),
                    )
                )
                pending = []
                continue

            draft = _draft_from_part(part)
            if draft is not None:
                pending.append(draft)

    _attach_drafts(bubbles, pending)
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
