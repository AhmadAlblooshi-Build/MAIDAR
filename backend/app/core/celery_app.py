"""
Celery application configuration for background task processing.
"""

from celery import Celery
from celery.schedules import crontab
from app.config.settings import settings

# Initialize Celery app
celery_app = Celery(
    "maidar",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.email_tasks",
        "app.tasks.simulation_tasks",
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task configuration
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task execution
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=270,  # Soft limit before hard kill

    # Task result backend
    result_expires=3600,  # Results expire after 1 hour
    result_backend_transport_options={"master_name": "mymaster"},

    # Worker configuration
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks (memory leak prevention)

    # Retry configuration
    task_acks_late=True,  # Acknowledge task after completion
    task_reject_on_worker_lost=True,  # Retry on worker crash

    # Rate limiting
    task_default_rate_limit="100/m",  # 100 tasks per minute default
)

# Periodic tasks schedule
celery_app.conf.beat_schedule = {
    # Check for scheduled simulations every minute
    "launch-scheduled-simulations": {
        "task": "app.tasks.simulation_tasks.launch_scheduled_simulations",
        "schedule": 60.0,  # Every 60 seconds
    },

    # Recalculate risk scores daily at 2 AM UTC
    "recalculate-risk-scores": {
        "task": "app.tasks.simulation_tasks.recalculate_all_risk_scores",
        "schedule": crontab(hour=2, minute=0),
    },

    # Clean up expired sessions every hour
    "cleanup-expired-sessions": {
        "task": "app.tasks.email_tasks.cleanup_expired_sessions",
        "schedule": crontab(minute=0),  # Every hour
    },
}

# Task routes (for queue organization)
celery_app.conf.task_routes = {
    "app.tasks.email_tasks.*": {"queue": "emails"},
    "app.tasks.simulation_tasks.*": {"queue": "simulations"},
}
