"""
MAIDAR - Human Risk Intelligence Platform
Main FastAPI application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.core.security_middleware import SecurityHeadersMiddleware, RateLimitMiddleware
from app.core.monitoring import init_monitoring
from app.api import auth, risk, employees, analytics, scenarios, simulations, tenants, admin_users, audit_logs, rbac, email_tracking, notifications, mfa, sessions, health
from app.api import settings as settings_api

# Initialize monitoring (Sentry)
init_monitoring()

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

# CORS middleware - Must be added BEFORE other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Session-ID"],
    max_age=3600  # Cache preflight for 1 hour
)

# Trusted Host Middleware (prevent host header attacks)
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )


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


# Exception handlers
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Handle validation errors."""
    return JSONResponse(
        status_code=400,
        content={"error": "Validation Error", "detail": str(exc)}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    if settings.DEBUG:
        raise exc  # In debug mode, show full traceback

    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": "An unexpected error occurred"}
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
