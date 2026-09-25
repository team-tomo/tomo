from uuid import UUID

from fastapi import APIRouter, Request

from tomo.account.schemas import ReassignManagerSchema, UpdateProfileSchema
from tomo.core.rate_limiter import limiter
from tomo.dependencies import (
    AccountServiceDependency,
    AuthContextDependency,
    ServiceClientDependency,
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


@router.get("/profiles")
@limiter.limit("20/minute")
async def list_profiles(
    request: Request,
    auth_context: AuthContextDependency,
    service_client: ServiceClientDependency,
    service: AccountServiceDependency,
):
    """List every Profile for Manage Accounts. Dev, Executive, and Support only."""
    return await service.list_profiles(auth_context, service_client)


@router.get("/managers")
@limiter.limit("20/minute")
async def list_managers(
    request: Request,
    auth_context: AuthContextDependency,
    service: AccountServiceDependency,
):
    """List active Leads and Executives the current Profile may pick."""
    return await service.list_managers(auth_context)


@router.patch("/profiles/{profile_id}/manager")
@limiter.limit("20/minute")
async def reassign_manager(
    request: Request,
    profile_id: UUID,
    payload: ReassignManagerSchema,
    auth_context: AuthContextDependency,
    service_client: ServiceClientDependency,
    service: AccountServiceDependency,
):
    """Admin-only: change another Profile's Manager."""
    return await service.reassign_manager(
        str(profile_id),
        str(payload.manager_id),
        auth_context,
        service_client,
    )
