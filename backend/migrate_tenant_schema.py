"""
Database migration: Add missing columns to tenants table
Adds: domain, license_tier, seats_total, seats_used, provisioned_date
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine, text
from app.config.settings import settings

def run_migration():
    """Add missing columns to tenants table."""
    engine = create_engine(settings.DATABASE_URL)

    migrations = [
        # Add domain column
        """
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS domain VARCHAR(255);
        """,

        # Update existing rows with default domain (based on subdomain)
        """
        UPDATE tenants
        SET domain = subdomain || '.com'
        WHERE domain IS NULL;
        """,

        # Make domain NOT NULL after setting defaults
        """
        ALTER TABLE tenants
        ALTER COLUMN domain SET NOT NULL;
        """,

        # Add license_tier column
        """
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS license_tier VARCHAR(50) DEFAULT 'Professional' NOT NULL;
        """,

        # Add seats_total column
        """
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS seats_total INTEGER DEFAULT 100 NOT NULL;
        """,

        # Add seats_used column
        """
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS seats_used INTEGER DEFAULT 0 NOT NULL;
        """,

        # Add provisioned_date column
        """
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS provisioned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
        """
    ]

    with engine.connect() as conn:
        print("Starting migration...")

        for i, migration in enumerate(migrations, 1):
            try:
                print(f"\n[{i}/{len(migrations)}] Executing migration...")
                print(migration.strip())
                conn.execute(text(migration))
                conn.commit()
                print(f"[OK] Step {i} completed successfully")
            except Exception as e:
                print(f"[ERROR] Step {i} failed: {e}")
                conn.rollback()
                raise

        print("\n[OK] All migrations completed successfully!")

        # Verify the changes
        print("\n--- Verifying schema ---")
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'tenants'
            AND column_name IN ('domain', 'license_tier', 'seats_total', 'seats_used', 'provisioned_date')
            ORDER BY column_name;
        """))

        print("\nNew columns in tenants table:")
        for row in result:
            print(f"  - {row[0]}: {row[1]} (nullable={row[2]}, default={row[3]})")

if __name__ == "__main__":
    try:
        run_migration()
        print("\n" + "="*60)
        print("Migration completed successfully!")
        print("="*60)
    except Exception as e:
        print("\n" + "="*60)
        print(f"Migration failed: {e}")
        print("="*60)
        sys.exit(1)
