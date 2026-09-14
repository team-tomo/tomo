from pydantic_ai import Agent
from tomo.chat.agents.timesheet.prompts import INSTRUCTIONS
from tomo.chat.agents.timesheet.tools import get_attendance, get_today_status
from tomo.chat.deps import ChatDeps

timesheet_agent = Agent(
    "openai:gpt-4.1-mini",
    name="Hari",
    description="Attendance for the signed-in user: today clock-in/out status and date-range history.",
    deps_type=ChatDeps,
    instructions=INSTRUCTIONS,
    tools=[get_today_status, get_attendance],
    defer_model_check=True,
)
