#!/bin/bash
# Start Celery worker for processing background tasks

# Set environment
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Start Celery worker
celery -A app.core.celery_app worker \
    --loglevel=info \
    --concurrency=4 \
    --max-tasks-per-child=1000 \
    --queues=emails,simulations,celery \
    --hostname=worker@%h
