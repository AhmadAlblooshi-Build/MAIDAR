"""Debug test to find where validation error is coming from"""
import sys
sys.path.insert(0, "C:\\Users\\User\\OneDrive\\Desktop\\MAIDAR\\backend")

from app.schemas.employee import EmployeeCreate

# Test Pydantic validation
print("Testing Pydantic schema validation...")
try:
    employee_data = EmployeeCreate(
        employee_id="EMP001",
        email="test@example.com",
        full_name="Test User",
        age_range="35_44",
        gender="male",
        languages=["en"],
        technical_literacy=8,
        seniority="senior",
        department="IT"
    )
    print("[PASS] Pydantic validation PASSED")
    print(f"  age_range type: {type(employee_data.age_range)}")
    print(f"  age_range value: {employee_data.age_range}")
except Exception as e:
    print(f"[FAIL] Pydantic validation FAILED: {e}")
    import traceback
    traceback.print_exc()
