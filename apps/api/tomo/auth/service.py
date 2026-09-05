import logging

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from supabase import AsyncClient, AuthApiError
from tomo.auth.schemas import (
    CreateAccountSchema,
    CreateDevAccountSchema,
    CreateInviteCodeSchema,
)
from tomo.context import AuthContext
from tomo.core.config import settings
from tomo.enums import ADMIN_ROLES, UserRole

logger = logging.getLogger(__name__)

_PROFILES = "profiles"
_INVITATION_CODES = "invitation_codes"
_INVITATION_REDEMPTIONS = "invitation_redemptions"


class AuthService:
    async def _claim_invitation_code(self, code: str, service_client: AsyncClient):
        """Validate and claim an invitation code."""

        response = (
            await service_client.from_(_INVITATION_CODES)
            .select("*")
            .eq("code", code)
            .execute()
        )

        row = response.data[0] if response.data else None
        if not row or row["status"] != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid invitation code",
            )

        update_response = (
            await service_client.from_(_INVITATION_CODES)
            .update({"status": "claimed"})
            .eq("code", code)
            .select("*")
            .execute()
        )

        if not update_response or not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to claim invitation code",
            )

        return update_response.data[0]

    async def _release_invitation_code(
        self, row: dict, service_client: AsyncClient
    ) -> None:
        """When signup fails, release the invitation code."""

        try:
            response = (
                await service_client.from_(_INVITATION_CODES)
                .update({"status": "active"})
                .eq("id", row["id"])
                .select("*")
                .execute()
            )
        except Exception:
            logger.critical(
                "Failed to release invitation code %s after signup failure",
                row["id"],
                exc_info=True,
            )
            return

        if not response.data:
            logger.critical(
                "Failed to release invitation code %s after signup failure", row["id"]
            )

    async def _delete_auth_user(self, user_id: str, service_client: AsyncClient) -> None:
        """Remove an auth user after a failed profile insert so the account is not left half-created."""

        try:
            await service_client.auth.admin.delete_user(user_id)
        except Exception:
            logger.critical(
                "Failed to roll back auth user %s after profile insert failure",
                user_id,
                exc_info=True,
            )

    async def _require_admin_account(self, auth_context: AuthContext) -> None:
        """Reject non-admin users"""

        response = (
            await auth_context.client.from_(_PROFILES)
            .select("role, is_active")
            .eq("id", auth_context.current_user_id)
            .limit(1)
            .execute()
        )

        row = response.data[0] if response.data else None
        if not row or not row.get("is_active") or row.get("role") not in ADMIN_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )

    async def _record_invitation_code_claim(
        self, code_id: str, user_id: str, supabase: AsyncClient
    ) -> None:
        """Record the claim of invitation code"""

        try:
            response = (
                await supabase.from_(_INVITATION_REDEMPTIONS)
                .insert({"code_id": code_id, "profile_id": user_id})
                .execute()
            )
        except AuthApiError as e:
            logger.error(f"Failed to record invitation code claim: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to record invitation code claim",
            )

        if not response.data:
            logger.critical(
                "Failed to record invitation code %s claim by user %s", code_id, user_id
            )

    async def create_dev_account(
        self, payload: CreateDevAccountSchema, service_client: AsyncClient
    ):
        """Create a confirmed user via the service role, bypassing invitation codes."""

        if settings.ENVIRONMENT != "development" or not settings.ENABLE_DEV_AUTH:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized",
            )

        try:
            response = await service_client.auth.admin.create_user(
                {
                    "email": payload.email,
                    "password": payload.password,
                    "email_confirm": True,
                }
            )
        except AuthApiError as e:
            logger.error(f"Failed to create dev account: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create dev account",
            )

        user = response.user
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to create account with this email",
            )

        try:
            profile = (
                await service_client.from_(_PROFILES)
                .insert(
                    {
                        "id": user.id,
                        "email": payload.email,
                        "full_name": payload.email.split("@", 1)[0],
                        "role": UserRole.DEV,
                        "is_active": True,
                        "onboarding_status": "pending",
                    }
                )
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to create profile for user {user.id}: {e}")
            await self._delete_auth_user(user.id, service_client)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create profile for user",
            )

        if not profile.data:
            logger.critical("Failed to create profile for user %s", user.id)
            await self._delete_auth_user(user.id, service_client)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create profile for user",
            )

        return user

    async def signup(
        self,
        payload: CreateAccountSchema,
        supabase: AsyncClient,
        service_client: AsyncClient,
    ):
        """Signup a new user."""

        claimed_code = await self._claim_invitation_code(
            payload.invitation_code, service_client
        )
        try:
            response = await supabase.auth.sign_up(
                {
                    "email": payload.email,
                    "password": payload.password,
                    "options": {
                        "data": {
                            "full_name": payload.full_name.strip(),
                            "role": claimed_code["role"],
                        }
                    },
                }
            )
        except Exception:
            await self._release_invitation_code(claimed_code, service_client)
            raise

        user = response.user
        if user is None or not user.identities:
            await self._release_invitation_code(claimed_code, service_client)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create account with this email",
            )

        await self._record_invitation_code_claim(
            claimed_code["id"], user.id, service_client
        )

        profile = await (
            supabase.from_(_PROFILES)
            .insert(
                {
                    "id": user.id,
                    "email": payload.email,
                    "full_name": payload.full_name.strip(),
                    "role": claimed_code["role"],
                    "username": payload.username.strip(),
                    "is_active": True,
                    "onboarding_status": "pending",
                }
            )
            .execute()
        )

        if not profile.data:
            logger.critical("Failed to create profile for user %s", user.id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create profile for user",
            )

        return response

    async def create_invitation(
        self, payload: CreateInviteCodeSchema, auth_context: AuthContext
    ):
        """Create a new invitation only for admins."""

        await self._require_admin_account(auth_context)

        data = {
            **payload.model_dump(mode="json", exclude_none=True),
            "created_by": auth_context.current_user_id,
        }

        try:
            response = (
                await auth_context.client.from_(_INVITATION_CODES)
                .insert(data)
                .execute()
            )
        except APIError as exc:
            logger.error(f"Failed to create invitation code: {exc}")
            if str(exc.code) == "23505":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Invitation code already exists",
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create invitation code",
            )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create invitation code",
            )

        return response.data[0]


auth_service = AuthService()
