"""Base model configuration for SQLAlchemy."""

from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, declared_attr


class Base(DeclarativeBase):
    """Base class for all database models."""

    # Generate __tablename__ automatically from class name
    @declared_attr.directive
    def __tablename__(cls) -> str:
        """Generate table name from class name (snake_case)."""
        # Convert CamelCase to snake_case
        name = cls.__name__
        return ''.join(['_' + c.lower() if c.isupper() else c for c in name]).lstrip('_') + 's'


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class UUIDMixin:
    """Mixin for UUID primary key."""

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)


class SoftDeleteMixin:
    """Mixin for soft delete support (right to erasure)."""

    deleted_at = Column(DateTime(timezone=True), nullable=True)

    @property
    def is_deleted(self) -> bool:
        """Check if record is soft deleted."""
        return self.deleted_at is not None

    def soft_delete(self):
        """Soft delete this record."""
        self.deleted_at = datetime.utcnow()

    def restore(self):
        """Restore a soft deleted record."""
        self.deleted_at = None
