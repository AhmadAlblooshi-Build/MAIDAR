"""
Global Analytics API - Cross-tenant platform intelligence
"""

from typing import Dict, List, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, Integer, case

from app.config.database import get_db
from app.models.employee import Employee
from app.models.tenant import Tenant
from app.core.dependencies import get_current_super_admin as require_super_admin
from app.models.user import User

router = APIRouter()


@router.get("/industry-risk")
async def get_industry_risk_distribution(
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Get average risk score by department across all tenants."""

    # Query average risk score by department
    department_risk = db.query(
        Employee.department,
        func.avg(Employee.risk_score).label('avg_risk'),
        func.count(Employee.id).label('employee_count')
    ).filter(
        Employee.deleted_at == None,
        Employee.department.isnot(None),
        Employee.risk_score.isnot(None)
    ).group_by(
        Employee.department
    ).order_by(
        func.avg(Employee.risk_score).desc()
    ).all()

    # Format response
    risk_data = []
    for dept, avg_risk, count in department_risk:
        risk_data.append({
            'department': dept,
            'risk_score': round(float(avg_risk) * 10, 1) if avg_risk else 0,  # Convert to 0-100 scale
            'employee_count': count
        })

    return {'departments': risk_data}


@router.get("/regional-integrity")
async def get_regional_integrity(
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Get tenant distribution and health by region."""

    # Query tenant count by region
    regional_data = db.query(
        Tenant.data_residency_region,
        func.count(Tenant.id).label('tenant_count')
    ).filter(
        Tenant.deleted_at == None,
        Tenant.data_residency_region.isnot(None)
    ).group_by(
        Tenant.data_residency_region
    ).all()

    # Format response with status determination
    regions = []
    for region, total in regional_data:
        # Count active tenants for this region separately
        active = db.query(func.count(Tenant.id)).filter(
            Tenant.deleted_at == None,
            Tenant.data_residency_region == region,
            Tenant.is_active == True
        ).scalar() or 0

        active_pct = (active / total * 100) if total > 0 else 0

        # Determine status based on active percentage
        if active_pct >= 90:
            status = 'Nominal'
        elif active_pct >= 70:
            status = 'Optimal'
        else:
            status = 'Elevated'

        regions.append({
            'region': region,
            'tenant_count': total,
            'active_count': active,
            'active_percentage': round(active_pct, 1),
            'status': status
        })

    # Calculate overall uptime
    total_tenants = sum(r['tenant_count'] for r in regions)
    total_active = sum(r['active_count'] for r in regions)
    cluster_uptime = round((total_active / total_tenants * 100), 1) if total_tenants > 0 else 100

    return {
        'regions': regions,
        'cluster_uptime': cluster_uptime
    }
