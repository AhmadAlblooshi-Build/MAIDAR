"""Debug API call to trace where validation error occurs"""
import sys
import traceback
sys.path.insert(0, "C:\\Users\\User\\OneDrive\\Desktop\\MAIDAR\\backend")

# Monkey patch to capture validation errors
original_validate = None

def patch_validation():
    from pydantic import BaseModel
    global original_validate
    original_validate = BaseModel.__init__

    def patched_init(self, **data):
        print(f"[DEBUG] Pydantic init called on {self.__class__.__name__}")
        print(f"[DEBUG] Data: {data}")
        try:
            original_validate(self, **data)
            print(f"[DEBUG] Validation passed for {self.__class__.__name__}")
        except Exception as e:
            print(f"[DEBUG] Validation FAILED for {self.__class__.__name__}: {e}")
            traceback.print_exc()
            raise

    BaseModel.__init__ = patched_init

patch_validation()

# Now import the app
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

print("\n=== Step 1: Register user ===")
register_resp = client.post("/api/v1/auth/register", json={
    "email": "debug@test.com",
    "password": "DebugPass123!",
    "full_name": "Debug User",
    "organization_name": "Debug Org"
})
print(f"Status: {register_resp.status_code}")

print("\n=== Step 2: Login ===")
login_resp = client.post("/api/v1/auth/login", json={
    "email": "debug@test.com",
    "password": "DebugPass123!"
})
print(f"Status: {login_resp.status_code}")
token = login_resp.json()["access_token"]

print("\n=== Step 3: Create employee ===")
employee_data = {
    "employee_id": "EMP001",
    "email": "emp@test.com",
    "full_name": "Test Employee",
    "age_range": "35_44",
    "gender": "male",
    "languages": ["en"],
    "technical_literacy": 8,
    "seniority": "senior",
    "department": "IT"
}

print(f"Sending data: {employee_data}")
create_resp = client.post(
    "/api/v1/employees/",
    json=employee_data,
    headers={"Authorization": f"Bearer {token}"}
)
print(f"Status: {create_resp.status_code}")
print(f"Response: {create_resp.text}")
