#!/bin/bash
# Railway startup script - handles dynamic PORT variable

# Use Railway's PORT if set, otherwise default to 8000
PORT=${PORT:-8000}

echo "=========================================="
echo "MAIDAR Backend Startup"
echo "=========================================="

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

if [ $? -eq 0 ]; then
    echo "✓ Database migrations completed successfully"
else
    echo "✗ Database migration failed!"
    exit 1
fi

# Create super admin user if it doesn't exist
echo "Checking for super admin user..."
python create_admin_on_startup.py

echo ""
echo "Starting Celery worker in background..."
# Start Celery worker in background (for async email tasks)
celery -A app.core.celery_app worker --loglevel=info --concurrency=2 &

# Store Celery PID
CELERY_PID=$!

echo "✓ Celery worker started (PID: $CELERY_PID)"
echo ""
echo "Starting MAIDAR Backend on port $PORT..."

# Run uvicorn with the dynamic port
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --no-server-header
