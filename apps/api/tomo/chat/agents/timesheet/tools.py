from datetime import date

from pydantic_ai import RunContext
from tomo.chat.deps import ChatDeps
from tomo.timesheet.schemas import (
    AttendanceQuerySchema,
    ClockInOutResponseSchema,
    TodayStatusResponseSchema,
)


async def get_today_status(
    ctx: RunContext[ChatDeps],
) -> TodayStatusResponseSchema:
    """Whether the signed-in user can clock in or clock out today."""
    return await ctx.deps.timesheet_service.get_today_status(ctx.deps.auth_context)


async def get_attendance(
    ctx: RunContext[ChatDeps],
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[ClockInOutResponseSchema]:
    """Clock rows for this user in a date range (time in/out, late, notes).

    Omit both dates for this week (Monday through today, Asia/Manila).
    One day = the same date on both ends. Maximum 31 days.
    """
    return await ctx.deps.timesheet_service.list_attendance(
        AttendanceQuerySchema(from_date=from_date, to_date=to_date),
        ctx.deps.auth_context,
    )
