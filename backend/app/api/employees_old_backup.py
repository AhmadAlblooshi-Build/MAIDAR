"""
Employee Management API endpoints.

Handles CRUD operations for employees with UAE compliance.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, EmailStr

from app.config.database import get_db
from app.models.employee import Employee
from app.models.audit_log import AuditLog, AuditAction
from app.core.risk_engine import AgeRange, Gender, Seniority

router = APIRouter()


# ============================================================================
# SCHEMAS
# ============================================================================

class EmployeeCreate(BaseModel):
    """Schema for creating a new employee."""
    employee_id: Optional[str] = None
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    age_range: AgeRange
    gender: Optional[Gender] = None
    languages: List[str] = Field(default=["en"])
    technical_literacy: int = Field(..., ge=0, le=10)
    seniority: Seniority
    department: str = Field(..., min_length=1, max_length=100)
    job_title: Optional[str] = None


class EmployeeResponse(BaseModel):
    """Schema for employee response."""
    id: str
    employee_id: Optional[str]
    email: str
    full_name: str
    age_range: AgeRange
    gender: Optional[Gender]
    languages: List[str]
    technical_literacy: int
    seniority: Seniority
    department: str
    job_title: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/", response_model=EmployeeResponse, status_code=201)
def create_employee(
    employee_data: EmployeeCreate,
    tenant_id: str,  # TODO: Extract from auth token
    db: Session = Depends(get_db)
):
    """
    Create a new employee profile.

    **Data Minimization**: Only collects risk-relevant attributes per UAE PDPL.
    **Audit Trail**: Logs creation for compliance.
    """
    # Create employee
    employee = Employee(
        tenant_id=tenant_id,
        employee_id=employee_data.employee_id,
        email=employee_data.email,
        full_name=employee_data.full_name,
        age_range=employee_data.age_range,
        gender=employee_data.gender,
        languages=employee_data.languages,
        technical_literacy=employee_data.technical_literacy,
        seniority=employee_data.seniority,
        department=employee_data.department,
        job_title=employee_data.job_title,
    )

    db.add(employee)

    # Audit log
    audit_entry = AuditLog.log(
        action=AuditAction.EMPLOYEE_CREATED,
        tenant_id=tenant_id,
        resource_type='employee',
        resource_id=str(employee.id),
        details={'email': employee.email, 'name': employee.full_name}
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(employee)

    return EmployeeResponse(
        id=str(employee.id),
        employee_id=employee.employee_id,
        email=employee.email,
        full_name=employee.full_name,
        age_range=employee.age_range,
        gender=employee.gender,
        languages=employee.languages,
        technical_literacy=employee.technical_literacy,
        seniority=employee.seniority,
        department=employee.department,
        job_title=employee.job_title,
        is_active=employee.is_active
    )


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: str,
    db: Session = Depends(get_db)
):
    """Get employee by ID."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    return EmployeeResponse(
        id=str(employee.id),
        employee_id=employee.employee_id,
        email=employee.email,
        full_name=employee.full_name,
        age_range=employee.age_range,
        gender=employee.gender,
        languages=employee.languages,
        technical_literacy=employee.technical_literacy,
        seniority=employee.seniority,
        department=employee.department,
        job_title=employee.job_title,
        is_active=employee.is_active
    )


@router.get("/", response_model=List[EmployeeResponse])
def list_employees(
    tenant_id: str,  # TODO: Extract from auth token
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all employees for a tenant.

    **Tenant Isolation**: Only returns employees for the requesting tenant.
    """
    employees = db.query(Employee).filter(
        Employee.tenant_id == tenant_id,
        Employee.is_active == True
    ).offset(skip).limit(limit).all()

    return [
        EmployeeResponse(
            id=str(e.id),
            employee_id=e.employee_id,
            email=e.email,
            full_name=e.full_name,
            age_range=e.age_range,
            gender=e.gender,
            languages=e.languages,
            technical_literacy=e.technical_literacy,
            seniority=e.seniority,
            department=e.department,
            job_title=e.job_title,
            is_active=e.is_active
        )
        for e in employees
    ]


@router.delete("/{employee_id}", status_code=204)
def delete_employee(
    employee_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete employee (soft delete for right to erasure).

    **UAE PDPL Compliance**: Supports right to erasure.
    """
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Soft delete
    employee.soft_delete()

    # Audit log
    audit_entry = AuditLog.log(
        action=AuditAction.EMPLOYEE_DELETED,
        tenant_id=str(employee.tenant_id),
        resource_type='employee',
        resource_id=str(employee.id),
        details={'email': employee.email}
    )
    db.add(audit_entry)

    db.commit()

    return None
