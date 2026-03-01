"""Scenario database model."""

from sqlalchemy import Column, String, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base, UUIDMixin, TimestampMixin


class Scenario(Base, UUIDMixin, TimestampMixin):
    """
    Scenario model - phishing scenario definitions.

    Stores scenario templates for the AI Scenario Lab.
    """

    __tablename__ = 'scenarios'

    # Tenant isolation (nullable for global/system scenarios)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=True, index=True)

    # Basic info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Scenario properties
    category = Column(String(20), nullable=False, index=True)  # Validated by Pydantic schema
    language = Column(String(10), nullable=False, index=True)  # ISO 639-1 code
    difficulty = Column(String(20), nullable=True)  # easy, medium, hard

    # Email template fields
    email_subject = Column(Text, nullable=False)
    email_body_html = Column(Text, nullable=False)
    email_body_text = Column(Text, nullable=True)
    sender_name = Column(String(255), nullable=False)
    sender_email = Column(String(255), nullable=False)
    has_link = Column(Boolean, default=True)
    has_attachment = Column(Boolean, default=False)
    has_credential_form = Column(Boolean, default=False)

    # Template content (for AI Scenario Lab - deprecated, use email fields above)
    subject_template = Column(Text, nullable=True)
    body_template = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    is_template = Column(Boolean, default=False, index=True)  # System/global templates

    # Created by
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="scenarios")
    created_by_user = relationship("User", back_populates="created_scenarios", foreign_keys=[created_by])
    risk_scores = relationship("RiskScore", back_populates="scenario", cascade="all, delete-orphan")
    simulations = relationship("Simulation", back_populates="scenario")

    def __repr__(self) -> str:
        return f"<Scenario {self.name} ({self.category})>"

    def to_scenario(self):
        """Convert to Scenario object for risk engine."""
        from app.core.risk_engine import Scenario as RiskEngineScenario

        return RiskEngineScenario(
            category=self.category,
            language=self.language
        )
