@echo off
REM Start Celery beat scheduler for periodic tasks (Windows)

REM Set environment
set PYTHONPATH=%PYTHONPATH%;%CD%

REM Start Celery beat
celery -A app.core.celery_app beat --loglevel=info
