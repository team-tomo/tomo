from fastapi import APIRouter, Request

from tomo.core.rate_limiter import limiter
from tomo.dependencies import AuthContextDependency, TimesheetServiceDependency

router = APIRouter(prefix="/timesheet", tags=["timesheet"])


@router.get("/today-status")
@limiter.limit("20/minute")
async def get_today_status(
    request: Request,
    auth_context: AuthContextDependency,
    service: TimesheetServiceDependency,
):
    """Report whether the user can clock in or out today."""
    return await service.get_today_status(auth_context)
