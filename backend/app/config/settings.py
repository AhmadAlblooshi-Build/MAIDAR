"""Application configuration settings."""

from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    For production, set these in .env file or environment.
    """

    # Application
    APP_NAME: str = "MAIDAR"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    TESTING: bool = False  # Enable testing mode for E2E tests (relaxed rate limiting)
    API_V1_PREFIX: str = "/api/v1"
    FRONTEND_URL: str = "http://localhost:3000"

    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/maidar"  # Using psycopg3
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    # Security
    SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_USE_STRONG_RANDOM_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Encryption (AES-256)
    ENCRYPTION_KEY: Optional[str] = None  # Base64-encoded 32-byte key

    # TLS/SSL
    USE_TLS: bool = True
    TLS_VERSION: str = "TLSv1.3"

    # Data Residency & Compliance
    DATA_RESIDENCY_REGION: str = "UAE"
    COMPLIANCE_MODE: str = "UAE_PDPL"  # UAE Personal Data Protection Law

    # Redis (caching)
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS (Cross-Origin Resource Sharing)
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:8000"]

    # Monitoring
    SENTRY_DSN: Optional[str] = None

    # Risk Engine
    RISK_ENGINE_VERSION: str = "v1.0"

    # Email (SMTP)
    SMTP_SERVER: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    FROM_EMAIL: str = "noreply@maidar.com"
    FROM_NAME: str = "MAIDAR"

    # Claude AI API
    ANTHROPIC_API_KEY: Optional[str] = None

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60

    # Session
    SESSION_SECRET_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
