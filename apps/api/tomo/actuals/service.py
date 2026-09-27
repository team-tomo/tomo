import logging
from uuid import UUID

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from tomo.actuals.schemas import ActualSchema, CreateActualSchema
from tomo.context import AuthContext

logger = logging.getLogger(__name__)

_ACTUALS = "actuals"


class ActualService:
    async def get_actuals(self, auth_context: AuthContext) -> list[ActualSchema]:
        """Get the actuals for the current user."""

        try:
            response = (
                await auth_context.client.from_(_ACTUALS)
                .select("*")
                .eq("user_id", auth_context.current_user_id)
                .execute()
            )

        except APIError as e:
            logger.error(f"Failed to get actuals: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to get actuals"
            )

        if not response.data:
            return None

        return [ActualSchema(**actual) for actual in response.data]

    async def get_actuals_by_id(
        self, actual_id: UUID, auth_context: AuthContext
    ) -> ActualSchema:
        """Get an specific actual."""

        try:
            response = (
                await auth_context.client.from_(_ACTUALS)
                .select("*")
                .eq("id", actual_id)
                .eq("user_id", auth_context.current_user_id)
                .execute()
            )
        except APIError as e:
            logger.error(f"Failed to get actual: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to get actual"
            )

        if not response.data:
            return None

        return ActualSchema(**response.data[0])

    async def create_actual(
        self, auth_context: AuthContext, payload: CreateActualSchema
    ) -> ActualSchema:
        """Create a new actual."""

        return None

    async def update_actual(
        self, actual_id: UUID, auth_context: AuthContext, payload: ActualSchema
    ) -> ActualSchema:
        """Update an actual."""

        return None


actual_service = ActualService()
