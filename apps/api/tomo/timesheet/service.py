import logging
from datetime import datetime, time

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from tomo.context import AuthContext
from tomo.core.config import APP_TIME_ZONE
from tomo.timesheet.schemas import (
    ClockInOutResponseSchema,
    ClockOutSchema,
    TodayStatusResponseSchema,
)

logger = logging.getLogger(__name__)

_LATE_AFTER = time(9, 0, 0)
_TIMESHEET = "timesheet"


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


timesheet_service = TimesheetService()
