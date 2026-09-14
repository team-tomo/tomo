import logging
from datetime import date, datetime, time, timedelta

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from tomo.context import AuthContext
from tomo.core.config import APP_TIME_ZONE
from tomo.timesheet.schemas import (
    AttendanceQuerySchema,
    AttendanceSummarySchema,
    ClockInOutResponseSchema,
    ClockOutSchema,
    TodayStatusResponseSchema,
)

logger = logging.getLogger(__name__)

_MAX_RANGE_DAYS = 31
_LATE_AFTER = time(9, 0, 0)
_TIMESHEET = "timesheet"


def _this_week(today: date) -> tuple[date, date]:
    """Return the start and end dates of the current week."""

    monday = today - timedelta(days=today.weekday())
    return monday, today


def _resolve_time_range(query: AttendanceQuerySchema) -> tuple[date, date]:
    """Resolve the time range for the attendance query."""

    today = datetime.now(APP_TIME_ZONE).date()
    start = query.from_date
    end = query.to_date

    if start is None and end is None:
        return _this_week(today)
    if start is None:
        start = end
    if end is None:
        end = start
    if start > end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be on or before end date",
        )
    if (end - start).days + 1 > _MAX_RANGE_DAYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum range of days is {_MAX_RANGE_DAYS}",
        )
    return start, end


def _this_year(today: date) -> tuple[date, date]:
    """Return Jan 1 through today of the current calendar year."""

    return date(today.year, 1, 1), today


def _attendance_status(row: dict) -> str:
    """Return the attendance status for the given row."""

    if row.get("is_late"):
        return "late"
    if not row.get("time_out"):
        return "incomplete"
    return "on_time"


class TimesheetService:
    async def get_today_status(
        self, auth_context: AuthContext
    ) -> TodayStatusResponseSchema:
        """Report whether the user can clock in or out today."""

        try:
            today = datetime.now(APP_TIME_ZONE).date()
            existing_record = (
                await auth_context.client.from_(_TIMESHEET)
                .select("*")
                .eq("user_id", auth_context.current_user_id)
                .eq("date", today.isoformat())
                .limit(1)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to get today's status: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get today's status",
            )

        row = existing_record.data[0] if existing_record.data else None
        if row is None:
            return TodayStatusResponseSchema(can_clock_in=True, can_clock_out=False)
        if not row.get("time_out"):
            return TodayStatusResponseSchema(can_clock_in=False, can_clock_out=True)
        return TodayStatusResponseSchema(can_clock_in=False, can_clock_out=False)

    async def clock_in(self, auth_context: AuthContext) -> ClockInOutResponseSchema:
        """Clock in the user for the current day."""

        now = datetime.now(APP_TIME_ZONE)
        data = {
            "user_id": auth_context.current_user_id,
            "date": now.date().isoformat(),
            "time_in": now.isoformat(),
            "is_late": now.time() > _LATE_AFTER,
        }

        try:
            response = (
                await auth_context.client.from_(_TIMESHEET).insert(data).execute()
            )
        except APIError as e:
            logger.error(f"Failed to clock in: {e}")
            if str(e.code) == "23505":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User has already clocked in today",
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to clock in",
            )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to clock in",
            )

        return ClockInOutResponseSchema(**response.data[0])

    async def clock_out(
        self, payload: ClockOutSchema, auth_context: AuthContext
    ) -> ClockInOutResponseSchema:
        """Clock out the user for the current day."""

        now = datetime.now(APP_TIME_ZONE)
        data = {
            "notes": payload.notes,
            "time_out": now.isoformat(),
        }

        try:
            existing_record = (
                await auth_context.client.from_(_TIMESHEET)
                .select("*")
                .eq("user_id", auth_context.current_user_id)
                .eq("date", now.date().isoformat())
                .limit(1)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to get existing record: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to clock out",
            )

        row = existing_record.data[0] if existing_record.data else None
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User has not clocked in today",
            )
        if row.get("time_out"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User has already clocked out today",
            )

        try:
            response = (
                await auth_context.client.from_(_TIMESHEET)
                .update(data)
                .eq("id", row["id"])
                .is_("time_out", "null")
                .select("*")
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to clock out: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to clock out",
            )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User has already clocked out today",
            )

        return ClockInOutResponseSchema(**response.data[0])

    async def list_attendance(
        self, query: AttendanceQuerySchema, auth_context: AuthContext
    ) -> list[ClockInOutResponseSchema]:
        """List the attendance for the user for the given time range."""

        start, end = _resolve_time_range(query)
        try:
            response = (
                await auth_context.client.from_(_TIMESHEET)
                .select("*")
                .eq("user_id", auth_context.current_user_id)
                .gte("date", start.isoformat())
                .lte("date", end.isoformat())
                .order("date", desc=True)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to list attendance: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to list attendance",
            )

        return [ClockInOutResponseSchema(**row) for row in response.data]

    async def list_attendance_summary(
        self, auth_context: AuthContext
    ) -> list[AttendanceSummarySchema]:
        """List the attendance summary for the user of the current year."""

        start, end = _this_year(datetime.now(APP_TIME_ZONE).date())
        try:
            response = (
                await auth_context.client.from_(_TIMESHEET)
                .select("date, is_late, time_out")
                .eq("user_id", auth_context.current_user_id)
                .gte("date", start.isoformat())
                .lte("date", end.isoformat())
                .order("date")
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to list attendance summary: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to list attendance summary",
            )

        return [
            AttendanceSummarySchema(date=row["date"], status=_attendance_status(row))
            for row in response.data
        ]


timesheet_service = TimesheetService()
