from typing import Literal, NamedTuple

from pydantic_ai import (
    AgentStreamEvent,
    FunctionToolCallEvent,
    FunctionToolResultEvent,
)
from pydantic_ai.messages import ToolCallPart
from pydantic_ai_harness import SubAgents

StatusKind = Literal["thinking", "tool", "agent"]


class Status(NamedTuple):
    """What to show on the status line while the run is in flight."""

    text: str
    kind: StatusKind


THINKING = Status("Thinking", "thinking")
WORKING = Status("Working", "tool")

_DELEGATE_TOOL = SubAgents.tool_name

_TOOL_LABELS = {
    "get_today_status": "Checking attendance",
    "get_attendance": "Checking attendance",
    "get_leave_requests": "Checking leave",
    "propose_leave": "Preparing a leave draft",
}


def status_for(event: AgentStreamEvent) -> Status | None:
    """Status to show the user for this event, or None to keep the current one."""

    if isinstance(event, FunctionToolCallEvent):
        return _call_status(event.part)
    if isinstance(event, FunctionToolResultEvent):
        return THINKING
    return None


def _call_status(part: ToolCallPart) -> Status:
    """Status for a tool the model is about to call."""

    if part.tool_name == _DELEGATE_TOOL:
        agent_name = part.args_as_dict().get("agent_name")
        return Status(f"Calling {agent_name}", "agent") if agent_name else WORKING

    label = _TOOL_LABELS.get(part.tool_name)
    return Status(label, "tool") if label else WORKING
