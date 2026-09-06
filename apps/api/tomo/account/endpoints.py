from fastapi import APIRouter, Request

from tomo.account.schemas import UpdateProfileSchema
from tomo.core.rate_limiter import limiter
from tomo.dependencies import (
    AccountServiceDependency,
    AuthContextDependency,
)

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/profile")
@limiter.limit("20/minute")
async def get_profile(
    request: Request,
    auth_context: AuthContextDependency,
    service: AccountServiceDependency,
):
    """Get the user's profile."""
    return await service.get_profile(auth_context)


@router.patch("/profile")
@limiter.limit("20/minute")
async def update_profile(
    request: Request,
    payload: UpdateProfileSchema,
    auth_context: AuthContextDependency,
    service: AccountServiceDependency,
):
    """Update the user's profile."""
    return await service.update_profile(payload, auth_context)
