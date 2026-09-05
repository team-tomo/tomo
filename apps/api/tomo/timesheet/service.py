import logging
from datetime import datetime, time
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from tomo.context import AuthContext
from tomo.timesheet.schemas import ClockinResponseSchema, TodayStatusResponseSchema

logger = logging.getLogger(__name__)

_LATE_AFTER = time(9, 0, 0)
_TIME_ZONE = ZoneInfo("Asia/Manila")
_TIMESHEET = "timesheet"


class TimesheetService:
    async def get_today_status(
        self, auth_context: AuthContext
    ) -> TodayStatusResponseSchema:
        """Report whether the user can clock in or out today."""

        try:
            today = datetime.now(_TIME_ZONE).date()
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

    async def clock_in(self, auth_context: AuthContext) -> ClockinResponseSchema:
        """Clock in the user for the current day."""

        now = datetime.now(_TIME_ZONE)
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

        return ClockinResponseSchema(**response.data[0])


timesheet_service = TimesheetService()
