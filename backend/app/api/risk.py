"""
Risk Scoring API endpoints.

Core API for calculating human risk scores.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.config.database import get_db
from app.core.dependencies import get_current_user, check_tenant_access
from app.models.user import User
from app.core.risk_engine import (
    calculate_risk_score,
    EmployeeProfile,
    Scenario,
    AgeRange,
    Gender,
    Seniority,
    ScenarioCategory,
    RiskBand,
)
from app.models.employee import Employee
from app.models.scenario import Scenario as ScenarioModel
from app.models.risk_score import RiskScore as RiskScoreModel
from app.models.audit_log import AuditLog, AuditAction

router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class RiskCalculationRequest(BaseModel):
    """Request to calculate risk score for an employee-scenario pair."""
    employee_id: str = Field(..., description="Employee UUID")
    scenario_id: str = Field(..., description="Scenario UUID")
    save_to_database: bool = Field(default=True, description="Save result to database")


class LikelihoodBreakdownResponse(BaseModel):
    """Likelihood calculation breakdown for explainability."""
    tl_risk: float
    tl_contribution: float
    age_modifier: float
    age_contribution: float
    lang_match: float
    lang_contribution: float
    gender_modifier: float
    gender_contribution: float
    total_likelihood: float


class ImpactBreakdownResponse(BaseModel):
    """Impact calculation breakdown for explainability."""
    seniority_impact: float
    seniority_contribution: float
    role_impact: float
    role_contribution: float
    alpha: float
    scenario_category: str
    total_impact: float


class RiskScoreResponse(BaseModel):
    """Risk score response with full explainability."""
    employee_id: str
    scenario_id: str
    likelihood: float = Field(..., ge=0, le=1)
    impact: float = Field(..., ge=0, le=1)
    risk_score: int = Field(..., ge=0, le=100)
    risk_band: RiskBand
    likelihood_breakdown: LikelihoodBreakdownResponse
    impact_breakdown: ImpactBreakdownResponse
    algorithm_version: str

    class Config:
        from_attributes = True


class BulkRiskCalculationRequest(BaseModel):
    """Request to calculate risk scores for multiple employee-scenario pairs."""
    employee_ids: List[str] = Field(..., description="List of employee UUIDs")
    scenario_ids: List[str] = Field(..., description="List of scenario UUIDs")
    save_to_database: bool = Field(default=True, description="Save results to database")


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/calculate", response_model=RiskScoreResponse)
def calculate_risk(
    request: RiskCalculationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate risk score for an employee-scenario pair.

    This endpoint:
    1. Fetches employee and scenario from database
    2. Calculates risk using the MAIDAR risk engine
    3. Optionally saves the result to database
    4. Returns full explainability breakdown

    **Deterministic**: Same inputs always produce same outputs.
    **Explainable**: Includes breakdown of likelihood and impact components.
    **Scenario-aware**: Risk varies based on scenario type.
    """
    # Fetch employee
    employee = db.query(Employee).filter(
        Employee.id == request.employee_id,
        Employee.tenant_id == current_user.tenant_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Fetch scenario
    scenario = db.query(ScenarioModel).filter(
        ScenarioModel.id == request.scenario_id,
        ScenarioModel.tenant_id == current_user.tenant_id
    ).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Convert to risk engine objects
    employee_profile = employee.to_profile()
    scenario_obj = scenario.to_scenario()

    # Calculate risk score
    risk_score = calculate_risk_score(
        employee=employee_profile,
        scenario=scenario_obj,
        employee_id=str(employee.id)
    )

    # Save to database if requested
    if request.save_to_database:
        risk_score_record = RiskScoreModel.from_risk_score(
            risk_score_obj=risk_score,
            tenant_id=str(employee.tenant_id),
            employee_id=str(employee.id),
            scenario_id=str(scenario.id)
        )

        # Check if risk score already exists
        existing = db.query(RiskScoreModel).filter(
            RiskScoreModel.employee_id == employee.id,
            RiskScoreModel.scenario_id == scenario.id,
            RiskScoreModel.algorithm_version == risk_score.algorithm_version
        ).first()

        if existing:
            # Update existing
            existing.likelihood = risk_score.likelihood
            existing.impact = risk_score.impact
            existing.risk_score = risk_score.risk_score
            existing.risk_band = risk_score.risk_band
            existing.likelihood_breakdown = risk_score_record.likelihood_breakdown
            existing.impact_breakdown = risk_score_record.impact_breakdown
        else:
            # Create new
            db.add(risk_score_record)

        # Audit log
        audit_entry = AuditLog.log(
            action=AuditAction.RISK_SCORE_CALCULATED,
            tenant_id=str(employee.tenant_id),
            resource_type='risk_score',
            details={
                'employee_id': str(employee.id),
                'scenario_id': str(scenario.id),
                'risk_score': risk_score.risk_score,
                'risk_band': risk_score.risk_band
            }
        )
        db.add(audit_entry)

        db.commit()

    # Convert to response
    return RiskScoreResponse(
        employee_id=str(employee.id),
        scenario_id=str(scenario.id),
        likelihood=float(risk_score.likelihood),
        impact=float(risk_score.impact),
        risk_score=risk_score.risk_score,
        risk_band=risk_score.risk_band,
        likelihood_breakdown=LikelihoodBreakdownResponse(
            tl_risk=float(risk_score.likelihood_breakdown.tl_risk),
            tl_contribution=float(risk_score.likelihood_breakdown.tl_contribution),
            age_modifier=float(risk_score.likelihood_breakdown.age_modifier),
            age_contribution=float(risk_score.likelihood_breakdown.age_contribution),
            lang_match=float(risk_score.likelihood_breakdown.lang_match),
            lang_contribution=float(risk_score.likelihood_breakdown.lang_contribution),
            gender_modifier=float(risk_score.likelihood_breakdown.gender_modifier),
            gender_contribution=float(risk_score.likelihood_breakdown.gender_contribution),
            total_likelihood=float(risk_score.likelihood_breakdown.total_likelihood),
        ),
        impact_breakdown=ImpactBreakdownResponse(
            seniority_impact=float(risk_score.impact_breakdown.seniority_impact),
            seniority_contribution=float(risk_score.impact_breakdown.seniority_contribution),
            role_impact=float(risk_score.impact_breakdown.role_impact),
            role_contribution=float(risk_score.impact_breakdown.role_contribution),
            alpha=float(risk_score.impact_breakdown.alpha),
            scenario_category=risk_score.impact_breakdown.scenario_category,  # Already a string
            total_impact=float(risk_score.impact_breakdown.total_impact),
        ),
        algorithm_version=risk_score.algorithm_version
    )


@router.post("/calculate-bulk", response_model=List[RiskScoreResponse])
def calculate_risk_bulk(
    request: BulkRiskCalculationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate risk scores for multiple employee-scenario pairs in bulk.

    Efficient for calculating risk across:
    - All employees for a specific scenario
    - All scenarios for a specific employee
    - Multiple combinations

    Returns list of risk scores with full explainability.
    """
    results = []

    for employee_id in request.employee_ids:
        for scenario_id in request.scenario_ids:
            try:
                calc_request = RiskCalculationRequest(
                    employee_id=employee_id,
                    scenario_id=scenario_id,
                    save_to_database=request.save_to_database
                )
                risk_score = calculate_risk(calc_request, db, current_user)
                results.append(risk_score)
            except HTTPException:
                # Skip if employee or scenario not found
                continue

    return results


@router.get("/employee/{employee_id}", response_model=List[RiskScoreResponse])
def get_employee_risk_scores(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all calculated risk scores for a specific employee across all scenarios.

    Useful for:
    - Employee risk profile view
    - Comparing vulnerability across scenario types
    - Historical risk tracking
    """
    risk_scores = db.query(RiskScoreModel).filter(
        RiskScoreModel.employee_id == employee_id,
        RiskScoreModel.tenant_id == current_user.tenant_id
    ).all()

    if not risk_scores:
        raise HTTPException(status_code=404, detail="No risk scores found for this employee")

    return [
        RiskScoreResponse(
            employee_id=str(rs.employee_id),
            scenario_id=str(rs.scenario_id),
            likelihood=float(rs.likelihood),
            impact=float(rs.impact),
            risk_score=rs.risk_score,
            risk_band=rs.risk_band,
            likelihood_breakdown=LikelihoodBreakdownResponse(**rs.likelihood_breakdown),
            impact_breakdown=ImpactBreakdownResponse(**rs.impact_breakdown),
            algorithm_version=rs.algorithm_version
        )
        for rs in risk_scores
    ]


@router.get("/scenario/{scenario_id}", response_model=List[RiskScoreResponse])
def get_scenario_risk_scores(
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all calculated risk scores for a specific scenario across all employees.

    Useful for:
    - Identifying highest-risk employees for a scenario
    - Planning targeted simulations
    - Risk distribution analysis
    """
    risk_scores = db.query(RiskScoreModel).filter(
        RiskScoreModel.scenario_id == scenario_id,
        RiskScoreModel.tenant_id == current_user.tenant_id
    ).order_by(RiskScoreModel.risk_score.desc()).all()

    if not risk_scores:
        raise HTTPException(status_code=404, detail="No risk scores found for this scenario")

    return [
        RiskScoreResponse(
            employee_id=str(rs.employee_id),
            scenario_id=str(rs.scenario_id),
            likelihood=float(rs.likelihood),
            impact=float(rs.impact),
            risk_score=rs.risk_score,
            risk_band=rs.risk_band,
            likelihood_breakdown=LikelihoodBreakdownResponse(**rs.likelihood_breakdown),
            impact_breakdown=ImpactBreakdownResponse(**rs.impact_breakdown),
            algorithm_version=rs.algorithm_version
        )
        for rs in risk_scores
    ]
