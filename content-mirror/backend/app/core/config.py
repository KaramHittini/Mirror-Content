from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_env: str = "development"
    app_secret_key: str = "change-me"
    app_allowed_origins: list[str] = ["http://localhost:3000"]

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/content_mirror"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Storage
    storage_backend: str = "local"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_bucket_name: str = "content-mirror-uploads"
    aws_region: str = "us-east-1"
    local_upload_dir: str = "./uploads"

    # AI
    gemini_api_key: str = ""
    ai_model: str = "gemini-2.0-flash"

    # Monitoring
    sentry_dsn: str = ""

    # Vector DB
    pinecone_api_key: str = ""
    pinecone_index_name: str = "content-mirror-benchmarks"
    pinecone_env: str = "us-east-1-aws"

    # JWT
    jwt_secret: str = "change-me-jwt"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # Rate Limiting
    rate_limit_free_analyses_per_month: int = 5
    rate_limit_pro_analyses_per_month: int = 100

    # Celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
