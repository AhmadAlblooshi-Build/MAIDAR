"""
API Routes Verification Script
Tests that all API routes are properly registered
"""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

def test_app_imports():
    """Test that the FastAPI app imports successfully."""
    try:
        from app.main import app
        print("[PASS] FastAPI app imports successfully")
        return app
    except Exception as e:
        print(f"[FAIL] Failed to import FastAPI app: {e}")
        sys.exit(1)

def test_routes_registered(app):
    """Test that all expected routes are registered."""
    routes = [route.path for route in app.routes]

    expected_routes = {
        # Root routes
        "/": "Root endpoint",
        "/health": "Health check",

        # Auth routes
        "/api/v1/auth/register": "User registration",
        "/api/v1/auth/login": "User login",
        "/api/v1/auth/me": "Get current user",
        "/api/v1/auth/verify-email": "Email verification",
        "/api/v1/auth/forgot-password": "Forgot password",
        "/api/v1/auth/reset-password": "Reset password",
        "/api/v1/auth/change-password": "Change password",

        # Employee routes
        "/api/v1/employees/": "Employee CRUD",
        "/api/v1/employees/{id}": "Employee by ID",
        "/api/v1/employees/search": "Search employees",
        "/api/v1/employees/upload-csv": "Upload CSV",
        "/api/v1/employees/statistics": "Employee statistics",

        # Risk routes
        "/api/v1/risk/calculate": "Calculate risk",
        "/api/v1/risk/scores/search": "Search risk scores",
        "/api/v1/risk/scores/employee/{employee_id}": "Employee risk scores",

        # Scenario routes
        "/api/v1/scenarios/": "Scenario CRUD",
        "/api/v1/scenarios/{id}": "Scenario by ID",
        "/api/v1/scenarios/search": "Search scenarios",
        "/api/v1/scenarios/statistics": "Scenario statistics",

        # Simulation routes
        "/api/v1/simulations/": "Simulation CRUD",
        "/api/v1/simulations/{id}": "Simulation by ID",
        "/api/v1/simulations/search": "Search simulations",
        "/api/v1/simulations/{simulation_id}/launch": "Launch simulation",
        "/api/v1/simulations/{simulation_id}/results": "Simulation results",
        "/api/v1/simulations/{simulation_id}/statistics": "Simulation statistics",

        # Analytics routes
        "/api/v1/analytics/risk-trends": "Risk trends",
        "/api/v1/analytics/department-comparison": "Department comparison",
        "/api/v1/analytics/seniority-comparison": "Seniority comparison",
        "/api/v1/analytics/top-vulnerable": "Top vulnerable employees",
        "/api/v1/analytics/risk-distribution": "Risk distribution",
        "/api/v1/analytics/executive-summary": "Executive summary",
        "/api/v1/analytics/export": "Export data",
    }

    print("\n=== Route Registration Check ===")
    missing_routes = []
    found_routes = 0

    for route, description in expected_routes.items():
        if route in routes or any(r.startswith(route.replace("{", "").replace("}", "")) for r in routes):
            print(f"[PASS] {route} - {description}")
            found_routes += 1
        else:
            print(f"[FAIL] {route} - {description} (MISSING)")
            missing_routes.append(route)

    print(f"\n=== Summary ===")
    print(f"Total Expected Routes: {len(expected_routes)}")
    print(f"Found Routes: {found_routes}")
    print(f"Missing Routes: {len(missing_routes)}")

    if missing_routes:
        print(f"\nMissing routes:")
        for route in missing_routes:
            print(f"  - {route}")
        return False

    return True

def test_openapi_schema(app):
    """Test that OpenAPI schema is generated successfully."""
    try:
        schema = app.openapi()
        print(f"\n[PASS] OpenAPI schema generated successfully")
        print(f"  - Title: {schema.get('info', {}).get('title')}")
        print(f"  - Version: {schema.get('info', {}).get('version')}")
        print(f"  - Total Paths: {len(schema.get('paths', {}))}")
        return True
    except Exception as e:
        print(f"\n[FAIL] Failed to generate OpenAPI schema: {e}")
        return False

def main():
    """Run all tests."""
    print("=" * 60)
    print("MAIDAR API Routes Verification")
    print("=" * 60)

    # Test 1: Import app
    app = test_app_imports()

    # Test 2: Check routes
    routes_ok = test_routes_registered(app)

    # Test 3: OpenAPI schema
    schema_ok = test_openapi_schema(app)

    # Summary
    print("\n" + "=" * 60)
    if routes_ok and schema_ok:
        print("[PASS] ALL TESTS PASSED")
        print("=" * 60)
        sys.exit(0)
    else:
        print("[FAIL] SOME TESTS FAILED")
        print("=" * 60)
        sys.exit(1)

if __name__ == "__main__":
    main()
