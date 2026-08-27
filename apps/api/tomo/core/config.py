from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173"]
    ALLOWED_HOSTS: list[str] = ["localhost", "127.0.0.1"]
    SUPABASE_URL: str = ""
    SUPABASE_PUBLIC_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env", extra="ignore", case_sensitive=True
    )


settings = Settings()
