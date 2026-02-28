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

echo "Starting MAIDAR Backend on port $PORT..."

# Run uvicorn with the dynamic port
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --no-server-header
