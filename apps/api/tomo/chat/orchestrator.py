from pydantic_ai import Agent
from pydantic_ai_harness import SubAgent, SubAgents

from tomo.chat.agents.leave import leave_agent
from tomo.chat.agents.timesheet import timesheet_agent
from tomo.chat.deps import ChatDeps
from tomo.chat.prompts import INSTRUCTIONS
from tomo.core.dates import app_dates

momo = Agent(
    "openai:gpt-4o-mini",
    name="Momo",
    deps_type=ChatDeps,
    instructions=lambda: app_dates().format(INSTRUCTIONS),
    capabilities=[SubAgents(agents=[SubAgent(timesheet_agent), SubAgent(leave_agent)])],
    defer_model_check=True,
)
