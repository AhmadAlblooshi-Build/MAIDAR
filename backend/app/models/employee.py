"""Employee database model."""

from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, ARRAY, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base, UUIDMixin, TimestampMixin, SoftDeleteMixin


class Employee(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """
    Employee model - core data for risk assessment.

    Complies with UAE data minimization requirements.
    Only collects risk-relevant attributes.
    """

    __tablename__ = 'employees'

    # Tenant isolation
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True)

    # Identifiers (minimally collected)
    employee_id = Column(String(100), nullable=True)  # External employee ID from organization
    email = Column(String(255), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)

    # Likelihood factors
    age_range = Column(String(20), nullable=False, index=True)  # Validated by Pydantic schema
    gender = Column(String(20), nullable=True)  # Validated by Pydantic schema
    languages = Column(ARRAY(String), nullable=False, default=[])  # ISO 639-1 codes
    technical_literacy = Column(Integer, nullable=False)

    # Impact factors
    seniority = Column(String(20), nullable=False, index=True)  # Validated by Pydantic schema
    department = Column(String(100), nullable=False, index=True)
    job_title = Column(String(255), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, index=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="employees")
    risk_scores = relationship("RiskScore", back_populates="employee", cascade="all, delete-orphan")
    simulation_results = relationship("SimulationResult", back_populates="employee", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        CheckConstraint('technical_literacy >= 0 AND technical_literacy <= 10', name='check_technical_literacy_range'),
    )

    def __repr__(self) -> str:
        return f"<Employee {self.full_name} ({self.email})>"

    def to_profile(self):
        """Convert to EmployeeProfile for risk engine."""
        from app.core.risk_engine import EmployeeProfile

        return EmployeeProfile(
            age_range=self.age_range,
            gender=self.gender or "prefer_not_to_say",  # Gender is now a string
            languages=self.languages,
            technical_literacy=self.technical_literacy,
            seniority=self.seniority,
            department=self.department,
            job_title=self.job_title
        )
