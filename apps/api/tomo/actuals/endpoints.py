from uuid import UUID

from fastapi import APIRouter, Request

from tomo.actuals.schemas import ActualSchema, CreateActualSchema
from tomo.core.rate_limiter import limiter
from tomo.dependencies import ActualServiceDependency, AuthContextDependency

router = APIRouter(prefix="/actuals", tags=["actuals"])


@router.get("")
@limiter.limit("20/minute")
async def get_actuals(
    request: Request,
    auth_context: AuthContextDependency,
    service: ActualServiceDependency,
) -> list[ActualSchema]:
    """Get the actuals for the current user."""
    return await service.get_actuals(auth_context)


@router.post("")
@limiter.limit("20/minute")
async def create_actual(
    request: Request,
    auth_context: AuthContextDependency,
    service: ActualServiceDependency,
    payload: CreateActualSchema,
) -> ActualSchema:
    """Create a new actual."""
    return await service.create_actual(auth_context, payload)


@router.patch("/{actual_id}")
@limiter.limit("20/minute")
async def update_actual(
    request: Request,
    actual_id: UUID,
    auth_context: AuthContextDependency,
    service: ActualServiceDependency,
    payload: ActualSchema,
) -> ActualSchema:
    """Update an actual."""
    return await service.update_actual(actual_id, auth_context, payload)
