"""Initialize database with all tables."""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.config.database import engine
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

def init_database():
    """Create all database tables."""
    print("Creating database tables...")

    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("[SUCCESS] Database tables created successfully!")

        # List all created tables
        print("\nCreated tables:")
        for table_name in Base.metadata.tables.keys():
            print(f"  - {table_name}")

        return True
    except Exception as e:
        print(f"[ERROR] Failed to create tables: {e}")
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
