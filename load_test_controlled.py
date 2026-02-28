#!/usr/bin/env python3
"""
Controlled Load Test for MAIDAR Staging Environment

Tests performance while respecting rate limits.
Focuses on exempt endpoints and measures actual throughput.
"""

import requests
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict
import sys

BASE_URL = "http://localhost:8002"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

class LoadTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.results = []

    def test_endpoint(self, endpoint: str, method: str = "GET", data: dict = None) -> Dict:
        """Test a single endpoint and measure response time."""
        start_time = time.time()

        try:
            if method == "GET":
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
            elif method == "POST":
                response = requests.post(
                    f"{self.base_url}{endpoint}",
                    json=data,
                    timeout=10
                )

            elapsed = (time.time() - start_time) * 1000  # Convert to ms

            return {
                "endpoint": endpoint,
                "method": method,
                "status_code": response.status_code,
                "response_time_ms": elapsed,
                "success": response.status_code < 400
            }
        except Exception as e:
            elapsed = (time.time() - start_time) * 1000
            return {
                "endpoint": endpoint,
                "method": method,
                "status_code": 0,
                "response_time_ms": elapsed,
                "success": False,
                "error": str(e)
            }

    def run_concurrent_tests(self, endpoint: str, num_requests: int, max_workers: int = 10, method: str = "GET", data: dict = None):
        """Run multiple requests concurrently."""
        print(f"\n{Colors.BLUE}Testing: {method} {endpoint}{Colors.RESET}")
        print(f"Requests: {num_requests}, Workers: {max_workers}")

        results = []

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(self.test_endpoint, endpoint, method, data) for _ in range(num_requests)]

            for future in as_completed(futures):
                result = future.result()
                results.append(result)

        # Calculate statistics
        response_times = [r["response_time_ms"] for r in results]
        successes = [r for r in results if r["success"]]
        failures = [r for r in results if not r["success"]]

        print(f"{Colors.GREEN}Completed: {len(successes)}/{num_requests} successful{Colors.RESET}")
        if failures:
            print(f"{Colors.RED}Failures: {len(failures)}{Colors.RESET}")

        if response_times:
            print(f"Avg Response Time: {statistics.mean(response_times):.2f}ms")
            print(f"Min Response Time: {min(response_times):.2f}ms")
            print(f"Max Response Time: {max(response_times):.2f}ms")
            print(f"Median Response Time: {statistics.median(response_times):.2f}ms")

            if len(response_times) > 1:
                print(f"Std Dev: {statistics.stdev(response_times):.2f}ms")

        return {
            "endpoint": endpoint,
            "method": method,
            "total_requests": num_requests,
            "successful": len(successes),
            "failed": len(failures),
            "avg_response_time": statistics.mean(response_times) if response_times else 0,
            "min_response_time": min(response_times) if response_times else 0,
            "max_response_time": max(response_times) if response_times else 0,
            "median_response_time": statistics.median(response_times) if response_times else 0,
            "std_dev": statistics.stdev(response_times) if len(response_times) > 1 else 0
        }

    def run_load_test_suite(self):
        """Run comprehensive load test suite."""
        print(f"\n{Colors.BLUE}{'='*80}{Colors.RESET}")
        print(f"{Colors.BLUE}MAIDAR Controlled Load Test Suite{Colors.RESET}".center(80))
        print(f"{Colors.BLUE}{'='*80}{Colors.RESET}\n")

        test_results = []

        # Test 1: Health Check (exempt from rate limiting)
        result = self.run_concurrent_tests("/health", num_requests=100, max_workers=20)
        test_results.append(result)
        time.sleep(2)

        # Test 2: Detailed Health Check (more complex query)
        result = self.run_concurrent_tests("/health/detailed", num_requests=50, max_workers=10)
        test_results.append(result)
        time.sleep(2)

        # Test 3: Metrics Endpoint
        result = self.run_concurrent_tests("/metrics", num_requests=50, max_workers=10)
        test_results.append(result)
        time.sleep(2)

        # Test 4: Readiness Probe
        result = self.run_concurrent_tests("/readiness", num_requests=50, max_workers=10)
        test_results.append(result)
        time.sleep(2)

        # Test 5: Liveness Probe
        result = self.run_concurrent_tests("/liveness", num_requests=50, max_workers=10)
        test_results.append(result)

        # Generate Report
        self.generate_report(test_results)

    def generate_report(self, test_results: List[Dict]):
        """Generate final performance report."""
        print(f"\n{Colors.BLUE}{'='*80}{Colors.RESET}")
        print(f"{Colors.BLUE}Load Test Results Summary{Colors.RESET}".center(80))
        print(f"{Colors.BLUE}{'='*80}{Colors.RESET}\n")

        print(f"{'Endpoint':<30} {'Requests':<12} {'Success':<10} {'Avg (ms)':<12} {'Max (ms)':<12}")
        print("-" * 80)

        total_requests = 0
        total_successful = 0
        all_avg_times = []

        for result in test_results:
            endpoint_display = f"{result['method']} {result['endpoint']}"
            success_rate = (result['successful'] / result['total_requests'] * 100) if result['total_requests'] > 0 else 0

            total_requests += result['total_requests']
            total_successful += result['successful']
            all_avg_times.append(result['avg_response_time'])

            print(f"{endpoint_display:<30} {result['total_requests']:<12} {success_rate:>6.1f}%    {result['avg_response_time']:<12.2f} {result['max_response_time']:<12.2f}")

        print("-" * 80)
        overall_success_rate = (total_successful / total_requests * 100) if total_requests > 0 else 0
        overall_avg = statistics.mean(all_avg_times) if all_avg_times else 0

        print(f"{'TOTAL':<30} {total_requests:<12} {overall_success_rate:>6.1f}%    {overall_avg:<12.2f}")

        print(f"\n{Colors.GREEN}Overall Success Rate: {overall_success_rate:.1f}%{Colors.RESET}")
        print(f"{Colors.GREEN}Average Response Time: {overall_avg:.2f}ms{Colors.RESET}\n")

        # Performance Assessment
        if overall_avg < 50:
            grade = "Excellent"
            color = Colors.GREEN
        elif overall_avg < 100:
            grade = "Good"
            color = Colors.GREEN
        elif overall_avg < 200:
            grade = "Fair"
            color = Colors.YELLOW
        else:
            grade = "Poor"
            color = Colors.RED

        print(f"{color}Performance Grade: {grade}{Colors.RESET}\n")


if __name__ == "__main__":
    tester = LoadTester(BASE_URL)
    tester.run_load_test_suite()
