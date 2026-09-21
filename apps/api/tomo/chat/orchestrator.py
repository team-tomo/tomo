from collections.abc import AsyncIterable

from pydantic_ai import Agent, AgentStreamEvent, RunContext
from pydantic_ai_harness import SubAgent, SubAgents

from tomo.chat.agents.leave import leave_agent
from tomo.chat.agents.timesheet import timesheet_agent
from tomo.chat.deps import ChatDeps
from tomo.chat.prompts import INSTRUCTIONS
from tomo.chat.status import status_for
from tomo.core.dates import app_dates


async def forward_status(
    ctx: RunContext[ChatDeps], events: AsyncIterable[AgentStreamEvent]
) -> None:
    """Put a specialist's own tool calls on the same status line as Momo's.

    The specialist's reply text is not forwarded; Momo writes the answer.
    """

    async for event in events:
        status = status_for(event)
        if status is not None:
            ctx.deps.stream.status(status)


momo = Agent(
    "openai:gpt-4o-mini",
    name="Momo",
    deps_type=ChatDeps,
    instructions=lambda: app_dates().format(INSTRUCTIONS),
    capabilities=[
        SubAgents(
            agents=[SubAgent(timesheet_agent), SubAgent(leave_agent)],
            event_stream_handler=forward_status,
        )
    ],
    defer_model_check=True,
)
