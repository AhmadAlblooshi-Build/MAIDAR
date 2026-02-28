#!/bin/bash
# Start Flower monitoring dashboard for Celery

# Set environment
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Start Flower on port 5555
celery -A app.core.celery_app flower \
    --port=5555 \
    --basic_auth=admin:maidar_flower_2024
