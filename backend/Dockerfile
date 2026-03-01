# MAIDAR Backend Dockerfile
# Production-ready Python/FastAPI container

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for Docker layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app
COPY ./alembic ./alembic
COPY ./alembic.ini ./alembic.ini
COPY ./start.sh ./start.sh
COPY ./create_admin_on_startup.py ./create_admin_on_startup.py

# Make start script executable
RUN chmod +x start.sh

# Create non-root user for security
RUN useradd -m -u 1000 maidar && chown -R maidar:maidar /app
USER maidar

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
# Uses start.sh to handle dynamic PORT variable for Railway
CMD ["bash", "start.sh"]
