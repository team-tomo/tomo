import logging
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from tomo.context import AuthContext
from tomo.core.config import APP_TIME_ZONE
from tomo.enums import MANAGER_ROLES
from tomo.leave.schemas import FileLeaveRequestSchema, LeaveRequestSchema

_PROFILES = "profiles"
_LEAVE_REQUESTS = "leave_requests"
_STATUS = ("pending", "approved")

logger = logging.getLogger(__name__)


class LeaveService:
    async def list_leave_requests(
        self, auth_context: AuthContext
    ) -> list[LeaveRequestSchema]:
        """List all leave requests of the current user."""

        try:
            response = (
                await auth_context.client.from_(_LEAVE_REQUESTS)
                .select("*")
                .eq("profile_id", auth_context.current_user_id)
                .order("date", desc=True)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to list leave requests: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to list leave requests",
            )

        return [LeaveRequestSchema(**row) for row in response.data]

    async def file_leave_request(
        self, payload: FileLeaveRequestSchema, auth_context: AuthContext
    ) -> LeaveRequestSchema:
        """File a leave request."""

        today = datetime.now(APP_TIME_ZONE).date()
        if payload.date < today - timedelta(
            days=1
        ):  # Allow filling for the previous day(SL)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date cannot be earlier than yesterday",
            )

        profile = await self._get_profile(auth_context.current_user_id, auth_context)
        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found",
            )

        manager_id = profile.get("manager_id")
        if not manager_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An active manager is required to file a leave request",
            )

        manager = await self._get_profile(manager_id, auth_context)
        if (
            manager is None
            or not manager.get("is_active")
            or manager.get("role") not in MANAGER_ROLES
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An active manager is required to file a leave request",
            )

        if await self._has_active_leave(
            auth_context.current_user_id, payload.date.isoformat(), auth_context
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A pending or approved leave request already exists for this date",
            )

        data = {
            "profile_id": auth_context.current_user_id,
            "date": payload.date.isoformat(),
            "leave_type": payload.leave_type,
            "coverage": payload.coverage,
            "reason": payload.reason,
            "status": "pending",
            "manager_id": manager_id,
        }

        try:
            response = (
                await auth_context.client.from_(_LEAVE_REQUESTS).insert(data).execute()
            )
        except APIError as e:
            logger.error(f"Failed to file leave: {e}")
            if str(e.code) == "23505":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A pending or approved leave request already exists for this date",
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to file leave",
            )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to file leave",
            )

        return LeaveRequestSchema(**response.data[0])

    async def _get_profile(
        self, profile_id: str, auth_context: AuthContext
    ) -> dict | None:
        """Load a Profile by id."""

        try:
            response = (
                await auth_context.client.from_(_PROFILES)
                .select("id, manager_id, role, is_active")
                .eq("id", profile_id)
                .limit(1)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to get profile: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get profile: {e}",
            )

        return response.data[0] if response.data else None

    async def _has_active_leave(
        self, profile_id: str, day: str, auth_context: AuthContext
    ) -> bool:
        try:
            response = (
                await auth_context.client.from_(_LEAVE_REQUESTS)
                .select("id")
                .eq("profile_id", profile_id)
                .eq("date", day)
                .in_("status", list(_STATUS))
                .limit(1)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to check existing leave: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to file leave",
            )
        return bool(response.data)


leave_service = LeaveService()
