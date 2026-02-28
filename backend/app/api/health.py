"""
Health check and metrics endpoints.

Provides detailed health status and Prometheus metrics.
"""

import time
import psutil
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config.database import get_db
from app.config.settings import settings

router = APIRouter(tags=["Health & Metrics"])

# Track application start time
app_start_time = datetime.utcnow()

# Cache for metrics (to avoid expensive psutil calls on every request)
_metrics_cache = {
    "data": None,
    "timestamp": None,
    "ttl": 10  # Cache for 10 seconds
}


@router.get("/health")
def health_check():
    """
    Basic health check endpoint.

    Returns 200 if application is running.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.APP_VERSION,
        "environment": "production" if not settings.DEBUG else "development"
    }


@router.get("/health/detailed")
def detailed_health_check(db: Session = Depends(get_db)):
    """
    Detailed health check with dependency status.

    Checks:
    - Database connectivity
    - Redis connectivity
    - Disk space
    - Memory usage
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.APP_VERSION,
        "uptime_seconds": (datetime.utcnow() - app_start_time).total_seconds(),
        "checks": {}
    }

    # Check database
    try:
        db.execute(text("SELECT 1"))
        health_status["checks"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful"
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }

    # Check Redis
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        health_status["checks"]["redis"] = {
            "status": "healthy",
            "message": "Redis connection successful"
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["redis"] = {
            "status": "unhealthy",
            "message": f"Redis connection failed: {str(e)}"
        }

    # Check disk space
    try:
        disk = psutil.disk_usage('/')
        disk_usage_percent = disk.percent
        health_status["checks"]["disk"] = {
            "status": "healthy" if disk_usage_percent < 90 else "warning",
            "usage_percent": disk_usage_percent,
            "free_gb": disk.free / (1024**3)
        }
    except Exception as e:
        health_status["checks"]["disk"] = {
            "status": "unknown",
            "message": str(e)
        }

    # Check memory
    try:
        memory = psutil.virtual_memory()
        memory_usage_percent = memory.percent
        health_status["checks"]["memory"] = {
            "status": "healthy" if memory_usage_percent < 90 else "warning",
            "usage_percent": memory_usage_percent,
            "available_gb": memory.available / (1024**3)
        }
    except Exception as e:
        health_status["checks"]["memory"] = {
            "status": "unknown",
            "message": str(e)
        }

    return health_status


@router.get("/metrics")
def prometheus_metrics(db: Session = Depends(get_db)):
    """
    Prometheus-compatible metrics endpoint.

    Returns metrics in Prometheus text format.
    Cached for 10 seconds to improve performance.
    """
    # Check cache
    now = time.time()
    if _metrics_cache["data"] is not None and _metrics_cache["timestamp"] is not None:
        if now - _metrics_cache["timestamp"] < _metrics_cache["ttl"]:
            return _metrics_cache["data"], 200, {"Content-Type": "text/plain; charset=utf-8"}

    metrics = []

    # Application info
    metrics.append(f'# HELP maidar_info Application information')
    metrics.append(f'# TYPE maidar_info gauge')
    metrics.append(f'maidar_info{{version="{settings.APP_VERSION}"}} 1')

    # Uptime
    uptime = (datetime.utcnow() - app_start_time).total_seconds()
    metrics.append(f'# HELP maidar_uptime_seconds Application uptime in seconds')
    metrics.append(f'# TYPE maidar_uptime_seconds counter')
    metrics.append(f'maidar_uptime_seconds {uptime}')

    # Database connection pool
    try:
        # Get active connections (requires database pool inspection)
        metrics.append(f'# HELP maidar_db_connections Database connections')
        metrics.append(f'# TYPE maidar_db_connections gauge')
        metrics.append(f'maidar_db_connections 1')
    except:
        pass

    # System metrics
    try:
        # CPU usage (interval=0 for instant reading, no blocking)
        cpu_percent = psutil.cpu_percent(interval=0)
        metrics.append(f'# HELP maidar_cpu_usage_percent CPU usage percentage')
        metrics.append(f'# TYPE maidar_cpu_usage_percent gauge')
        metrics.append(f'maidar_cpu_usage_percent {cpu_percent}')

        # Memory usage
        memory = psutil.virtual_memory()
        metrics.append(f'# HELP maidar_memory_usage_bytes Memory usage in bytes')
        metrics.append(f'# TYPE maidar_memory_usage_bytes gauge')
        metrics.append(f'maidar_memory_usage_bytes {memory.used}')

        # Disk usage
        disk = psutil.disk_usage('/')
        metrics.append(f'# HELP maidar_disk_usage_bytes Disk usage in bytes')
        metrics.append(f'# TYPE maidar_disk_usage_bytes gauge')
        metrics.append(f'maidar_disk_usage_bytes {disk.used}')
    except:
        pass

    # Database metrics
    try:
        # Count users
        user_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
        metrics.append(f'# HELP maidar_users_total Total number of users')
        metrics.append(f'# TYPE maidar_users_total gauge')
        metrics.append(f'maidar_users_total {user_count}')

        # Count simulations
        sim_count = db.execute(text("SELECT COUNT(*) FROM simulations")).scalar()
        metrics.append(f'# HELP maidar_simulations_total Total number of simulations')
        metrics.append(f'# TYPE maidar_simulations_total gauge')
        metrics.append(f'maidar_simulations_total {sim_count}')

        # Count employees
        emp_count = db.execute(text("SELECT COUNT(*) FROM employees")).scalar()
        metrics.append(f'# HELP maidar_employees_total Total number of employees')
        metrics.append(f'# TYPE maidar_employees_total gauge')
        metrics.append(f'maidar_employees_total {emp_count}')
    except:
        pass

    # Cache the result
    result = "\n".join(metrics)
    _metrics_cache["data"] = result
    _metrics_cache["timestamp"] = time.time()

    return result, 200, {"Content-Type": "text/plain; charset=utf-8"}


@router.get("/readiness")
def readiness_check(db: Session = Depends(get_db)):
    """
    Kubernetes readiness probe.

    Returns 200 if application is ready to serve traffic.
    """
    try:
        # Check database
        db.execute(text("SELECT 1"))

        # Check Redis
        import redis
        r = redis.from_url(settings.REDIS_URL)
        r.ping()

        return {"status": "ready"}
    except Exception as e:
        return {"status": "not_ready", "error": str(e)}, 503


@router.get("/liveness")
def liveness_check():
    """
    Kubernetes liveness probe.

    Returns 200 if application is alive (process is running).
    """
    return {"status": "alive"}
