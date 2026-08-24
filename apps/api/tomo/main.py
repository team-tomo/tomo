from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from tomo.api import router
from tomo.core.config import settings


def configure_hosts(application: FastAPI) -> None:
    """Configure trusted hosts for the application."""
    application.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )


def configure_cors(application: FastAPI) -> None:
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

    configure_cors(application)
    # rate_limit_config(application)
    if settings.ENVIRONMENT == "production":
        configure_hosts(application)

    application.include_router(router)

    return application


app = create_app()
