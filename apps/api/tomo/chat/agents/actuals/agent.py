from pydantic_ai import Agent
from tomo.chat.agents.actuals.prompts import INSTRUCTIONS
from tomo.chat.agents.actuals.tools import get_attendance
from tomo.chat.deps import ChatDeps
from tomo.core.dates import app_dates

actuals_agent = Agent(
    "openai:gpt-4.1-mini",
    name="Shigoto",
    description="Shigoto loads attendance notes and drafts a sample of this user's actuals (date, description, hours). Does not file.",
    deps_type=ChatDeps,
    instructions=lambda: app_dates().format(INSTRUCTIONS),
    tools=[get_attendance],
    defer_model_check=True,
)
