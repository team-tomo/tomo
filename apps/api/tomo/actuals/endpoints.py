from uuid import UUID

from fastapi import APIRouter, Request

from tomo.actuals.schemas import ActualInputSchema, ActualSchema
from tomo.core.rate_limiter import limiter
from tomo.dependencies import ActualServiceDependency, AuthContextDependency

router = APIRouter(prefix="/actuals", tags=["actuals"])


@router.get("")
@limiter.limit("20/minute")
async def list_actuals(
    request: Request,
    auth_context: AuthContextDependency,
    service: ActualServiceDependency,
) -> list[ActualSchema]:
    """List the signed-in profile's actuals."""
    return await service.list_actuals(auth_context)


@router.get("/{actual_id}")
@limiter.limit("20/minute")
async def get_actual(
    request: Request,
    actual_id: UUID,
    auth_context: AuthContextDependency,
    service: ActualServiceDependency,
) -> ActualSchema:
    """Get one actual owned by the signed-in profile."""
    return await service.get_actual(actual_id, auth_context)


@router.post("")
@limiter.limit("20/minute")
async def create_actual(
    request: Request,
    auth_context: AuthContextDependency,
    service: ActualServiceDependency,
    payload: ActualInputSchema,
) -> ActualSchema:
    """Create an actual for the signed-in profile."""
    return await service.create_actual(auth_context, payload)


@router.patch("/{actual_id}")
@limiter.limit("20/minute")
async def update_actual(
    request: Request,
    actual_id: UUID,
    auth_context: AuthContextDependency,
    service: ActualServiceDependency,
    payload: ActualInputSchema,
) -> ActualSchema:
    """Update an actual owned by the signed-in profile."""
    return await service.update_actual(actual_id, auth_context, payload)
