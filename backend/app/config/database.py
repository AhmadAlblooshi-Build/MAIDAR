"""Database connection and session management."""

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.config.settings import settings

# Create SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,  # Verify connections before using
    echo=settings.DEBUG,  # Log SQL statements in debug mode
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI endpoints to get database session.

    Usage in FastAPI:
        @app.get("/employees")
        def list_employees(db: Session = Depends(get_db)):
            return db.query(Employee).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context manager for database sessions outside FastAPI.

    Usage:
        with get_db_context() as db:
            employees = db.query(Employee).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database (create tables if they don't exist).

    WARNING: In production, use Alembic migrations instead.
    """
    from app.models.base import Base
    from app.models import (
        Tenant,
        User,
        Employee,
        Scenario,
        RiskScore,
        Simulation,
        SimulationResult,
        AuditLog,
    )

    Base.metadata.create_all(bind=engine)
