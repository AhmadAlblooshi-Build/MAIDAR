@echo off
REM Start Celery worker for processing background tasks (Windows)

REM Set environment
set PYTHONPATH=%PYTHONPATH%;%CD%

REM Start Celery worker
celery -A app.core.celery_app worker --loglevel=info --concurrency=4 --pool=solo --queues=emails,simulations,celery
