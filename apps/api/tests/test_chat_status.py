from pydantic_ai import (
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    PartStartEvent,
)
from pydantic_ai.messages import TextPart, ToolCallPart, ToolReturnPart
from tomo.chat.status import THINKING, WORKING, Status, status_for


def _call(tool_name: str, args: dict | str | None = None) -> FunctionToolCallEvent:
    return FunctionToolCallEvent(
        ToolCallPart(tool_name=tool_name, args=args, tool_call_id="call-1")
    )


def test_delegating_names_the_specialist() -> None:
    event = _call("delegate_task", {"agent_name": "Toki", "task": "attendance"})

    assert status_for(event) == Status("Calling Toki", "agent")


def test_delegating_reads_json_args() -> None:
    event = _call("delegate_task", '{"agent_name": "Kyu", "task": "leave"}')

    assert status_for(event) == Status("Calling Kyu", "agent")


def test_delegating_without_an_agent_name() -> None:
    assert status_for(_call("delegate_task")) == WORKING


def test_attendance_tools() -> None:
    checking = Status("Checking attendance", "tool")

    assert status_for(_call("get_today_status")) == checking
    assert status_for(_call("get_attendance")) == checking


def test_leave_tools() -> None:
    assert status_for(_call("get_leave_requests")) == Status("Checking leave", "tool")
    assert status_for(_call("propose_leave")) == Status(
        "Preparing a leave draft", "tool"
    )


def test_unknown_tool_stays_vague() -> None:
    assert status_for(_call("some_new_tool")) == WORKING


def test_tool_result_goes_back_to_thinking() -> None:
    event = FunctionToolResultEvent(
        ToolReturnPart(
            tool_name="get_attendance", content=[], tool_call_id="call-1"
        )
    )

    assert status_for(event) == THINKING


def test_text_does_not_change_the_status() -> None:
    event = PartStartEvent(index=0, part=TextPart(content="You can clock out."))

    assert status_for(event) is None
