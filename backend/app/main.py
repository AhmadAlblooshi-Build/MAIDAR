"""
MAIDAR - Human Risk Intelligence Platform
Main FastAPI application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.api import auth, risk, employees, analytics, scenarios, simulations, tenants, admin_users, audit_logs

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Human Risk Intelligence Platform - Scenario-aware, explainable, deterministic risk scoring",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
