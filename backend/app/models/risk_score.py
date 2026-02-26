"""Risk Score database model."""

from decimal import Decimal

from sqlalchemy import Column, String, Integer, ForeignKey, Enum as SQLEnum, DECIMAL, CheckConstraint, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.risk_engine import RiskBand
from .base import Base, UUIDMixin


class RiskScore(Base, UUIDMixin):
    """
    Risk Score model - calculated human risk scores with explainability.

    Each record represents a calculated risk score for an employee-scenario pair.
    Includes full explainability breakdown for transparency.
    """

    __tablename__ = 'risk_scores'

    # Tenant isolation
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True)

    # Foreign keys
    employee_id = Column(UUID(as_uuid=True), ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey('scenarios.id', ondelete='CASCADE'), nullable=False, index=True)

    # Core scores (0-1 range stored as DECIMAL for precision)
    likelihood = Column(DECIMAL(5, 4), nullable=False)  # 0.0000 to 1.0000
    impact = Column(DECIMAL(5, 4), nullable=False)  # 0.0000 to 1.0000

    # Final score (0-100)
    risk_score = Column(Integer, nullable=False, index=True)
    risk_band = Column(String(20), nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL

    # Explainability breakdown (stored as JSONB for flexibility)
    likelihood_breakdown = Column(JSONB, nullable=False)
    impact_breakdown = Column(JSONB, nullable=False)

    # Metadata
    algorithm_version = Column(String(20), nullable=False, default='v1.0')
    calculated_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="risk_scores")
    employee = relationship("Employee", back_populates="risk_scores")
    scenario = relationship("Scenario", back_populates="risk_scores")

    # Constraints
    __table_args__ = (
        CheckConstraint('likelihood >= 0 AND likelihood <= 1', name='check_likelihood_range'),
        CheckConstraint('impact >= 0 AND impact <= 1', name='check_impact_range'),
        CheckConstraint('risk_score >= 0 AND risk_score <= 100', name='check_risk_score_range'),
    )

    def __repr__(self) -> str:
        return f"<RiskScore employee={self.employee_id} scenario={self.scenario_id} score={self.risk_score}>"

    @classmethod
    def from_risk_score(cls, risk_score_obj, tenant_id: str, employee_id: str, scenario_id: str):
        """
        Create RiskScore database model from RiskScore calculation result.

        Args:
            risk_score_obj: RiskScore object from risk engine
            tenant_id: Tenant UUID
            employee_id: Employee UUID
            scenario_id: Scenario UUID

        Returns:
            RiskScore database model instance
        """
        from decimal import Decimal

        # Convert likelihood breakdown to dict
        likelihood_breakdown = {
            "tl_risk": float(risk_score_obj.likelihood_breakdown.tl_risk),
            "tl_contribution": float(risk_score_obj.likelihood_breakdown.tl_contribution),
            "age_modifier": float(risk_score_obj.likelihood_breakdown.age_modifier),
            "age_contribution": float(risk_score_obj.likelihood_breakdown.age_contribution),
            "lang_match": float(risk_score_obj.likelihood_breakdown.lang_match),
            "lang_contribution": float(risk_score_obj.likelihood_breakdown.lang_contribution),
            "gender_modifier": float(risk_score_obj.likelihood_breakdown.gender_modifier),
            "gender_contribution": float(risk_score_obj.likelihood_breakdown.gender_contribution),
            "total_likelihood": float(risk_score_obj.likelihood_breakdown.total_likelihood),
        }

        # Convert impact breakdown to dict
        impact_breakdown = {
            "seniority_impact": float(risk_score_obj.impact_breakdown.seniority_impact),
            "seniority_contribution": float(risk_score_obj.impact_breakdown.seniority_contribution),
            "role_impact": float(risk_score_obj.impact_breakdown.role_impact),
            "role_contribution": float(risk_score_obj.impact_breakdown.role_contribution),
            "alpha": float(risk_score_obj.impact_breakdown.alpha),
            "scenario_category": risk_score_obj.impact_breakdown.scenario_category,  # Already a string
            "total_impact": float(risk_score_obj.impact_breakdown.total_impact),
        }

        return cls(
            tenant_id=tenant_id,
            employee_id=employee_id,
            scenario_id=scenario_id,
            likelihood=risk_score_obj.likelihood,
            impact=risk_score_obj.impact,
            risk_score=risk_score_obj.risk_score,
            risk_band=risk_score_obj.risk_band,
            likelihood_breakdown=likelihood_breakdown,
            impact_breakdown=impact_breakdown,
            algorithm_version=risk_score_obj.algorithm_version,
        )
