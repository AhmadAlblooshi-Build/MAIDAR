#!/bin/bash
# Railway startup script - handles dynamic PORT variable

# Use Railway's PORT if set, otherwise default to 8000
PORT=${PORT:-8000}

echo "Starting MAIDAR Backend on port $PORT..."

# Run uvicorn with the dynamic port
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --no-server-header
