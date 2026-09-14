from typing import Annotated

from fastapi import APIRouter, Query, Request

from tomo.core.rate_limiter import limiter
from tomo.dependencies import AuthContextDependency, TimesheetServiceDependency
from tomo.timesheet.schemas import (
    AttendanceQuerySchema,
    AttendanceSummarySchema,
    ClockInOutResponseSchema,
    ClockOutSchema,
)

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


@router.post("/clock-in")
@limiter.limit("5/minute")
async def clock_in(
    request: Request,
    auth_context: AuthContextDependency,
    service: TimesheetServiceDependency,
):
    """Clock in the user for the current day."""
    return await service.clock_in(auth_context)


@router.patch("/clock-out")
@limiter.limit("5/minute")
async def clock_out(
    request: Request,
    payload: ClockOutSchema,
    auth_context: AuthContextDependency,
    service: TimesheetServiceDependency,
):
    """Clock out the user for the current day."""
    return await service.clock_out(payload, auth_context)


@router.get("/attendance/summary")
@limiter.limit("20/minute")
async def list_attendance_summary(
    request: Request,
    auth_context: AuthContextDependency,
    service: TimesheetServiceDependency,
) -> list[AttendanceSummarySchema]:
    """Return the attendance summary for the user of the current year."""
    return await service.list_attendance_summary(auth_context)


@router.get("/attendance")
@limiter.limit("20/minute")
async def list_attendance(
    request: Request,
    query: Annotated[AttendanceQuerySchema, Query()],
    auth_context: AuthContextDependency,
    service: TimesheetServiceDependency,
) -> list[ClockInOutResponseSchema]:
    """List the attendance for the user for the given time range."""
    return await service.list_attendance(query, auth_context)
