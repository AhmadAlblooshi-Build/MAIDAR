"""Tenant database model for multi-tenancy."""

from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship

from .base import Base, UUIDMixin, TimestampMixin, SoftDeleteMixin


class Tenant(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """
    Tenant model for multi-tenant architecture.

    Each tenant represents an organization using MAIDAR.
    Ensures complete data isolation between organizations.
    """

    __tablename__ = 'tenants'

    # Basic info
    name = Column(String(255), nullable=False)
    subdomain = Column(String(100), unique=True, nullable=False, index=True)

    # Compliance
    country_code = Column(String(3), default='UAE')
    data_residency_region = Column(String(50), default='UAE')

    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    def __init__(self, **kwargs):
        """Initialize tenant with defaults."""
        # Set default for is_active if not provided
        if 'is_active' not in kwargs:
            kwargs['is_active'] = True
        super().__init__(**kwargs)

    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="tenant", cascade="all, delete-orphan")
    scenarios = relationship("Scenario", back_populates="tenant", cascade="all, delete-orphan")
    risk_scores = relationship("RiskScore", back_populates="tenant", cascade="all, delete-orphan")
    simulations = relationship("Simulation", back_populates="tenant", cascade="all, delete-orphan")
    simulation_results = relationship("SimulationResult", back_populates="tenant", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="tenant", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Tenant {self.name} ({self.subdomain})>"
