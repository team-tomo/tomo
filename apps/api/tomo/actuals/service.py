import logging
from uuid import UUID

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from tomo.actuals.schemas import ActualInputSchema, ActualResponseSchema
from tomo.context import AuthContext

logger = logging.getLogger(__name__)

_ACTUALS = "actuals"


class ActualService:
    async def list_actuals(
        self, auth_context: AuthContext
    ) -> list[ActualResponseSchema]:
        """Return the signed-in profile's actuals, newest date first."""

        try:
            response = (
                await auth_context.client.from_(_ACTUALS)
                .select("*")
                .eq("user_id", auth_context.current_user_id)
                .order("date", desc=True)
                .order("created_at", desc=True)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to list actuals: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to list actuals",
            )

        return [ActualResponseSchema(**row) for row in response.data]

    async def get_actual(
        self, actual_id: UUID, auth_context: AuthContext
    ) -> ActualResponseSchema:
        """Return one actual owned by the signed-in profile."""

        try:
            response = (
                await auth_context.client.from_(_ACTUALS)
                .select("*")
                .eq("id", actual_id)
                .eq("user_id", auth_context.current_user_id)
                .limit(1)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to get actual: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get actual",
            )

        row = response.data[0] if response.data else None
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Actual not found",
            )

        return ActualResponseSchema(**row)

    async def create_actual(
        self, auth_context: AuthContext, payload: ActualInputSchema
    ) -> ActualResponseSchema:
        """Create an actual for the signed-in profile."""

        data = payload.model_dump(mode="json")
        data["user_id"] = auth_context.current_user_id

        try:
            response = await auth_context.client.from_(_ACTUALS).insert(data).execute()
        except APIError as e:
            logger.error(f"Failed to create actual: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create actual",
            )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create actual",
            )

        return ActualResponseSchema(**response.data[0])

    async def update_actual(
        self, actual_id: UUID, auth_context: AuthContext, payload: ActualInputSchema
    ) -> ActualResponseSchema:
        """Update date, description, and hours on an actual the profile owns."""

        data = payload.model_dump(mode="json")

        try:
            response = (
                await auth_context.client.from_(_ACTUALS)
                .update(data)
                .eq("id", actual_id)
                .eq("user_id", auth_context.current_user_id)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to update actual: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update actual",
            )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Actual not found",
            )

        return ActualResponseSchema(**response.data[0])


actual_service = ActualService()
