from pydantic_ai import Agent
from tomo.chat.agents.actuals.prompts import INSTRUCTIONS
from tomo.chat.deps import ChatDeps
from tomo.core.dates import app_dates

actuals_agent = Agent(
    "openai:gpt-4.1-mini",
    name="Shigoto",
    description="Shigoto drafts a sample of this user's actuals from attendance notes (date, description, hours). Does not file.",
    deps_type=ChatDeps,
    instructions=lambda: app_dates().format(INSTRUCTIONS),
    tools=[],
    defer_model_check=True,
)
