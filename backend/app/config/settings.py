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
    DATABASE_POOL_SIZE: int = 50  # Increased for production load
    DATABASE_MAX_OVERFLOW: int = 50  # Increased for concurrent requests
    DATABASE_POOL_TIMEOUT: int = 60  # Increased timeout for waiting connections
    DATABASE_POOL_RECYCLE: int = 3600  # Recycle connections after 1 hour

    # Security
    SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_USE_STRONG_RANDOM_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Encryption (AES-256)
    ENCRYPTION_KEY: Optional[str] = None  # Base64-encoded 32-byte key

    # TLS/SSL
    USE_TLS: bool = True
    TLS_VERSION: str = "TLSv1.3"

    # Trusted Hosts (for TrustedHostMiddleware)
    ALLOWED_HOSTS: list = ["*.maidar.com", "localhost", "127.0.0.1", "*.railway.app", "*.up.railway.app"]

    # Data Residency & Compliance
    DATA_RESIDENCY_REGION: str = "UAE"
    COMPLIANCE_MODE: str = "UAE_PDPL"  # UAE Personal Data Protection Law

    # Redis (caching)
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS (Cross-Origin Resource Sharing)
    # Can be overridden with ALLOWED_ORIGINS environment variable (comma-separated)
    ALLOWED_ORIGINS: Optional[str] = None  # e.g., "https://app1.com,https://app2.com"
    CORS_ORIGINS: list = []  # Will be populated in __init__

    # Monitoring
    SENTRY_DSN: Optional[str] = None

    # Risk Engine
    RISK_ENGINE_VERSION: str = "v1.0"

    # Email (SendGrid)
    SENDGRID_API_KEY: Optional[str] = None  # SendGrid API key for sending emails
    FROM_EMAIL: str = "noreply@maidar.com"
    FROM_NAME: str = "MAIDAR"

    # Legacy AWS SES (kept for future use)
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None

    # Legacy SMTP (kept for backward compatibility, not used)
    SMTP_SERVER: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Convert Railway/Heroku postgresql:// to postgresql+psycopg:// for psycopg3
        if self.DATABASE_URL.startswith("postgresql://"):
            self.DATABASE_URL = self.DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
        elif self.DATABASE_URL.startswith("postgres://"):
            self.DATABASE_URL = self.DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)

        # Set CORS origins - ALWAYS include Vercel production domain
        # Start with required production domains
        required_origins = [
            "https://maidar.vercel.app",  # Production frontend (REQUIRED)
        ]

        # Add development origins
        dev_origins = [
            "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:8000",
            "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002", "http://127.0.0.1:8000",
        ]

        # Combine: required + dev + custom from environment
        if self.ALLOWED_ORIGINS:
            custom_origins = [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
            self.CORS_ORIGINS = list(set(required_origins + custom_origins + dev_origins))
            print(f"✅ [CORS] Configured with custom origins: {self.CORS_ORIGINS}")
        else:
            self.CORS_ORIGINS = list(set(required_origins + dev_origins))
            print(f"✅ [CORS] Using default origins: {self.CORS_ORIGINS}")


settings = Settings()
