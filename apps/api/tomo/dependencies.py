import logging
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from supabase import (
    AsyncClient,
    AsyncClientOptions,
    AuthApiError,
    SupabaseException,
    acreate_client,
)
from tomo.auth.service import AuthService, auth_service
from tomo.core.config import settings

security = HTTPBearer(auto_error=False)

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class AuthContext:
    client: AsyncClient
    current_user_id: str
    token: str


async def get_auth_context(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> AuthContext:
    """Build an authenticated supabase client and validate the bearer token."""

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized"
        )

    token = credentials.credentials
    supabase_client = await acreate_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
        options=AsyncClientOptions(
            headers={"Authorization": f"Bearer {token}"},
            auto_refresh_token=False,
            persist_session=False,
        ),
    )

    try:
        response = await supabase_client.auth.get_user(token)
    except AuthApiError as e:
        logger.warning(f"Failed to validate token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )

    if not response or not response.user:
        logger.warning("Invalid or expired token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return AuthContext(
        client=supabase_client,
        current_user_id=response.user.id,
        token=token,
    )


AuthContextDependency = Annotated[AuthContext, Depends(get_auth_context)]


async def get_public_client() -> AsyncClient:
    """Returns a public supabase client."""

    try:
        supabase_client = await acreate_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY,
            options=AsyncClientOptions(
                auto_refresh_token=False,
                persist_session=False,
            ),
        )
        return supabase_client
    except SupabaseException as e:
        logger.error(f"Failed to create public supabase client: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


PublicClientDependency = Annotated[AsyncClient, Depends(get_public_client)]


def get_auth_service() -> AuthService:
    """Returns the auth service instance."""

    return auth_service


AuthServiceDependency = Annotated[AuthService, Depends(get_auth_service)]
