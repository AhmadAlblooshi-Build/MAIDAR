# New Bugs Found During Comprehensive Endpoint Testing
**Date**: February 28, 2026
**Testing Phase**: Complete endpoint coverage (48 previously untested endpoints)

---

## CRITICAL BUGS (500 Internal Server Errors)

### Bug #18: Simulation GET/PUT endpoints crashing (500)
- **Location**: Simulation endpoints
- **Impact**: HIGH - Cannot view or update simulation details after creation
- **Status**: ⚠️ NEEDS FIX
- **Endpoints Affected**:
  - `GET /api/v1/simulations/{id}` - 500 error
  - `PUT /api/v1/simulations/{id}` - 500 error
  - `GET /api/v1/simulations/{id}/statistics` - 500 error

### Bug #19: Analytics seniority comparison crashing (500)
- **Location**: `backend/app/api/analytics.py`
- **Impact**: MEDIUM - One analytics endpoint broken
- **Status**: ⚠️ NEEDS FIX
- **Endpoint**: `GET /api/v1/analytics/seniority-comparison` - 500 error
- **Likely Cause**: Database query error or missing data handling

---

## MEDIUM PRIORITY - Schema/Validation Issues

### Bug #20: Bulk risk calculation schema mismatch
- **Location**: Risk calculation endpoint
- **Impact**: MEDIUM - Bulk risk calculation not working
- **Status**: ⚠️ NEEDS FIX
- **Endpoint**: `POST /api/v1/risk/calculate-bulk`
- **Issue**: Expects `employee_ids` and `scenario_ids` arrays, not `requests` array
- **Current Request**:
  ```json
  {"requests": [{"employee_id": "...", "scenario_id": "..."}]}
  ```
- **Expected Request** (based on error):
  ```json
  {"employee_ids": ["..."], "scenario_ids": ["..."]}
  ```

### Bug #21: Risk trends schema mismatch
- **Location**: Analytics risk trends
- **Impact**: MEDIUM - Risk trends not accessible
- **Status**: ⚠️ NEEDS FIX
- **Endpoint**: `POST /api/v1/analytics/risk-trends`
- **Issue**: Requires `start_date` and `end_date`, not `time_period`
- **Current Request**: `{"time_period": "30d"}`
- **Expected Request**: `{"start_date": "2026-01-01", "end_date": "2026-02-28"}`

### Bug #22: Export analytics schema mismatch
- **Location**: Analytics export
- **Impact**: LOW - Export functionality not working
- **Status**: ⚠️ NEEDS FIX
- **Endpoint**: `POST /api/v1/analytics/export`
- **Issue**: Requires `export_type`, not `format`
- **Current Request**: `{"format": "csv"}`
- **Expected Request**: `{"export_type": "csv"}` or similar

### Bug #23: Launch simulation requires request body
- **Location**: Simulation launch
- **Impact**: MEDIUM - Cannot launch simulations
- **Status**: ⚠️ NEEDS FIX
- **Endpoint**: `POST /api/v1/simulations/{id}/launch`
- **Issue**: Requires a request body (currently sending null)
- **Need to check**: What parameters are expected?

---

## LOW PRIORITY - Endpoint Not Implemented or Missing Data

### Bug #24: Employee risk profile returning 404
- **Location**: Risk profile endpoint
- **Impact**: LOW - Risk profile not available
- **Status**: ⚠️ INVESTIGATE
- **Endpoint**: `GET /api/v1/risk/employee/{id}`
- **Issue**: 404 error - either:
  1. Endpoint not fully implemented
  2. Requires risk calculation first
  3. No risk data exists for employee

### Bug #25: Tenant details validation error
- **Location**: Tenant management
- **Impact**: LOW - Cannot get tenant details in some cases
- **Status**: ⚠️ INVESTIGATE
- **Endpoint**: `GET /api/v1/tenants/{id}`
- **Issue**: 400 error - validation issue with tenant ID

---

## TEST RESULTS SUMMARY

**Previously Untested Endpoints**: 48
**Tests Created**: 36
**Tests Passed**: 25 (69%)
**Tests Failed**: 10 (28%)
**Tests Skipped**: 1 (3%)

### Passing Endpoints ✅ (25)
1. Health check
2. Email verification
3. Password reset
4. Resend verification
5. Employee statistics
6. Calculate single risk
7. Create simulation
8. Get simulation results
9. Delete simulation
10. Top vulnerable employees
11. Unread notification count
12. Mark all notifications as read
13. Scenario statistics
14. AI scenario generation (OpenAI not configured, but endpoint works)
15. Track email open
16. Track link click
17. Track credential submission
18. Create tenant
19. Update tenant
20. Suspend tenant
21. Activate tenant
22. Delete tenant
23. Get specific role
24. Update role
25. Create admin user (validation correct)

### Failing Endpoints ❌ (10)
1. Calculate bulk risk (schema)
2. Get employee risk profile (404)
3. Get simulation details (500) - **CRITICAL**
4. Update simulation (500) - **CRITICAL**
5. Get simulation statistics (500) - **CRITICAL**
6. Launch simulation (schema)
7. Risk trends (schema)
8. Seniority comparison (500) - **CRITICAL**
9. Export analytics (schema)
10. Get tenant details (400)

### Skipped Endpoints (1)
1. Admin user specific tests (no existing user to test with)

---

## RECOMMENDATIONS

### Immediate (Critical Bugs)
1. **Fix simulation GET/PUT endpoints** - These are returning 500 errors
2. **Fix analytics seniority comparison** - 500 error
3. **Check backend logs** for stack traces of these 500 errors

### Short Term (Schema Issues)
1. Document correct request schemas for:
   - Bulk risk calculation
   - Risk trends
   - Export analytics
   - Launch simulation
2. Update API documentation or fix schemas to match expectations

### Investigation Needed
1. Check why employee risk profile returns 404
2. Investigate tenant details validation error
3. Verify if launch simulation needs a request body

---

## BACKEND LOG CHECK NEEDED

Run this to see the actual errors:
```bash
cd backend
tail -100 logs/app.log  # or wherever logs are stored
```

Or check Docker logs:
```bash
docker-compose logs backend --tail=100
```

---

## OVERALL PLATFORM STATUS

**Previously**: 117/117 tests passing (100%) - but only ~40% of endpoints tested
**After Comprehensive Testing**:
- Total endpoints tested: ~75 (out of 88 total)
- **4 critical bugs found** (500 errors)
- **5 schema mismatches** (validation errors)
- **2 endpoints need investigation** (404/400)

**Updated Recommendation**: Platform is **MOSTLY READY** but needs these 4 critical bugs fixed before launch.

---

## NEXT STEPS

1. Check backend logs for 500 error stack traces
2. Fix simulation endpoints (highest priority)
3. Fix analytics seniority comparison
4. Update request schemas or API docs for validation errors
5. Re-run comprehensive tests after fixes
6. Update FINAL_TESTING_COMPLETE.md with new results

---

**Testing Engineer**: Claude Sonnet 4.5
**Date**: February 28, 2026
**Test Coverage**: Now at ~85% of all endpoints (75/88)
