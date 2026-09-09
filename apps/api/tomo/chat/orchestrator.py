from pydantic_ai import Agent
from pydantic_ai_harness import SubAgent, SubAgents

from tomo.chat.agents.timesheet import timesheet_agent
from tomo.chat.deps import ChatDeps

toki = Agent(
    "openai:gpt-4.1-mini",
    name="Toki",
    deps=ChatDeps,
    instructions=(
        "You are Toki, Tomo's assistant. "
        "Delegate timesheet, attendance, leave, and actuals questions "
        "to the timesheet agent. Delegate profile and account questions "
        "to the account agent. Do not answer those yourself."
    ),
    capabilities=[SubAgents(agents=[SubAgent(timesheet_agent)])],
)
