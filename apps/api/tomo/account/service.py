import logging

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from tomo.account.schemas import UpdateProfileSchema
from tomo.context import AuthContext

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


account_service = AccountService()
