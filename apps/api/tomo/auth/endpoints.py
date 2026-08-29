from fastapi import APIRouter, Request

from tomo.auth.schemas import (
    CreateAccountSchema,
    CreateDevAccountSchema,
    CreateInviteCodeSchema,
)
from tomo.core.config import settings
from tomo.core.rate_limiter import limiter
from tomo.dependencies import (
    AuthContextDependency,
    AuthServiceDependency,
    PublicClientDependency,
    ServiceClientDependency,
)

router = APIRouter(prefix="/auth", tags=["Auth Endpoints"])


if settings.ENVIRONMENT == "development" and settings.ENABLE_DEV_AUTH:

    @router.post("/create-dev-account")
    async def create_dev_account(
        payload: CreateDevAccountSchema,
        service_client: ServiceClientDependency,
        service: AuthServiceDependency,
    ):
        """Create a confirmed account without an invitation code"""
        return await service.create_dev_account(payload, service_client)


@router.post("/signup")
@limiter.limit("10/minute")
async def signup(
    request: Request,
    payload: CreateAccountSchema,
    public_client: PublicClientDependency,
    service_client: ServiceClientDependency,
    service: AuthServiceDependency,
):
    """Signup a new user."""
    return await service.signup(payload, public_client, service_client)


@router.post("/create-invitation")
@limiter.limit("20/minute")
async def create_invitation(
    request: Request,
    payload: CreateInviteCodeSchema,
    auth_context: AuthContextDependency,
    service: AuthServiceDependency,
):
    """Create a new invitation."""
    return await service.create_invitation(payload, auth_context)
