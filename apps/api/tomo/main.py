from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from tomo.api import router
from tomo.core.config import settings
from tomo.core.rate_limiter import configure_rate_limiter


def _configure_hosts(application: FastAPI) -> None:
    """Configure trusted hosts for the application."""
    application.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )


def _configure_cors(application: FastAPI) -> None:
    """Configure CORS for the application."""
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(title="Tomo API")

    configure_rate_limiter(application)
    _configure_cors(application)
    if settings.ENVIRONMENT == "production":
        _configure_hosts(application)

    application.include_router(router)
    return application


app = create_app()
