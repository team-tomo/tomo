from pydantic_ai import Agent
from tomo.chat.agents.timesheet.prompts import INSTRUCTIONS
from tomo.chat.agents.timesheet.tools import get_attendance, get_today_status
from tomo.chat.deps import ChatDeps
from tomo.core.dates import app_dates

timesheet_agent = Agent(
    "openai:gpt-4.1-mini",
    name="Toki",
    description="Toki, the time keeper: attendance for the signed-in user — today clock-in/out status and date-range history.",
    deps_type=ChatDeps,
    instructions=lambda: app_dates().format(INSTRUCTIONS),
    tools=[get_today_status, get_attendance],
    defer_model_check=True,
)
