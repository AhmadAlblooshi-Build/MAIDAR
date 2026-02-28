"""
Locust Load Testing Script for MAIDAR Staging Environment

Tests performance under various load conditions:
- 100 concurrent users (light load)
- 500 concurrent users (moderate load)
- 1000 concurrent users (heavy load)

Measures:
- Response times
- Requests per second
- Failure rate
- Resource utilization
"""

from locust import HttpUser, task, between, events
import random
import time

class MAIDAREEndpointUser(HttpUser):
    """
    Simulates a user accessing MAIDAR endpoints.

    Weight distribution:
    - 40% - Health checks and monitoring
    - 30% - API documentation access
    - 20% - Authentication attempts
    - 10% - Core feature endpoints
    """

    # Wait between 1-3 seconds between tasks
    wait_time = between(1, 3)

    def on_start(self):
        """Called when a user starts. Initialize any necessary data."""
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    @task(20)
    def health_check(self):
        """Basic health check endpoint - most frequent."""
        with self.client.get("/health", catch_response=True, name="/health") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Got status code {response.status_code}")

    @task(15)
    def detailed_health_check(self):
        """Detailed health check - database and redis queries."""
        with self.client.get("/health/detailed", catch_response=True, name="/health/detailed") as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("status") in ["healthy", "degraded"]:
                    response.success()
                else:
                    response.failure(f"Unhealthy status: {data.get('status')}")
            else:
                response.failure(f"Got status code {response.status_code}")

    @task(10)
    def readiness_probe(self):
        """Kubernetes readiness probe."""
        self.client.get("/readiness", name="/readiness")

    @task(5)
    def liveness_probe(self):
        """Kubernetes liveness probe."""
        self.client.get("/liveness", name="/liveness")

    @task(15)
    def prometheus_metrics(self):
        """Prometheus metrics endpoint."""
        with self.client.get("/metrics", catch_response=True, name="/metrics") as response:
            if response.status_code == 200 and "maidar_uptime_seconds" in response.text:
                response.success()
            else:
                response.failure("Metrics not available")

    @task(10)
    def api_documentation(self):
        """Access OpenAPI documentation."""
        self.client.get("/docs", name="/docs")

    @task(8)
    def login_attempt(self):
        """Simulate login attempts (will fail but tests endpoint)."""
        self.client.post(
            "/api/v1/auth/login",
            data={
                "username": f"user{random.randint(1, 1000)}@test.com",
                "password": "TestPassword123!"
            },
            name="/api/v1/auth/login"
        )

    @task(5)
    def employees_statistics(self):
        """Access employee statistics endpoint."""
        self.client.get("/api/v1/employees/statistics", name="/api/v1/employees/statistics")

    @task(5)
    def scenarios_statistics(self):
        """Access scenario statistics endpoint."""
        self.client.get("/api/v1/scenarios/statistics", name="/api/v1/scenarios/statistics")

    @task(3)
    def simulations_search(self):
        """Search simulations."""
        self.client.post(
            "/api/v1/simulations/search",
            json={"page": 1, "page_size": 10},
            headers=self.headers,
            name="/api/v1/simulations/search"
        )

    @task(2)
    def risk_calculate(self):
        """Test risk calculation endpoint."""
        self.client.post(
            "/api/v1/risk/calculate",
            json={
                "employee_id": "00000000-0000-0000-0000-000000000000",
                "scenario_id": "00000000-0000-0000-0000-000000000000"
            },
            headers=self.headers,
            name="/api/v1/risk/calculate"
        )

    @task(2)
    def audit_logs_search(self):
        """Search audit logs."""
        self.client.post(
            "/api/v1/audit-logs/search",
            json={"page": 1, "page_size": 10},
            headers=self.headers,
            name="/api/v1/audit-logs/search"
        )


class MAIDARFrontendUser(HttpUser):
    """
    Simulates users accessing the frontend.
    """

    host = "http://localhost:3001"
    wait_time = between(2, 5)

    @task(10)
    def homepage(self):
        """Access homepage."""
        self.client.get("/", name="Frontend: Homepage")

    @task(5)
    def login_page(self):
        """Access login page."""
        self.client.get("/login", name="Frontend: Login")


# Event handlers for custom reporting
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when the test starts."""
    print("\n" + "="*80)
    print("MAIDAR Load Test Starting".center(80))
    print("="*80 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when the test stops."""
    print("\n" + "="*80)
    print("MAIDAR Load Test Complete".center(80))
    print("="*80 + "\n")

    # Print summary statistics
    stats = environment.stats
    print(f"Total Requests: {stats.total.num_requests}")
    print(f"Total Failures: {stats.total.num_failures}")
    print(f"Average Response Time: {stats.total.avg_response_time:.2f}ms")
    print(f"Max Response Time: {stats.total.max_response_time:.2f}ms")
    print(f"Requests/sec: {stats.total.total_rps:.2f}")
    print(f"Failure Rate: {(stats.total.num_failures / stats.total.num_requests * 100) if stats.total.num_requests > 0 else 0:.2f}%")
    print()
