from pydantic_ai import Agent
from tomo.chat.agents.timesheet.prompts import INSTRUCTIONS
from tomo.chat.agents.timesheet.tools import get_today_status
from tomo.chat.deps import ChatDeps

timesheet_agent = Agent(
    "openai:gpt-4.1-mini",
    name="Hari",
    description="Today's attendance for the signed-in user: clock-in/out status only.",
    deps_type=ChatDeps,
    instructions=INSTRUCTIONS,
    tools=[get_today_status],
    defer_model_check=True,
)
