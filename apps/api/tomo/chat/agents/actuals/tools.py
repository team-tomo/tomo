from datetime import date

from pydantic import BaseModel
from pydantic_ai import RunContext
from tomo.chat.agents.timesheet.tools import get_attendance as list_attendance
from tomo.chat.deps import ChatDeps


class AttendanceNote(BaseModel):
    date: date
    notes: str | None = None


async def get_attendance(
    ctx: RunContext[ChatDeps],
    from_date: date,
    to_date: date,
) -> list[AttendanceNote]:
    """This user's attendance notes in a date range, for drafting actuals.

    Both dates are required. Weekly actuals are previous Thursday through this Wednesday.
    One day = the same date on both ends. Maximum 31 days.
    """
    rows = await list_attendance(ctx, from_date=from_date, to_date=to_date)
    return [AttendanceNote(date=row.date, notes=row.notes) for row in rows]
