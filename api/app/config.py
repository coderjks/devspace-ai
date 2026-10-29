from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "DevSpace AI API"
    app_env: str = Field(default="development", alias="APP_ENV")
    debug: bool = Field(default=False, alias="DEBUG")

    database_url: str = Field(
        default="postgresql+psycopg://devspace:devspace@localhost:5432/devspace",
        alias="DATABASE_URL",
    )
    # Direct (non-pooled) URL for migrations/dumps/replication. On Neon this is
    # the hostname WITHOUT the -pooler suffix; locally it may be empty.
    database_url_unpooled: str = Field(default="", alias="DATABASE_URL_UNPOOLED")
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    jwt_secret_key: str = Field(default="dev-only-change-me-in-production-32-chars-min", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expires_minutes: int = Field(default=60 * 24, alias="JWT_EXPIRES_MINUTES")
    cookie_secure: bool = Field(default=False, alias="COOKIE_SECURE")
    cookie_name: str = Field(default="devspace_session", alias="COOKIE_NAME")

    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    seed_demo_email: str = Field(default="demo@devspace.ai", alias="SEED_DEMO_EMAIL")
    seed_demo_password: str = Field(default="DemoPass123!", alias="SEED_DEMO_PASSWORD")
    seed_demo_name: str = Field(default="Demo Student", alias="SEED_DEMO_NAME")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def migration_database_url(self) -> str:
        """Direct connection for Alembic; falls back to DATABASE_URL locally."""
        return self.database_url_unpooled or self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
