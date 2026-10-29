from functools import lru_cache

from pydantic import Field, field_validator
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

    llm_provider: str = Field(default="mock", alias="LLM_PROVIDER")
    model_api_base_url: str = Field(
        default="https://api.meta.ai/v1", alias="MODEL_API_BASE_URL"
    )
    model_api_key: str = Field(default="", alias="MODEL_API_KEY")
    model_id: str = Field(default="", alias="MODEL_ID")

    github_app_id: str = Field(default="", alias="GITHUB_APP_ID")
    github_private_key_path: str = Field(default="", alias="GITHUB_APP_PRIVATE_KEY_PATH")
    github_webhook_secret: str = Field(default="", alias="GITHUB_WEBHOOK_SECRET")
    github_api_url: str = Field(default="https://api.github.com", alias="GITHUB_API_URL")

    stt_provider: str = Field(default="mock", alias="STT_PROVIDER")
    stt_api_key: str = Field(default="", alias="STT_API_KEY")
    tts_provider: str = Field(default="mock", alias="TTS_PROVIDER")
    tts_api_key: str = Field(default="", alias="TTS_API_KEY")
    voice_max_bytes: int = Field(default=2 * 1024 * 1024, alias="VOICE_MAX_BYTES")
    voice_max_seconds: int = Field(default=60, alias="VOICE_MAX_SECONDS")
    voice_retention_days: int = Field(default=30, alias="VOICE_RETENTION_DAYS")

    @field_validator("llm_provider", "stt_provider", "tts_provider", mode="before")
    @classmethod
    def _empty_provider_means_mock(cls, v: object) -> object:
        # A present-but-empty env value (e.g. `STT_PROVIDER=` in a local .env)
        # must behave like an unset value, not override the mock default.
        return "mock" if v in (None, "") else v

    @property
    def github_configured(self) -> bool:
        return bool(self.github_app_id and self.github_private_key_path and self.github_webhook_secret)

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
