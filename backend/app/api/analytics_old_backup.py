"""
Analytics API endpoints.

Provides executive-level risk analytics and dashboards.
"""

from typing import Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.config.database import get_db
from app.models.risk_score import RiskScore
from app.models.employee import Employee
from app.core.risk_engine import RiskBand, Seniority, AgeRange

router = APIRouter()


# ============================================================================
# SCHEMAS
# ============================================================================

class CompanyRiskOverview(BaseModel):
    """Company-wide risk overview."""
    total_employees: int
    average_risk_score: float
    risk_distribution: Dict[str, int]  # {LOW: 10, MEDIUM: 20, HIGH: 15, CRITICAL: 5}
    highest_risk_employees: List[Dict]


class RiskByDepartment(BaseModel):
    """Risk breakdown by department."""
    department: str
    employee_count: int
    average_risk_score: float
    risk_band: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/overview")
def get_company_risk_overview(
    tenant_id: str,  # TODO: Extract from auth token
    db: Session = Depends(get_db)
):
    """
    Get company-wide risk overview.

    **Executive Dashboard**: High-level risk metrics.
    **No Technical Jargon**: Business-friendly language.
    """
    # Total employees
    total_employees = db.query(Employee).filter(
        Employee.tenant_id == tenant_id,
        Employee.is_active == True
    ).count()

    # Average risk score
    avg_risk = db.query(func.avg(RiskScore.risk_score)).filter(
        RiskScore.tenant_id == tenant_id
    ).scalar() or 0

    # Risk distribution by band
    risk_dist = db.query(
        RiskScore.risk_band,
        func.count(func.distinct(RiskScore.employee_id))
    ).filter(
        RiskScore.tenant_id == tenant_id
    ).group_by(RiskScore.risk_band).all()

    risk_distribution = {band.value: count for band, count in risk_dist}

    # Top 10 highest risk employees
    top_risks = db.query(
        Employee.id,
        Employee.full_name,
        Employee.department,
        func.max(RiskScore.risk_score).label('max_risk')
    ).join(RiskScore).filter(
        Employee.tenant_id == tenant_id,
        Employee.is_active == True
    ).group_by(
        Employee.id, Employee.full_name, Employee.department
    ).order_by(func.max(RiskScore.risk_score).desc()).limit(10).all()

    highest_risk_employees = [
        {
            "employee_id": str(emp_id),
            "name": name,
            "department": dept,
            "risk_score": int(risk)
        }
        for emp_id, name, dept, risk in top_risks
    ]

    return CompanyRiskOverview(
        total_employees=total_employees,
        average_risk_score=round(float(avg_risk), 2),
        risk_distribution=risk_distribution,
        highest_risk_employees=highest_risk_employees
    )


@router.get("/by-department", response_model=List[RiskByDepartment])
def get_risk_by_department(
    tenant_id: str,  # TODO: Extract from auth token
    db: Session = Depends(get_db)
):
    """
    Get risk breakdown by department.

    **Segmentation**: Identify high-risk departments.
    """
    dept_risks = db.query(
        Employee.department,
        func.count(func.distinct(Employee.id)).label('emp_count'),
        func.avg(RiskScore.risk_score).label('avg_risk')
    ).join(RiskScore).filter(
        Employee.tenant_id == tenant_id,
        Employee.is_active == True
    ).group_by(Employee.department).all()

    return [
        RiskByDepartment(
            department=dept,
            employee_count=count,
            average_risk_score=round(float(avg), 2),
            risk_band=_get_band_from_score(avg).value
        )
        for dept, count, avg in dept_risks
    ]


def _get_band_from_score(score: float) -> RiskBand:
    """Helper to get risk band from score."""
    if score <= 24:
        return RiskBand.LOW
    elif score <= 49:
        return RiskBand.MEDIUM
    elif score <= 74:
        return RiskBand.HIGH
    else:
        return RiskBand.CRITICAL
