"""
Employee Management API endpoints.

Provides CRUD operations, bulk CSV import, search/filter, and statistics.
"""

import logging
import csv
import io
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.config.database import get_db
from app.core.dependencies import get_current_user, get_current_admin_user, check_tenant_access
from app.core.risk_engine import AgeRange, Gender, Seniority
from app.core.audit_logger import audit_logger
from app.models.user import User
from app.models.employee import Employee
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeListResponse,
    EmployeeBulkImportRequest,
    EmployeeBulkImportResponse,
    EmployeeSearchRequest,
    EmployeeStatistics
)

router = APIRouter(tags=["Employee Management"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    employee_data: EmployeeCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new employee.

    Requires TENANT_ADMIN or PLATFORM_SUPER_ADMIN role.
    """
    try:
        logger.info(f"📥 Creating employee: {employee_data.email}")
        logger.info(f"   Data: age_range={employee_data.age_range}, seniority={employee_data.seniority}, "
                   f"department={employee_data.department}, technical_literacy={employee_data.technical_literacy}, "
                   f"languages={employee_data.languages}, gender={employee_data.gender}")

        # Check if employee_id already exists in tenant
        existing = db.query(Employee).filter(
            Employee.tenant_id == current_user.tenant_id,
            Employee.employee_id == employee_data.employee_id,
            Employee.deleted_at == None
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with ID '{employee_data.employee_id}' already exists"
            )

        # Check if email already exists in tenant
        existing_email = db.query(Employee).filter(
            Employee.tenant_id == current_user.tenant_id,
            Employee.email == employee_data.email,
            Employee.deleted_at == None
        ).first()

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with email '{employee_data.email}' already exists"
            )

        # Calculate risk score using risk engine
        logger.info("🎯 Calculating risk score...")
        from app.core.risk_engine import RiskScoringEngine, EmployeeProfile, Scenario

        risk_engine = RiskScoringEngine()
        employee_profile = EmployeeProfile(
            age_range=employee_data.age_range,
            gender=employee_data.gender.upper() if employee_data.gender else "MALE",
            languages=employee_data.languages or ["en"],
            technical_literacy=int(employee_data.technical_literacy),
            seniority=employee_data.seniority.upper(),
            department=employee_data.department,
            job_title=employee_data.job_title or ""
        )
        # Default generic phishing scenario for initial risk assessment
        # Use employee's primary language or default to English
        primary_language = employee_data.languages[0] if employee_data.languages else "en"
        scenario = Scenario(category="CREDENTIALS", language=primary_language)
        risk_result = risk_engine.calculate_risk(employee_profile, scenario, employee_data.employee_id)
        logger.info(f"✅ Risk calculated: {risk_result.risk_score}/100 ({risk_result.risk_band})")

        # Create employee
        logger.info("📝 Creating Employee object...")
        employee = Employee(
            tenant_id=current_user.tenant_id,
            employee_id=employee_data.employee_id,
            email=employee_data.email,
            full_name=employee_data.full_name,
            age_range=employee_data.age_range,
            gender=employee_data.gender if employee_data.gender else None,
            languages=employee_data.languages,
            technical_literacy=employee_data.technical_literacy,
            seniority=employee_data.seniority,
            department=employee_data.department,
            job_title=employee_data.job_title,
            risk_score=float(risk_result.risk_score) / 10.0,  # Convert 0-100 scale to 0-10 scale
            risk_band=risk_result.risk_band.value if hasattr(risk_result.risk_band, 'value') else str(risk_result.risk_band)
        )
        logger.info("✅ Employee object created")

        logger.info("💾 Saving to database...")
        db.add(employee)
        db.flush()  # Flush to assign ID before commit
        logger.info("🔄 Committing transaction...")
        db.commit()  # Commit transaction
        logger.info("🔃 Refreshing employee data...")
        db.refresh(employee)  # Refresh to get latest DB state

        # Create audit log
        audit_logger.log_event(
            db=db,
            action="EMPLOYEE_CREATED",
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            resource_type="employee",
            resource_id=employee.id,
            details={
                "employee_id": employee.employee_id,
                "email": employee.email,
                "full_name": employee.full_name,
                "department": employee.department
            },
            status="success"
        )

        logger.info(f"✅ Employee created successfully: {employee.employee_id}")

        return EmployeeResponse(
            id=str(employee.id),
            tenant_id=str(employee.tenant_id),
            employee_id=employee.employee_id,
            email=employee.email,
            full_name=employee.full_name,
            age_range=employee.age_range,
            gender=employee.gender if employee.gender else None,
            languages=employee.languages,
            technical_literacy=employee.technical_literacy,
            seniority=employee.seniority,
            department=employee.department,
            job_title=employee.job_title,
            risk_score=employee.risk_score,
            risk_band=employee.risk_band,
            created_at=employee.created_at,
            updated_at=employee.updated_at,
            is_deleted=employee.is_deleted
        )
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"❌ CRITICAL ERROR creating employee: {type(e).__name__}: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create employee: {type(e).__name__}: {str(e)}"
        )


@router.get("/statistics", response_model=EmployeeStatistics)
def get_employee_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get employee statistics for the current tenant.
    """
    # Total employees
    total = db.query(Employee).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None
    ).count()

    # By seniority
    by_seniority = {}
    seniority_counts = db.query(
        Employee.seniority,
        func.count(Employee.id)
    ).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None
    ).group_by(Employee.seniority).all()

    for seniority, count in seniority_counts:
        by_seniority[seniority] = count  # seniority is already a string

    # By age range
    by_age_range = {}
    age_range_counts = db.query(
        Employee.age_range,
        func.count(Employee.id)
    ).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None
    ).group_by(Employee.age_range).all()

    for age_range, count in age_range_counts:
        by_age_range[age_range] = count  # age_range is already a string

    # By department
    by_department = {}
    department_counts = db.query(
        Employee.department,
        func.count(Employee.id)
    ).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None
    ).group_by(Employee.department).all()

    for department, count in department_counts:
        by_department[department] = count

    # By gender
    by_gender = {}
    gender_counts = db.query(
        Employee.gender,
        func.count(Employee.id)
    ).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None,
        Employee.gender.isnot(None)
    ).group_by(Employee.gender).all()

    for gender, count in gender_counts:
        by_gender[gender if gender else 'unknown'] = count  # gender is already a string

    # Average technical literacy
    avg_tl = db.query(func.avg(Employee.technical_literacy)).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None
    ).scalar()

    # Average risk score
    avg_risk = db.query(func.avg(Employee.risk_score)).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None,
        Employee.risk_score.isnot(None)
    ).scalar()

    # High risk count (risk_score >= 6.0)
    high_risk_count = db.query(Employee).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None,
        Employee.risk_score >= 6.0
    ).count()

    return EmployeeStatistics(
        total_count=total,
        total_employees=total,  # Deprecated field for backwards compatibility
        by_seniority=by_seniority,
        by_age_range=by_age_range,
        by_department=by_department,
        by_gender=by_gender,
        avg_technical_literacy=round(float(avg_tl), 2) if avg_tl else 0.0,
        avg_risk_score=round(float(avg_risk), 2) if avg_risk else None,
        high_risk_count=high_risk_count
    )


@router.get("/job-titles/list")
def get_job_titles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of distinct job titles in the tenant.
    """
    job_titles = db.query(Employee.job_title).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None,
        Employee.job_title.isnot(None),
        Employee.job_title != ''
    ).distinct().order_by(Employee.job_title).all()

    # Extract job titles from tuples
    return {"job_titles": [jt[0] for jt in job_titles]}


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get employee by ID (UUID or employee_id).
    """
    logger.info(f"Getting employee: {employee_id}, user tenant: {current_user.tenant_id}")

    # Try to get by UUID first
    try:
        uuid_id = UUID(employee_id)
        logger.info(f"Parsed as UUID: {uuid_id}")

        # Query with tenant filter for security
        employee = db.query(Employee).filter(
            Employee.id == uuid_id,
            Employee.tenant_id == current_user.tenant_id,
            Employee.deleted_at == None
        ).first()
    except ValueError:
        # Not a valid UUID, try employee_id
        logger.info(f"Not a valid UUID, trying as employee_id")
        employee = db.query(Employee).filter(
            Employee.employee_id == employee_id,
            Employee.tenant_id == current_user.tenant_id,
            Employee.deleted_at == None
        ).first()

    if not employee:
        logger.warning(f"Employee not found: {employee_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    # Check tenant access
    check_tenant_access(str(employee.tenant_id), current_user)

    return EmployeeResponse(
        id=str(employee.id),
        tenant_id=str(employee.tenant_id),
        employee_id=employee.employee_id,
        email=employee.email,
        full_name=employee.full_name,
        age_range=employee.age_range,
        gender=employee.gender if employee.gender else None,
        languages=employee.languages,
        technical_literacy=employee.technical_literacy,
        seniority=employee.seniority,
        department=employee.department,
        job_title=employee.job_title,
        risk_score=employee.risk_score,
        risk_band=employee.risk_band,
        created_at=employee.created_at,
        updated_at=employee.updated_at,
        is_deleted=employee.is_deleted
    )


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: str,
    employee_data: EmployeeUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update employee by ID.

    Requires TENANT_ADMIN or PLATFORM_SUPER_ADMIN role.
    """
    # Get employee
    try:
        uuid_id = UUID(employee_id)
        employee = db.query(Employee).filter(
            Employee.id == uuid_id,
            Employee.tenant_id == current_user.tenant_id,
            Employee.deleted_at == None
        ).first()
    except ValueError:
        employee = db.query(Employee).filter(
            Employee.employee_id == employee_id,
            Employee.tenant_id == current_user.tenant_id,
            Employee.deleted_at == None
        ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    # Check tenant access
    check_tenant_access(str(employee.tenant_id), current_user)

    # Update fields
    update_data = employee_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        # Validate enum values but store as strings
        if field == 'age_range' and value:
            try:
                AgeRange(value)  # Validate it's a valid enum value
                setattr(employee, field, value)  # Store as string
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid age_range value: {value}")
        elif field == 'gender' and value:
            try:
                Gender(value.upper() if isinstance(value, str) else value)  # Validate (case-insensitive)
                setattr(employee, field, value)  # Store as string
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid gender value: {value}")
        elif field == 'seniority' and value:
            try:
                Seniority(value.upper() if isinstance(value, str) else value)  # Validate (case-insensitive)
                setattr(employee, field, value)  # Store as string
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid seniority value: {value}")
        else:
            setattr(employee, field, value)

    db.commit()
    db.refresh(employee)

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="EMPLOYEE_UPDATED",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="employee",
        resource_id=employee.id,
        details={
            "employee_id": employee.employee_id,
            "email": employee.email,
            "updated_fields": list(update_data.keys())
        },
        status="success"
    )

    logger.info(f"Employee updated: {employee.employee_id} by user {current_user.email}")

    return EmployeeResponse(
        id=str(employee.id),
        tenant_id=str(employee.tenant_id),
        employee_id=employee.employee_id,
        email=employee.email,
        full_name=employee.full_name,
        age_range=employee.age_range,
        gender=employee.gender if employee.gender else None,
        languages=employee.languages,
        technical_literacy=employee.technical_literacy,
        seniority=employee.seniority,
        department=employee.department,
        job_title=employee.job_title,
        risk_score=employee.risk_score,
        risk_band=employee.risk_band,
        created_at=employee.created_at,
        updated_at=employee.updated_at,
        is_deleted=employee.is_deleted
    )


@router.post("/cleanup-test-data", status_code=status.HTTP_200_OK)
def cleanup_test_employees(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete test employees with TEST prefix in employee_id"""
    deleted = db.query(Employee).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.employee_id.like('TEST%')
    ).delete(synchronize_session=False)

    db.commit()

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="EMPLOYEES_CLEANUP_TEST",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="employee",
        resource_id=None,
        details={
            "deleted_count": deleted,
            "prefix": "TEST"
        },
        status="success"
    )

    return {"message": f"Deleted {deleted} test employees"}

@router.delete("/cleanup-by-prefix/{prefix}", status_code=status.HTTP_200_OK)
def cleanup_employees_by_prefix(
    prefix: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete employees with specific prefix in employee_id"""
    deleted = db.query(Employee).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.employee_id.like(f'{prefix}%')
    ).delete(synchronize_session=False)

    db.commit()

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="EMPLOYEES_CLEANUP_BY_PREFIX",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="employee",
        resource_id=None,
        details={
            "deleted_count": deleted,
            "prefix": prefix
        },
        status="success"
    )

    return {"message": f"Deleted {deleted} employees with prefix '{prefix}'"}

@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete employee (soft delete).

    Requires TENANT_ADMIN or PLATFORM_SUPER_ADMIN role.
    """
    # Get employee
    try:
        uuid_id = UUID(employee_id)
        employee = db.query(Employee).filter(
            Employee.id == uuid_id,
            Employee.tenant_id == current_user.tenant_id,
            Employee.deleted_at == None
        ).first()
    except ValueError:
        employee = db.query(Employee).filter(
            Employee.employee_id == employee_id,
            Employee.tenant_id == current_user.tenant_id,
            Employee.deleted_at == None
        ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    # Check tenant access
    check_tenant_access(str(employee.tenant_id), current_user)

    # Soft delete
    employee.soft_delete()
    db.commit()

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="EMPLOYEE_DELETED",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="employee",
        resource_id=employee.id,
        details={
            "employee_id": employee.employee_id,
            "email": employee.email,
            "full_name": employee.full_name
        },
        status="success"
    )

    logger.info(f"Employee deleted: {employee.employee_id} by user {current_user.email}")

    return None


@router.post("/search", response_model=EmployeeListResponse)
def search_employees(
    search_request: EmployeeSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search and filter employees with pagination.

    Super admins can search across tenants by providing tenant_id in request.
    """
    # Determine which tenant to query
    from app.models.user import UserRole
    from uuid import UUID

    if search_request.tenant_id and current_user.role in [UserRole.PLATFORM_SUPER_ADMIN, UserRole.SUPER_ADMIN]:
        # Super admin searching specific tenant
        target_tenant_id = UUID(search_request.tenant_id)
    else:
        # Regular user or no tenant_id specified - use current user's tenant
        target_tenant_id = current_user.tenant_id

    query = db.query(Employee).filter(
        Employee.tenant_id == target_tenant_id,
        Employee.deleted_at == None
    )

    # Apply text search
    if search_request.query:
        search_term = f"%{search_request.query}%"
        query = query.filter(
            or_(
                Employee.full_name.ilike(search_term),
                Employee.email.ilike(search_term),
                Employee.department.ilike(search_term),
                Employee.employee_id.ilike(search_term)
            )
        )

    # Apply filters
    if search_request.age_range:
        query = query.filter(Employee.age_range == AgeRange(search_request.age_range))

    if search_request.gender:
        query = query.filter(Employee.gender == Gender(search_request.gender))

    if search_request.seniority:
        query = query.filter(Employee.seniority == Seniority(search_request.seniority))

    if search_request.department:
        query = query.filter(Employee.department.ilike(f"%{search_request.department}%"))

    if search_request.job_title:
        query = query.filter(Employee.job_title == search_request.job_title)

    if search_request.min_technical_literacy is not None:
        query = query.filter(Employee.technical_literacy >= search_request.min_technical_literacy)

    if search_request.max_technical_literacy is not None:
        query = query.filter(Employee.technical_literacy <= search_request.max_technical_literacy)

    # Get total count
    total = query.count()

    # Apply sorting
    if search_request.sort_by:
        sort_column = getattr(Employee, search_request.sort_by, Employee.created_at)
        if search_request.sort_order == 'desc':
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (search_request.page - 1) * search_request.page_size
    employees = query.offset(offset).limit(search_request.page_size).all()

    # Convert to response
    employee_responses = [
        EmployeeResponse(
            id=str(emp.id),
            tenant_id=str(emp.tenant_id),
            employee_id=emp.employee_id,
            email=emp.email,
            full_name=emp.full_name,
            age_range=emp.age_range,
            gender=emp.gender if emp.gender else None,
            languages=emp.languages,
            technical_literacy=emp.technical_literacy,
            seniority=emp.seniority,
            department=emp.department,
            job_title=emp.job_title,
            risk_score=emp.risk_score,
            risk_band=emp.risk_band,
            created_at=emp.created_at,
            updated_at=emp.updated_at,
            is_deleted=emp.is_deleted
        )
        for emp in employees
    ]

    # Calculate total pages
    import math
    total_pages = math.ceil(total / search_request.page_size) if search_request.page_size > 0 else 0

    return EmployeeListResponse(
        total=total,
        page=search_request.page,
        page_size=search_request.page_size,
        total_pages=total_pages,
        employees=employee_responses
    )


@router.post("/bulk-import", response_model=EmployeeBulkImportResponse)
def bulk_import_employees(
    import_data: EmployeeBulkImportRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Bulk import employees from JSON.

    Requires TENANT_ADMIN or PLATFORM_SUPER_ADMIN role.
    """
    successful = 0
    failed = 0
    errors = []

    for idx, employee_data in enumerate(import_data.employees, start=1):
        try:
            # Check if employee_id already exists
            existing = db.query(Employee).filter(
                Employee.tenant_id == current_user.tenant_id,
                Employee.employee_id == employee_data.employee_id,
                Employee.deleted_at == None
            ).first()

            if existing:
                errors.append({
                    "row": idx,
                    "employee_id": employee_data.employee_id,
                    "error": "Employee ID already exists"
                })
                failed += 1
                continue

            # Check if email already exists
            existing_email = db.query(Employee).filter(
                Employee.tenant_id == current_user.tenant_id,
                Employee.email == employee_data.email,
                Employee.deleted_at == None
            ).first()

            if existing_email:
                errors.append({
                    "row": idx,
                    "employee_id": employee_data.employee_id,
                    "error": "Email already exists"
                })
                failed += 1
                continue

            # Calculate risk score using risk engine
            from app.core.risk_engine import RiskScoringEngine, EmployeeProfile, Scenario

            risk_engine = RiskScoringEngine()
            employee_profile = EmployeeProfile(
                age_range=employee_data.age_range,
                gender=employee_data.gender.upper() if employee_data.gender else "MALE",
                languages=employee_data.languages or ["en"],
                technical_literacy=int(employee_data.technical_literacy),
                seniority=employee_data.seniority.upper(),
                department=employee_data.department,
                job_title=employee_data.job_title or ""
            )
            # Default generic phishing scenario for initial risk assessment
            # Use employee's primary language or default to English
            primary_language = employee_data.languages[0] if employee_data.languages else "en"
            scenario = Scenario(category="CREDENTIALS", language=primary_language)
            risk_result = risk_engine.calculate_risk(employee_profile, scenario, employee_data.employee_id)

            # Create employee with risk score
            employee = Employee(
                tenant_id=current_user.tenant_id,
                employee_id=employee_data.employee_id,
                email=employee_data.email,
                full_name=employee_data.full_name,
                age_range=employee_data.age_range,
                gender=employee_data.gender if employee_data.gender else None,
                languages=employee_data.languages,
                technical_literacy=employee_data.technical_literacy,
                seniority=employee_data.seniority,
                department=employee_data.department,
                job_title=employee_data.job_title,
                risk_score=float(risk_result.risk_score) / 10.0,  # Convert 0-100 scale to 0-10 scale
                risk_band=risk_result.risk_band.value if hasattr(risk_result.risk_band, 'value') else str(risk_result.risk_band)
            )

            db.add(employee)
            successful += 1

        except Exception as e:
            errors.append({
                "row": idx,
                "employee_id": employee_data.employee_id if hasattr(employee_data, 'employee_id') else "unknown",
                "error": str(e)
            })
            failed += 1

    # Commit all successful imports
    if successful > 0:
        db.commit()

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="EMPLOYEES_BULK_IMPORT",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="employee",
        resource_id=None,
        details={
            "total_processed": len(import_data.employees),
            "successful": successful,
            "failed": failed
        },
        status="success" if failed == 0 else "partial_success"
    )

    logger.info(f"Bulk import: {successful} successful, {failed} failed by user {current_user.email}")

    return EmployeeBulkImportResponse(
        total_processed=len(import_data.employees),
        successful=successful,
        failed=failed,
        errors=errors
    )


@router.post("/upload-csv", response_model=EmployeeBulkImportResponse)
async def upload_csv(
    file: UploadFile = File(..., description="CSV file with employee data"),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Upload CSV file to bulk import employees.

    CSV format:
    employee_id,email,full_name,age_range,gender,languages,technical_literacy,seniority,department,job_title

    Example:
    EMP001,john@example.com,John Doe,35_44,male,"en,ar",7,senior,IT,Software Engineer

    Requires TENANT_ADMIN or PLATFORM_SUPER_ADMIN role.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV file"
        )

    # Read CSV content with error handling
    try:
        content = await file.read()
        csv_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be UTF-8 encoded"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading CSV file: {str(e)}"
        )

    employees = []
    successful = 0
    failed = 0
    errors = []

    # Validate CSV headers
    try:
        fieldnames = csv_reader.fieldnames
        required_fields = {'employee_id', 'email', 'full_name', 'age_range', 'technical_literacy', 'seniority', 'department'}
        if not fieldnames or not required_fields.issubset(set(fieldnames)):
            missing = required_fields - (set(fieldnames) if fieldnames else set())
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"CSV missing required headers: {', '.join(missing)}"
            )
    except AttributeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid CSV format - no headers found"
        )

    for idx, row in enumerate(csv_reader, start=2):  # Start at 2 (row 1 is header)
        try:
            # Validate required fields exist in row
            if not row.get('employee_id'):
                errors.append({"row": idx, "error": "Missing employee_id"})
                failed += 1
                continue

            # Parse languages (comma-separated in quotes)
            languages_str = row.get('languages', '').strip('"')
            languages = [lang.strip() for lang in languages_str.split(',') if lang.strip()]

            # Parse technical literacy with validation
            try:
                tech_lit = int(row['technical_literacy'])
                if not (0 <= tech_lit <= 10):
                    raise ValueError("Must be 0-10")
            except (ValueError, KeyError) as e:
                errors.append({"row": idx, "employee_id": row.get('employee_id'), "error": f"Invalid technical_literacy: {str(e)}"})
                failed += 1
                continue

            employee_data = EmployeeCreate(
                employee_id=row['employee_id'],
                email=row['email'],
                full_name=row['full_name'],
                age_range=row['age_range'],
                gender=row.get('gender') if row.get('gender') else None,
                languages=languages,
                technical_literacy=tech_lit,
                seniority=row['seniority'],
                department=row['department'],
                job_title=row.get('job_title') if row.get('job_title') else None
            )

            # Check if employee_id already exists
            existing = db.query(Employee).filter(
                Employee.tenant_id == current_user.tenant_id,
                Employee.employee_id == employee_data.employee_id,
                Employee.deleted_at == None
            ).first()

            if existing:
                errors.append({
                    "row": idx,
                    "employee_id": employee_data.employee_id,
                    "error": "Employee ID already exists"
                })
                failed += 1
                continue

            # Calculate risk score using risk engine
            from app.core.risk_engine import RiskScoringEngine, EmployeeProfile, Scenario

            risk_engine = RiskScoringEngine()
            employee_profile = EmployeeProfile(
                age_range=employee_data.age_range,
                gender=employee_data.gender.upper() if employee_data.gender else "MALE",
                languages=employee_data.languages or ["en"],
                technical_literacy=int(employee_data.technical_literacy),
                seniority=employee_data.seniority.upper(),
                department=employee_data.department,
                job_title=employee_data.job_title or ""
            )
            # Default generic phishing scenario for initial risk assessment
            # Use employee's primary language or default to English
            primary_language = employee_data.languages[0] if employee_data.languages else "en"
            scenario = Scenario(category="CREDENTIALS", language=primary_language)
            risk_result = risk_engine.calculate_risk(employee_profile, scenario, employee_data.employee_id)

            # Create employee with risk score
            employee = Employee(
                tenant_id=current_user.tenant_id,
                employee_id=employee_data.employee_id,
                email=employee_data.email,
                full_name=employee_data.full_name,
                age_range=employee_data.age_range,
                gender=employee_data.gender if employee_data.gender else None,
                languages=employee_data.languages,
                technical_literacy=employee_data.technical_literacy,
                seniority=employee_data.seniority,
                department=employee_data.department,
                job_title=employee_data.job_title,
                risk_score=float(risk_result.risk_score) / 10.0,  # Convert 0-100 scale to 0-10 scale
                risk_band=risk_result.risk_band.value if hasattr(risk_result.risk_band, 'value') else str(risk_result.risk_band)
            )

            db.add(employee)
            successful += 1

        except Exception as e:
            errors.append({
                "row": idx,
                "employee_id": row.get('employee_id', 'unknown'),
                "error": str(e)
            })
            failed += 1

    # Commit all successful imports
    if successful > 0:
        db.commit()

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="EMPLOYEES_CSV_UPLOAD",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="employee",
        resource_id=None,
        details={
            "filename": file.filename,
            "total_processed": successful + failed,
            "successful": successful,
            "failed": failed
        },
        status="success" if failed == 0 else "partial_success"
    )

    logger.info(f"CSV import: {successful} successful, {failed} failed by user {current_user.email}")

    return EmployeeBulkImportResponse(
        total_processed=successful + failed,
        successful=successful,
        failed=failed,
        errors=errors
    )


@router.post("/{employee_id}/assign-assessments")
def assign_assessments_to_employee(
    employee_id: UUID,
    request_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Assign multiple assessments to a specific employee.

    Creates AssessmentResult records for each assessment-employee pair.
    Request body: { assessment_ids: [...], due_date: "...", risk_priority: "..." }
    """
    from app.models.assessment import Assessment, AssessmentResult
    from datetime import datetime

    # Extract data from request
    assessment_ids = request_data.get("assessment_ids", [])
    due_date = request_data.get("due_date")
    risk_priority = request_data.get("risk_priority", "standard")

    if not assessment_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No assessments provided"
        )

    # Verify employee exists and belongs to tenant
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.tenant_id == current_user.tenant_id,
        Employee.is_active == True,
        Employee.deleted_at.is_(None),
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    # Verify all assessments exist and belong to tenant
    assessments = db.query(Assessment).filter(
        Assessment.id.in_(assessment_ids),
        Assessment.tenant_id == current_user.tenant_id,
    ).all()

    if len(assessments) != len(assessment_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more assessments not found"
        )

    # Create AssessmentResult records
    created_count = 0
    for assessment in assessments:
        # Check if already assigned
        existing = db.query(AssessmentResult).filter(
            AssessmentResult.assessment_id == assessment.id,
            AssessmentResult.employee_id == employee.id,
        ).first()

        if not existing:
            result = AssessmentResult(
                assessment_id=assessment.id,
                employee_id=employee.id,
                status="in_progress",
                started_at=datetime.utcnow(),
            )
            db.add(result)
            created_count += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to assign assessments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign assessments: {str(e)}"
        )

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="EMPLOYEE_ASSESSMENTS_ASSIGNED",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="employee",
        resource_id=employee.id,
        details={
            "employee_id": str(employee_id),
            "employee_name": employee.full_name,
            "assigned_count": created_count,
            "assessment_ids": [str(aid) for aid in assessment_ids]
        },
        status="success"
    )

    logger.info(f"Assigned {created_count} assessments to employee {employee.full_name} by user {current_user.email}")

    return {
        "message": f"Successfully assigned {created_count} assessment(s)",
        "employee_id": str(employee_id),
        "assigned_count": created_count,
    }


