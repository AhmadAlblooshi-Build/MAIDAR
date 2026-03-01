"""One-time script to fix admin password - run this via Railway CLI or locally."""

import os
import sys
from pathlib import Path

# Setup path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

from app.models.user import User

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def fix_admin_password():
    """Fix the admin user's password hash."""

    database_url = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:LvMBTXoNieUMpDBlscSIvWaIyMWgPwDV@shinkansen.proxy.rlwy.net:57496/railway")

    # Convert to psycopg format if needed
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)

    print(f"Connecting to database...")
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Find admin user
        admin = db.query(User).filter(User.email == "admin@maidar.io").first()

        if not admin:
            print("❌ Admin user not found!")
            return

        print(f"Found admin user: {admin.email}")
        print(f"Current hash length: {len(admin.hashed_password)}")

        # Create new password hash
        new_hash = pwd_context.hash("Welldone1@")
        print(f"New hash length: {len(new_hash)}")

        # Update password
        admin.hashed_password = new_hash
        db.commit()

        print("✅ Password updated successfully!")
        print("✅ You can now login with: admin@maidar.io / Welldone1@")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_admin_password()
