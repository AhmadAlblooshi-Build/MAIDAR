#!/bin/bash
# Start Celery beat scheduler for periodic tasks

# Set environment
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Start Celery beat
celery -A app.core.celery_app beat \
    --loglevel=info \
    --scheduler=celery.beat:PersistentScheduler
