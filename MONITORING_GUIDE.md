# Monitoring & Observability Guide - MAIDAR

**Complete monitoring setup with Sentry, Prometheus, and health checks**

---

## Overview

MAIDAR monitoring stack provides:
- ✅ **Error Tracking** - Sentry for exceptions and errors
- ✅ **Performance Monitoring** - Request tracing and profiling
- ✅ **System Metrics** - CPU, memory, disk usage
- ✅ **Business Metrics** - Users, simulations, employees count
- ✅ **Health Checks** - Kubernetes-ready probes
- ✅ **Alerting** - Slack/PagerDuty integration

---

## 1. Sentry Setup (Error Tracking)

### Create Sentry Project

```bash
# 1. Sign up at https://sentry.io
# 2. Create new project (Python/FastAPI)
# 3. Get DSN from project settings
```

### Configure Sentry

```bash
# Add to .env
SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

### Features Enabled

- **Error Tracking** - All exceptions automatically captured
- **Performance Monitoring** - Request tracing (10% sample in prod)
- **Release Tracking** - Track deployments
- **User Context** - Associate errors with users
- **Breadcrumbs** - Debug context before errors
- **Privacy** - PII filtering enabled

### Usage in Code

```python
from app.core.monitoring import capture_exception, capture_message

# Capture exception
try:
    risky_operation()
except Exception as e:
    capture_exception(e, user={"id": user.id, "email": user.email})

# Capture message
capture_message("User attempted invalid action", level="warning",
    user_id=user.id, action="delete_simulation")

# Add breadcrumb
from app.core.monitoring import add_breadcrumb
add_breadcrumb("User clicked export button", category="ui", user_id=user.id)
```

---

## 2. Health Checks

### Endpoints

#### Basic Health Check
```bash
GET /health

# Response
{
  "status": "healthy",
  "timestamp": "2026-02-28T10:30:00Z",
  "version": "1.0.0",
  "environment": "production"
}
```

#### Detailed Health Check
```bash
GET /health/detailed

# Response
{
  "status": "healthy",
  "timestamp": "2026-02-28T10:30:00Z",
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Database connection successful"
    },
    "redis": {
      "status": "healthy",
      "message": "Redis connection successful"
    },
    "disk": {
      "status": "healthy",
      "usage_percent": 45.2,
      "free_gb": 120.5
    },
    "memory": {
      "status": "healthy",
      "usage_percent": 62.8,
      "available_gb": 8.2
    }
  }
}
```

#### Readiness Probe (Kubernetes)
```bash
GET /readiness

# Returns 200 if ready to serve traffic
# Returns 503 if dependencies unavailable
```

#### Liveness Probe (Kubernetes)
```bash
GET /liveness

# Returns 200 if process is alive
```

---

## 3. Prometheus Metrics

### Metrics Endpoint

```bash
GET /metrics

# Returns Prometheus text format
# HELP maidar_info Application information
# TYPE maidar_info gauge
maidar_info{version="1.0.0"} 1

# HELP maidar_uptime_seconds Application uptime in seconds
# TYPE maidar_uptime_seconds counter
maidar_uptime_seconds 86400

# HELP maidar_cpu_usage_percent CPU usage percentage
# TYPE maidar_cpu_usage_percent gauge
maidar_cpu_usage_percent 25.4

# HELP maidar_memory_usage_bytes Memory usage in bytes
# TYPE maidar_memory_usage_bytes gauge
maidar_memory_usage_bytes 2147483648

# HELP maidar_users_total Total number of users
# TYPE maidar_users_total gauge
maidar_users_total 150

# HELP maidar_simulations_total Total number of simulations
# TYPE maidar_simulations_total gauge
maidar_simulations_total 45

# HELP maidar_employees_total Total number of employees
# TYPE maidar_employees_total gauge
maidar_employees_total 5000
```

### Configure Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'maidar-backend'
    static_configs:
      - targets: ['api.maidar.com:8001']
    metrics_path: '/metrics'
    scheme: 'https'
```

---

## 4. Grafana Dashboards

### Install Grafana

```bash
docker run -d \
  -p 3001:3000 \
  --name=grafana \
  -e "GF_SECURITY_ADMIN_PASSWORD=admin" \
  grafana/grafana
```

### Add Prometheus Data Source

1. Go to http://localhost:3001
2. Login: admin/admin
3. Configuration → Data Sources → Add Prometheus
4. URL: http://prometheus:9090
5. Save & Test

### Create Dashboard

```json
{
  "title": "MAIDAR Platform Metrics",
  "panels": [
    {
      "title": "Uptime",
      "targets": [{
        "expr": "maidar_uptime_seconds"
      }]
    },
    {
      "title": "CPU Usage",
      "targets": [{
        "expr": "maidar_cpu_usage_percent"
      }]
    },
    {
      "title": "Memory Usage",
      "targets": [{
        "expr": "maidar_memory_usage_bytes / 1024 / 1024 / 1024"
      }]
    },
    {
      "title": "Total Users",
      "targets": [{
        "expr": "maidar_users_total"
      }]
    },
    {
      "title": "Active Simulations",
      "targets": [{
        "expr": "maidar_simulations_total"
      }]
    }
  ]
}
```

---

## 5. Kubernetes Integration

### Deployment with Probes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maidar-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: backend
        image: maidar/backend:latest
        ports:
        - containerPort: 8001

        # Liveness probe (restart if unhealthy)
        livenessProbe:
          httpGet:
            path: /liveness
            port: 8001
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        # Readiness probe (remove from load balancer if not ready)
        readinessProbe:
          httpGet:
            path: /readiness
            port: 8001
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2

        # Resources
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

---

## 6. Alerting

### Sentry Alerts

Configure in Sentry dashboard:

1. **Error Rate Alert**
   - Condition: >10 errors in 5 minutes
   - Action: Send to Slack #alerts

2. **Performance Alert**
   - Condition: P95 response time >2 seconds
   - Action: Send to Slack #performance

3. **New Issue Alert**
   - Condition: New unique error
   - Action: Send to Slack #errors

### Slack Integration

```bash
# In Sentry:
Settings → Integrations → Slack → Add to Slack

# Select channel: #maidar-alerts
```

### PagerDuty Integration (for P1 incidents)

```bash
# In Sentry:
Settings → Integrations → PagerDuty

# Configure severity rules:
- Fatal/Error → PagerDuty (wake up engineer)
- Warning → Slack only
```

---

## 7. Log Aggregation

### ELK Stack (Optional)

```yaml
# docker-compose.yml
services:
  elasticsearch:
    image: elasticsearch:8.11.0
    ports:
      - 9200:9200

  logstash:
    image: logstash:8.11.0
    ports:
      - 5000:5000

  kibana:
    image: kibana:8.11.0
    ports:
      - 5601:5601
```

### Send Logs to ELK

```python
# In logging configuration
import logging
from logging.handlers import SocketHandler

logger = logging.getLogger('maidar')
logger.addHandler(SocketHandler('logstash', 5000))
```

---

## 8. Custom Metrics

### Add Custom Business Metrics

```python
# In your endpoint
from app.api.health import register_metric

@router.post("/simulations/{id}/launch")
def launch_simulation(...):
    # ... your code ...

    # Increment counter
    register_metric("simulations_launched", 1)

    # Record timing
    with record_time("simulation_launch_duration"):
        launch_emails()
```

---

## 9. Performance Monitoring

### Sentry Performance

Already configured! Sentry automatically tracks:
- Request duration
- Database query time
- Redis operations
- External API calls

### View Performance

1. Go to Sentry dashboard
2. Click "Performance"
3. See transaction breakdown
4. Identify slow endpoints

### Optimize Slow Endpoints

```python
# Add transaction name for better visibility
from app.core.monitoring import set_transaction_name

@router.post("/risk/calculate")
def calculate_risk(...):
    set_transaction_name("Risk Calculation")
    # ... your code ...
```

---

## 10. Monitoring Checklist

### Production Deployment Checklist

- [ ] Sentry DSN configured
- [ ] Health checks returning 200
- [ ] Prometheus metrics accessible
- [ ] Grafana dashboard created
- [ ] Kubernetes probes configured
- [ ] Slack alerts configured
- [ ] PagerDuty integration tested
- [ ] Log retention configured (7 years)
- [ ] Backup monitoring enabled
- [ ] SSL certificate monitoring

---

## 11. Troubleshooting

### Sentry Not Capturing Errors

```python
# Test Sentry
from app.core.monitoring import capture_message
capture_message("Test message", level="info")

# Check Sentry dashboard
# If not appearing, verify SENTRY_DSN in .env
```

### Health Check Failing

```bash
# Check detailed health
curl http://localhost:8001/health/detailed

# Check database
docker exec maidar-postgres pg_isready

# Check Redis
docker exec maidar-redis redis-cli ping
```

### Metrics Not Updating

```bash
# Verify endpoint
curl http://localhost:8001/metrics

# Check Prometheus config
docker exec prometheus cat /etc/prometheus/prometheus.yml

# Check Prometheus targets
# Go to http://localhost:9090/targets
```

---

## 12. Cost Optimization

### Sentry Pricing

- **Free Tier:** 5,000 errors/month
- **Team Plan:** $26/month - 50,000 errors/month
- **Business Plan:** $80/month - 150,000 errors/month

**Recommendation:** Start with Team plan

### Prometheus/Grafana

- **Self-hosted:** Free (infrastructure cost only)
- **Grafana Cloud:** Free tier available

**Recommendation:** Self-host on existing infrastructure

---

## 13. Key Metrics to Monitor

### Application Metrics
- **Uptime** - Target: 99.9%
- **Response Time** - Target: <500ms (P95)
- **Error Rate** - Target: <1%
- **Request Rate** - Track trends

### Business Metrics
- **Active Users** - Daily/Weekly/Monthly
- **Simulations Launched** - Per day
- **Email Send Rate** - Track delivery
- **Risk Score Updates** - Track calculations

### System Metrics
- **CPU Usage** - Alert if >80%
- **Memory Usage** - Alert if >85%
- **Disk Usage** - Alert if >90%
- **Database Connections** - Monitor pool

---

## 14. Dashboard Examples

### Executive Dashboard
- Total Users
- Active Simulations
- Phishing Success Rate
- System Uptime

### Operations Dashboard
- Error Rate (last 24h)
- Response Time Trends
- Database Performance
- Celery Queue Length

### SRE Dashboard
- Pod Health (Kubernetes)
- Resource Usage
- Request Rate
- Alert History

---

## Quick Reference

### Test Monitoring

```bash
# Health check
curl http://localhost:8001/health

# Detailed health
curl http://localhost:8001/health/detailed

# Metrics
curl http://localhost:8001/metrics

# Test Sentry
python -c "from app.core.monitoring import capture_message; capture_message('test')"
```

### View Dashboards

- **Sentry:** https://sentry.io
- **Grafana:** http://localhost:3001
- **Prometheus:** http://localhost:9090
- **Flower:** http://localhost:5555

---

**Monitoring Status:** ✅ Production-Ready

Your platform is now fully observable! 📊
