import logging
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from supabase import AsyncClient
from tomo.context import AuthContext
from tomo.core.config import APP_TIME_ZONE
from tomo.enums import MANAGER_ROLES
from tomo.leave.schemas import FileLeaveRequestSchema, LeaveRequestSchema

_PROFILES = "profiles"
_LEAVE_REQUESTS = "leave_requests"
_STATUS = ("pending", "approved")

logger = logging.getLogger(__name__)


class LeaveService:
    async def get_leave_request(
        self, leave_id: str, auth_context: AuthContext
    ) -> LeaveRequestSchema:
        """Return a leave request the current profile may see."""

        row = await self._load_leave_request(leave_id, auth_context)
        if not self._can_view_leave_request(row, auth_context.current_user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this leave request",
            )

        return LeaveRequestSchema(**row)

    async def cancel_leave_request(
        self, leave_id: str, auth_context: AuthContext
    ) -> LeaveRequestSchema:
        """Cancel a pending leave request. Filer only"""

        row = await self._load_leave_request(leave_id, auth_context)
        if row["profile_id"] != auth_context.current_user_id:
            if self._can_view_leave_request(row, auth_context.current_user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only filer can cancel a leave request",
                )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Leave request not found",
            )

        if row["status"] != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending leave requests can be cancelled",
            )

        try:
            response = (
                await auth_context.client.from_(_LEAVE_REQUESTS)
                .update({"status": "cancelled"})
                .eq("id", leave_id)
                .eq("profile_id", auth_context.current_user_id)
                .eq("status", "pending")
                .select("*")
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to cancel leave request: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to cancel leave request",
            )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only a pending leave request can be cancelled",
            )

        return LeaveRequestSchema(**response.data[0])

    async def list_leave_inbox(
        self, auth_context: AuthContext, service_client: AsyncClient
    ) -> list[LeaveRequestSchema]:
        """Pending Leave Requests the current Profile may decide."""

        caller = await self._get_profile_row(
            auth_context.current_user_id, service_client
        )
        if (
            caller is None
            or not caller.get("is_active")
            or caller.get("role") not in MANAGER_ROLES
        ):
            return []

        try:
            response = (
                await service_client.from_(_LEAVE_REQUESTS)
                .select("*")
                .eq("status", "pending")
                .order("date", desc=True)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to list leave inbox: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to list leave inbox",
            )

        visible: list[LeaveRequestSchema] = []
        for row in response.data:
            if await self._caller_may_decide(row, caller, service_client):
                visible.append(LeaveRequestSchema(**row))
        return visible

    async def decide_leave_request(
        self,
        leave_id: str,
        decision: str,
        auth_context: AuthContext,
        service_client: AsyncClient,
    ) -> LeaveRequestSchema:
        """Approve or reject a pending leave request."""

        row = await self._load_leave_request_row(leave_id, service_client)
        caller = await self._get_profile_row(
            auth_context.current_user_id, service_client
        )

        if not await self._caller_may_decide(row, caller, service_client):
            if (
                row["profile_id"] == auth_context.current_user_id
                or row["manager_id"] == auth_context.current_user_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to decide this leave request",
                )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Leave request not found",
            )

        if row["status"] != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only a pending leave request can be decided",
            )

        try:
            response = (
                await service_client.from_(_LEAVE_REQUESTS)
                .update(
                    {
                        "status": decision,
                        "decided_by": auth_context.current_user_id,
                        "decided_at": datetime.now(UTC).isoformat(),
                    }
                )
                .eq("id", leave_id)
                .eq("status", "pending")
                .select("*")
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to decide leave request: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to decide leave request",
            )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only a pending leave request can be decided",
            )

        return LeaveRequestSchema(**response.data[0])

    async def _caller_may_decide(
        self, row: dict, caller: dict | None, service_client: AsyncClient
    ) -> bool:
        """Assigned Manager while they are eligible; otherwise any other Manager except the filer."""

        if caller is None:
            return False
        if row["profile_id"] == caller["id"]:
            return False
        if not caller.get("is_active") or caller.get("role") not in MANAGER_ROLES:
            return False

        assigned = await self._get_profile_row(row["manager_id"], service_client)
        assigned_active = (
            assigned is not None
            and assigned.get("is_active")
            and assigned.get("role") in MANAGER_ROLES
        )
        if assigned_active:
            return row["manager_id"] == caller["id"]
        return True

    async def _load_leave_request_row(self, leave_id: str, client: AsyncClient) -> dict:
        """Load a Leave Request by id, ignoring RLS."""

        try:
            response = (
                await client.from_(_LEAVE_REQUESTS)
                .select("*")
                .eq("id", leave_id)
                .limit(1)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to load leave request: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to load leave request",
            )

        row = response.data[0] if response.data else None
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Leave request not found",
            )
        return row

    async def _get_profile_row(
        self, profile_id: str, client: AsyncClient
    ) -> dict | None:
        """Load a Profile by id."""

        try:
            response = (
                await client.from_(_PROFILES)
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

    async def _load_leave_request(
        self, leave_id: str, auth_context: AuthContext
    ) -> dict:
        """Load leave request by id."""

        try:
            response = (
                await auth_context.client.from_(_LEAVE_REQUESTS)
                .select("*")
                .eq("id", leave_id)
                .limit(1)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to load leave request: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to load leave request",
            )

        row = response.data[0] if response.data else None
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Leave request not found",
            )

        return row

    def _can_view_leave_request(self, row: dict, current_user_id: str) -> bool:
        """Check if the current user can view the leave request."""

        return (
            row["profile_id"] == current_user_id or row["manager_id"] == current_user_id
        )

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
