"""
MAIDAR - Human Risk Intelligence Platform
Main FastAPI application
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config.settings import settings
from app.core.security_middleware import SecurityHeadersMiddleware, RateLimitMiddleware
from app.core.monitoring import init_monitoring
from app.api import auth, risk, employees, analytics, scenarios, simulations, tenants, admin_users, audit_logs, rbac, email_tracking, notifications, mfa, sessions, health, assessments
from app.api import settings as settings_api

# Configure logging
logger = logging.getLogger(__name__)

# Initialize monitoring (Sentry)
init_monitoring()


def run_migrations():
    """Run Alembic migrations on startup with timeout protection."""
    import signal

    def timeout_handler(signum, frame):
        raise TimeoutError("Migration timeout - took too long")

    try:
        from alembic.config import Config
        from alembic import command
        import os

        # Get the project root directory
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))

        # Set the script location
        alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))

        logger.info("🔄 Running database migrations...")

        # Set 30 second timeout for migrations (Unix only)
        if hasattr(signal, 'SIGALRM'):
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(30)

        try:
            command.upgrade(alembic_cfg, "head")
            logger.info("✅ Database migrations completed successfully")
        finally:
            # Cancel alarm
            if hasattr(signal, 'SIGALRM'):
                signal.alarm(0)

    except TimeoutError as e:
        logger.error(f"⏱️  Migration timeout: {e}")
        logger.warning("⚠️  Continuing without migrations - they may be stuck")
    except Exception as e:
        logger.error(f"❌ Failed to run migrations: {e}")
        logger.warning("⚠️  Continuing without migrations - database may be out of sync")

# Create FastAPI app
# Disable API docs in production for security
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Human Risk Intelligence Platform - Scenario-aware, explainable, deterministic risk scoring",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# CORS middleware - MUST be first to handle OPTIONS preflight
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Session-ID"],
    max_age=3600  # Cache preflight for 1 hour
)

# Security Headers Middleware (OWASP best practices)
# CSP is automatically configured based on DEBUG setting (strict in production)
app.add_middleware(
    SecurityHeadersMiddleware,
    frame_options="DENY",
    hsts_max_age=31536000,  # 1 year
    hsts_include_subdomains=True,
    hsts_preload=True
)

# Rate Limiting Middleware (global)
app.add_middleware(
    RateLimitMiddleware,
    max_requests=1000,  # 1000 requests per minute (increased for production dashboard load)
    window_seconds=60,  # per minute
    exempt_paths=[
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/readiness",  # Kubernetes readiness probe
        "/liveness",   # Kubernetes liveness probe
        "/metrics"     # Prometheus metrics scraping
    ]
)

# Trusted Host Middleware (prevent host header attacks)
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )


# Startup event - Run migrations
@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    logger.info("🚀 Starting MAIDAR backend...")
    run_migrations()


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "compliance": settings.COMPLIANCE_MODE,
        "data_residency": settings.DATA_RESIDENCY_REGION,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "risk_engine_version": settings.RISK_ENGINE_VERSION,
    }


# Include routers
app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_PREFIX}/auth",
    tags=["Authentication"]
)

app.include_router(
    mfa.router,
    prefix=f"{settings.API_V1_PREFIX}/mfa",
    tags=["Multi-Factor Authentication"]
)

app.include_router(
    sessions.router,
    prefix=f"{settings.API_V1_PREFIX}/sessions",
    tags=["Session Management"]
)

# Health & Metrics (no prefix for Kubernetes probes)
app.include_router(
    health.router,
    tags=["Health & Metrics"]
)

# CORS Test Endpoint
@app.get("/cors-test")
async def cors_test():
    """Simple endpoint to test CORS is working"""
    return {"status": "ok", "message": "CORS is working!", "cors_origins": settings.CORS_ORIGINS}

app.include_router(
    risk.router,
    prefix=f"{settings.API_V1_PREFIX}/risk",
    tags=["Risk Scoring"]
)

app.include_router(
    employees.router,
    prefix=f"{settings.API_V1_PREFIX}/employees",
    tags=["Employees"]
)

app.include_router(
    analytics.router,
    prefix=f"{settings.API_V1_PREFIX}/analytics",
    tags=["Analytics"]
)

app.include_router(
    scenarios.router,
    prefix=f"{settings.API_V1_PREFIX}/scenarios",
    tags=["Scenarios"]
)

app.include_router(
    simulations.router,
    prefix=f"{settings.API_V1_PREFIX}/simulations",
    tags=["Simulations"]
)

app.include_router(
    tenants.router,
    prefix=f"{settings.API_V1_PREFIX}/tenants",
    tags=["Tenants"]
)

app.include_router(
    admin_users.router,
    prefix=f"{settings.API_V1_PREFIX}/admin-users",
    tags=["Admin Users"]
)

app.include_router(
    audit_logs.router,
    prefix=f"{settings.API_V1_PREFIX}/audit-logs",
    tags=["Audit Logs"]
)

app.include_router(
    rbac.router,
    prefix=f"{settings.API_V1_PREFIX}/rbac",
    tags=["RBAC Management"]
)

app.include_router(
    email_tracking.router,
    prefix=f"{settings.API_V1_PREFIX}/email",
    tags=["Email Tracking"]
)

app.include_router(
    notifications.router,
    prefix=f"{settings.API_V1_PREFIX}/notifications",
    tags=["Notifications"]
)

app.include_router(
    settings_api.router,
    prefix=f"{settings.API_V1_PREFIX}/settings",
    tags=["Settings"]
)

app.include_router(
    assessments.router,
    prefix=f"{settings.API_V1_PREFIX}/assessments",
    tags=["Assessments"]
)


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    """Handle Pydantic validation errors with CORS headers."""
    return JSONResponse(
        status_code=422,
        content={"error": "Validation Error", "detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )


@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Handle validation errors with CORS headers."""
    return JSONResponse(
        status_code=400,
        content={"error": "Validation Error", "detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions with CORS headers."""
    # Don't catch HTTPException - let FastAPI handle it
    from fastapi import HTTPException as FastAPIHTTPException
    if isinstance(exc, FastAPIHTTPException):
        raise exc

    if settings.DEBUG:
        raise exc  # In debug mode, show full traceback

    # Log the error for debugging
    logger.error(f"Unhandled exception: {type(exc).__name__}: {str(exc)}")

    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": f"{type(exc).__name__}: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
