import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from tomo.context import AuthContext
from tomo.timesheet.schemas import TodayStatusResponse

logger = logging.getLogger(__name__)

_TIME_ZONE = ZoneInfo("Asia/Manila")
_TIMESHEET = "timesheet"


class TimesheetService:
    async def get_today_status(self, auth_context: AuthContext) -> TodayStatusResponse:
        """Report whether the user can clock in or out today."""

        today = datetime.now(_TIME_ZONE).date()
        try:
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
            return TodayStatusResponse(can_clock_in=True, can_clock_out=False)
        if not row.get("clock_out"):
            return TodayStatusResponse(can_clock_in=False, can_clock_out=True)
        return TodayStatusResponse(can_clock_in=False, can_clock_out=False)


timesheet_service = TimesheetService()
