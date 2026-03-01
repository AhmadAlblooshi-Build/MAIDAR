"""Create admin user directly via SQL."""

import psycopg
from passlib.context import CryptContext
import uuid

# Database connection
DATABASE_URL = "postgresql://postgres:LvMBTXoNieUMpDBlscSIvWaIyMWgPwDV@shinkansen.proxy.rlwy.net:57496/railway"

# Password hasher
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    """Create admin user with proper password hash."""

    print("Connecting to Railway database...")
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Step 1: Check/Create tenant
        print("\n1. Checking for admin tenant...")
        cur.execute("SELECT id FROM tenants WHERE subdomain = 'admin'")
        result = cur.fetchone()

        if result:
            tenant_id = result[0]
            print(f"   Found existing tenant ID: {tenant_id}")
        else:
            print("   Creating admin tenant...")
            tenant_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO tenants (id, name, subdomain, country_code, data_residency_region, is_active)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (tenant_id, 'Admin Organization', 'admin', 'UAE', 'UAE', True))
            conn.commit()
            print(f"   Created tenant ID: {tenant_id}")

        # Step 2: Delete existing admin if present
        print("\n2. Checking for existing admin user...")
        cur.execute("SELECT id FROM users WHERE email = 'admin@maidar.io'")
        if cur.fetchone():
            print("   Deleting existing admin user...")
            cur.execute("DELETE FROM users WHERE email = 'admin@maidar.io'")
            conn.commit()
            print("   Deleted!")
        else:
            print("   No existing admin found")

        # Step 3: Create admin with proper password hash
        print("\n3. Creating admin user...")
        password_hash = pwd_context.hash("Welldone1@")
        print(f"   Generated password hash (length: {len(password_hash)})")

        user_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO users (id, email, full_name, password_hash, role, is_active, tenant_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            'admin@maidar.io',
            'Super Administrator',
            password_hash,
            'SUPER_ADMIN',
            True,
            tenant_id
        ))
        conn.commit()

        print(f"\n{'='*60}")
        print(f"SUCCESS! Admin user created!")
        print(f"{'='*60}")
        print(f"User ID: {user_id}")
        print(f"Email: admin@maidar.io")
        print(f"Password: Welldone1@")
        print(f"Role: SUPER_ADMIN")
        print(f"{'='*60}")

    except Exception as e:
        print(f"\nERROR: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_admin()
