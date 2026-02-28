# Celery Background Tasks - MAIDAR

## Overview

MAIDAR uses **Celery** for asynchronous background task processing with **Redis** as the message broker and result backend.

## Architecture

```
┌──────────────┐         ┌─────────────┐         ┌──────────────┐
│   FastAPI    │────────>│    Redis    │<────────│    Celery    │
│   Backend    │  Queue  │   Broker    │  Fetch  │    Worker    │
└──────────────┘  Tasks  └─────────────┘  Tasks  └──────────────┘
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │  Send Emails │
                                                  │  Update DB   │
                                                  └──────────────┘
```

## Task Categories

### Email Tasks (`app/tasks/email_tasks.py`)
- `send_welcome_email` - New user welcome emails
- `send_password_reset_email` - Password reset emails
- `send_phishing_simulation_email` - Phishing test emails to employees
- `send_simulation_launch_notification` - Admin notifications
- `cleanup_expired_sessions` - Periodic session cleanup

### Simulation Tasks (`app/tasks/simulation_tasks.py`)
- `launch_simulation_emails` - Queue phishing emails for all targets
- `launch_scheduled_simulations` - Auto-launch scheduled simulations (runs every minute)
- `recalculate_all_risk_scores` - Daily risk score updates (runs at 2 AM UTC)
- `complete_simulation` - Finalize simulation and calculate statistics

## Starting Celery Services

### On Linux/Mac

```bash
# Terminal 1: Start Celery Worker
cd backend
chmod +x start_celery_worker.sh
./start_celery_worker.sh

# Terminal 2: Start Celery Beat (Scheduler)
chmod +x start_celery_beat.sh
./start_celery_beat.sh

# Terminal 3 (Optional): Start Flower Monitoring
chmod +x start_flower.sh
./start_flower.sh
# Access at http://localhost:5555
# Login: admin / maidar_flower_2024
```

### On Windows

```cmd
REM Terminal 1: Start Celery Worker
cd backend
start_celery_worker.bat

REM Terminal 2: Start Celery Beat (Scheduler)
start_celery_beat.bat
```

### Using Docker (Production)

```yaml
# Add to docker-compose.yml
services:
  celery-worker:
    build: ./backend
    command: celery -A app.core.celery_app worker --loglevel=info --concurrency=4
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgresql+psycopg://postgres:password@postgres:5432/maidar
    depends_on:
      - redis
      - postgres

  celery-beat:
    build: ./backend
    command: celery -A app.core.celery_app beat --loglevel=info
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis

  flower:
    build: ./backend
    command: celery -A app.core.celery_app flower --port=5555
    ports:
      - "5555:5555"
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
```

## Configuration

### Task Queues

- **emails** - All email-sending tasks (high priority)
- **simulations** - Simulation-related tasks (medium priority)
- **celery** - Default queue for general tasks

### Retry Configuration

- Email tasks: Max 3 retries with exponential backoff
- Phishing emails: Max 2 retries (to avoid spam filters)
- Retry delay: 60 seconds × 2^(retry_number)

### Performance Tuning

```python
# In celery_app.py

# Concurrency (number of worker processes)
worker_concurrency = 4  # Adjust based on CPU cores

# Task time limits
task_time_limit = 300  # 5 minutes hard limit
task_soft_time_limit = 270  # 4.5 minutes soft limit

# Memory management
worker_max_tasks_per_child = 1000  # Restart worker after 1000 tasks
```

## Periodic Tasks (Celery Beat)

| Task | Schedule | Purpose |
|------|----------|---------|
| `launch_scheduled_simulations` | Every 60 seconds | Auto-launch simulations at scheduled time |
| `recalculate_all_risk_scores` | Daily at 2 AM UTC | Update employee risk scores |
| `cleanup_expired_sessions` | Every hour | Remove expired sessions from Redis |

## Monitoring

### Flower Dashboard

Access Flower at `http://localhost:5555`

Features:
- Real-time task monitoring
- Worker status and metrics
- Task history and success/failure rates
- Queue lengths and throughput
- Retry attempts and failures

### Logging

All tasks log to:
- Console (development)
- File: `logs/celery.log` (production)
- Sentry (production errors)

### Health Checks

```bash
# Check worker status
celery -A app.core.celery_app inspect active

# Check scheduled tasks
celery -A app.core.celery_app inspect scheduled

# Check registered tasks
celery -A app.core.celery_app inspect registered
```

## Common Operations

### Manually Trigger a Task

```python
from app.tasks.email_tasks import send_welcome_email

# Queue task asynchronously
result = send_welcome_email.delay(
    to_email="user@example.com",
    full_name="John Doe",
    verification_code="123456"
)

# Check task status
result.ready()  # True if complete
result.successful()  # True if succeeded
result.result  # Task return value
```

### Clear All Queues

```bash
# WARNING: This deletes all pending tasks
celery -A app.core.celery_app purge
```

### Restart Workers

```bash
# Graceful restart (finish current tasks)
celery -A app.core.celery_app control shutdown

# Then restart with your start script
./start_celery_worker.sh
```

## Production Deployment

### Systemd Service (Linux)

Create `/etc/systemd/system/celery-worker.service`:

```ini
[Unit]
Description=Celery Worker for MAIDAR
After=network.target redis.service postgresql.service

[Service]
Type=forking
User=maidar
Group=maidar
WorkingDirectory=/opt/maidar/backend
ExecStart=/opt/maidar/backend/start_celery_worker.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable celery-worker
sudo systemctl start celery-worker
sudo systemctl status celery-worker
```

### Supervisor (Alternative)

```ini
[program:celery-worker]
command=/opt/maidar/backend/start_celery_worker.sh
directory=/opt/maidar/backend
user=maidar
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/celery/worker.log
```

## Troubleshooting

### Worker Not Processing Tasks

```bash
# 1. Check Redis connection
redis-cli ping  # Should return PONG

# 2. Check worker is running
celery -A app.core.celery_app inspect active

# 3. Check for errors in logs
tail -f logs/celery.log
```

### Tasks Failing

```bash
# View failed tasks in Flower
# Or inspect programmatically:
celery -A app.core.celery_app inspect failed
```

### High Memory Usage

- Reduce `worker_concurrency`
- Lower `worker_max_tasks_per_child` to restart workers more frequently
- Add memory limits in Docker/systemd

### Email Not Sending

1. Check SMTP configuration in `.env`
2. Verify email service is running: `docker ps | grep maidar`
3. Check task logs for SMTP errors
4. Test SMTP manually:
```python
from app.core.email import email_service
email_service.send_email("test@example.com", "Test", "Body")
```

## Security Considerations

- **SMTP Credentials**: Store in AWS Secrets Manager, not .env in production
- **Flower Access**: Change default password (`--basic_auth=admin:secure_password`)
- **Redis**: Use password authentication (`REDIS_URL=redis://:password@host:6379/0`)
- **Task Signing**: Enable task message signing to prevent unauthorized task injection

## Performance Metrics

Target performance for 10,000 employee simulations:
- Queue time: < 1 second
- Email send rate: 100 emails/minute (SMTP limit)
- Completion time: ~100 minutes for 10,000 emails
- Worker memory: ~200MB per worker process

## Next Steps

1. Install dependencies: `pip install -r requirements.txt`
2. Verify Redis is running: `docker ps | grep redis`
3. Start Celery worker: `./start_celery_worker.sh` (or `.bat` on Windows)
4. Start Celery beat: `./start_celery_beat.sh`
5. (Optional) Start Flower: `./start_flower.sh`
6. Test a simulation launch in the UI

For production deployment, see the deployment guide.
