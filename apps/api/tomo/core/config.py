import os
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict

APP_TIME_ZONE = ZoneInfo("Asia/Manila")


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    ENABLE_DEV_AUTH: bool = False
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173"]
    ALLOWED_HOSTS: list[str] = ["localhost", "127.0.0.1"]
    SUPABASE_URL: str = ""
    SUPABASE_PUBLIC_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env", extra="ignore", case_sensitive=True
    )


settings = Settings()

ai_provider = {
    "OPENAI_API_KEY": settings.OPENAI_API_KEY,
    "GOOGLE_API_KEY": settings.GOOGLE_API_KEY,
    "ANTHROPIC_API_KEY": settings.ANTHROPIC_API_KEY,
}

for key, value in ai_provider.items():
    if value:
        os.environ.setdefault(key, value)
