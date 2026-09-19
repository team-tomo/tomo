from pydantic_ai import Agent
from tomo.chat.agents.leave.prompts import INSTRUCTIONS
from tomo.chat.agents.leave.tools import get_leave_requests, propose_leave
from tomo.chat.deps import ChatDeps
from tomo.core.dates import app_dates

leave_agent = Agent(
    "openai:gpt-4.1-mini",
    name="Kyu",
    description="Kyu, Leave Requests for the signed-in user: list by date range and prepare a draft to file (does not file).",
    deps_type=ChatDeps,
    instructions=lambda: app_dates().format(INSTRUCTIONS),
    tools=[get_leave_requests, propose_leave],
    defer_model_check=True,
)
