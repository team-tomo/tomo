from pydantic_ai import RunContext
from tomo.chat.deps import ChatDeps

from apps.api.tomo.timesheet.schemas import TodayStatusResponseSchema


async def get_today_status(
    ctx: RunContext[ChatDeps],
) -> TodayStatusResponseSchema:
    """Whether the signed-in user can clock in or clock out today."""
    return await ctx.deps.timesheet_service.get_today_status(ctx.deps.auth_context)
