"""Simulation database models."""

from enum import Enum
from datetime import datetime

from sqlalchemy import Column, String, Text, Boolean, ForeignKey, Enum as SQLEnum, DateTime, ARRAY, Interval
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from .base import Base, UUIDMixin, TimestampMixin


class SimulationStatus(str, Enum):
    """Simulation status enum."""
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Simulation(Base, UUIDMixin, TimestampMixin):
    """
    Simulation model - phishing simulation campaigns.

    Manages phishing simulation campaigns targeting employees.
    """

    __tablename__ = 'simulations'

    # Tenant isolation
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey('scenarios.id', ondelete='RESTRICT'), nullable=False)

    # Basic info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="DRAFT", index=True)  # Validated by Pydantic schema

    # Targeting
    target_employee_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)

    # Scheduling
    scheduled_at = Column(DateTime(timezone=True), nullable=True, index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Tracking configuration
    send_immediately = Column(Boolean, default=True)
    track_opens = Column(Boolean, default=True)
    track_clicks = Column(Boolean, default=True)
    track_credentials = Column(Boolean, default=True)

    # Created by
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="simulations")
    scenario = relationship("Scenario", back_populates="simulations")
    created_by_user = relationship("User", back_populates="created_simulations", foreign_keys=[created_by])
    results = relationship("SimulationResult", back_populates="simulation", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Simulation {self.name} ({self.status})>"


class InteractionType(str, Enum):
    """Types of interactions with simulated phishing emails."""
    EMAIL_OPENED = "EMAIL_OPENED"
    LINK_CLICKED = "LINK_CLICKED"
    CREDENTIALS_ENTERED = "CREDENTIALS_ENTERED"
    ATTACHMENT_DOWNLOADED = "ATTACHMENT_DOWNLOADED"
    REPORTED_AS_PHISHING = "REPORTED_AS_PHISHING"


class SimulationResult(Base, UUIDMixin, TimestampMixin):
    """
    Simulation Result model - employee interaction tracking.

    Tracks how employees interact with simulated phishing emails.
    """

    __tablename__ = 'simulation_results'

    # Tenant isolation
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True)
    simulation_id = Column(UUID(as_uuid=True), ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)

    # Email delivery
    email_sent_at = Column(DateTime(timezone=True), nullable=True)  # Nullable until email is sent
    email_delivered = Column(Boolean, default=False)

    # Interactions (array of interaction events stored as JSONB)
    # Each interaction: {type: InteractionType, timestamp: datetime}
    interactions = Column(JSONB, default=list)

    # Outcome
    fell_for_simulation = Column(Boolean, default=False, index=True)
    reported_as_phishing = Column(Boolean, default=False)

    # Timing metrics
    time_to_first_interaction = Column(Interval, nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="simulation_results")
    simulation = relationship("Simulation", back_populates="results")
    employee = relationship("Employee", back_populates="simulation_results")

    def __repr__(self) -> str:
        return f"<SimulationResult simulation={self.simulation_id} employee={self.employee_id}>"

    @property
    def email_opened(self) -> bool:
        """Check if email was opened."""
        if not self.interactions:
            return False
        return any(i.get("type") == InteractionType.EMAIL_OPENED.value for i in self.interactions)

    @property
    def link_clicked(self) -> bool:
        """Check if link was clicked."""
        if not self.interactions:
            return False
        return any(i.get("type") == InteractionType.LINK_CLICKED.value for i in self.interactions)

    @property
    def credentials_entered(self) -> bool:
        """Check if credentials were entered."""
        if not self.interactions:
            return False
        return any(i.get("type") == InteractionType.CREDENTIALS_ENTERED.value for i in self.interactions)

    # Alias for backwards compatibility
    @property
    def credentials_submitted(self) -> bool:
        """Alias for credentials_entered for backwards compatibility."""
        return self.credentials_entered

    @property
    def credentials_submitted_at(self):
        """Get timestamp when credentials were submitted."""
        if not self.interactions:
            return None
        for interaction in self.interactions:
            if interaction.get("type") == InteractionType.CREDENTIALS_ENTERED.value:
                timestamp_str = interaction.get("timestamp")
                if timestamp_str:
                    from datetime import datetime
                    return datetime.fromisoformat(timestamp_str) if isinstance(timestamp_str, str) else timestamp_str
        return None

    def add_interaction(self, interaction_type: InteractionType):
        """Add an interaction event."""
        if self.interactions is None:
            self.interactions = []

        interaction = {
            "type": interaction_type.value,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Convert to list if it's a string (for compatibility)
        if isinstance(self.interactions, str):
            import json
            self.interactions = json.loads(self.interactions)

        self.interactions.append(interaction)

        # Update outcome flags
        if interaction_type in [InteractionType.LINK_CLICKED, InteractionType.CREDENTIALS_ENTERED, InteractionType.ATTACHMENT_DOWNLOADED]:
            self.fell_for_simulation = True

        if interaction_type == InteractionType.REPORTED_AS_PHISHING:
            self.reported_as_phishing = True
