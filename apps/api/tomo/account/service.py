import logging

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from tomo.account.schemas import ManagerSchema, UpdateProfileSchema
from tomo.context import AuthContext
from tomo.enums import MANAGER_ROLES

logger = logging.getLogger(__name__)

_PROFILES = "profiles"


class AccountService:
    async def get_profile(self, auth_context: AuthContext):
        """Return the signed-in user's profile."""

        try:
            response = (
                await auth_context.client.from_(_PROFILES)
                .select("*")
                .eq("id", auth_context.current_user_id)
                .limit(1)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to get profile: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get profile",
            )

        row = response.data[0] if response.data else None
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found",
            )

        return row

    async def update_profile(
        self, payload: UpdateProfileSchema, auth_context: AuthContext
    ):
        """Update the user's profile."""

        data = payload.model_dump(mode="json", exclude_none=True)
        data["full_name"] = data["full_name"].strip()
        if not data["full_name"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full name is required",
            )
        if "username" in data:
            data["username"] = data["username"].strip()
        if "manager_id" in data:
            await self._assign_manager(data["manager_id"], auth_context)

        try:
            response = (
                await auth_context.client.from_(_PROFILES)
                .update(data)
                .eq("id", auth_context.current_user_id)
                .select("*")
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to update profile: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update profile",
            )
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update profile",
            )

        return response.data[0]

    async def list_managers(self, auth_context: AuthContext) -> list[ManagerSchema]:
        """Return active Leads and Executives the current Profile may pick."""

        try:
            response = (
                await auth_context.client.from_(_PROFILES)
                .select("id, full_name, username, role, job_title")
                .eq("is_active", True)
                .in_("role", list(MANAGER_ROLES))
                .neq("id", auth_context.current_user_id)
                .order("full_name")
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to list managers: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to list managers",
            )

        return [ManagerSchema(**row) for row in response.data]

    async def _assign_manager(self, manager_id: str, auth_context: AuthContext) -> None:
        """Set Manager only while it is still empty."""

        if manager_id == auth_context.current_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot select yourself as manager",
            )

        current = await self.get_profile(auth_context)
        if current.get("manager_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Manager can only be changed from Manage Accounts",
            )

        try:
            response = (
                await auth_context.client.from_(_PROFILES)
                .select("id, role, is_active")
                .eq("id", manager_id)
                .limit(1)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to load manager: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update profile",
            )

        row = response.data[0] if response.data else None
        if (
            row is None
            or not row.get("is_active")
            or row.get("role") not in MANAGER_ROLES
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Manager must be an active lead or executive",
            )


account_service = AccountService()
