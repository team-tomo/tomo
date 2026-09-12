from pydantic_ai import Agent
from pydantic_ai_harness import SubAgent, SubAgents

from tomo.chat.agents.timesheet import timesheet_agent
from tomo.chat.deps import ChatDeps
from tomo.chat.prompts import INSTRUCTIONS

toki = Agent(
    "openai:gpt-4o-mini",
    name="Toki",
    deps_type=ChatDeps,
    instructions=INSTRUCTIONS,
    capabilities=[SubAgents(agents=[SubAgent(timesheet_agent)])],
    defer_model_check=True,
)
