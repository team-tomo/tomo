from pydantic_ai import Agent
from tomo.chat.deps import ChatDeps
from tomo.core.dates import app_dates

actuals_agent = Agent(
    "openai:gpt-4.1-mini",
    name="Shigoto",
    description="Shigoto, the project actuals keeper: list by date range and prepare a draft to file (does not file).",
    deps_type=ChatDeps,
    instructions=lambda: app_dates().format(INSTRUCTIONS),
    tools=[],
    defer_model_check=True,
)
