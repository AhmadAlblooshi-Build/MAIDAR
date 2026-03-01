"""Quick diagnostic to test Railway environment."""
import os
import sys

print("=" * 60)
print("RAILWAY ENVIRONMENT DIAGNOSTIC")
print("=" * 60)

# Check required environment variables
required_vars = [
    "DATABASE_URL",
    "REDIS_URL",
    "SECRET_KEY",
    "ENCRYPTION_KEY"
]

print("\n1. ENVIRONMENT VARIABLES:")
for var in required_vars:
    value = os.getenv(var)
    if value:
        # Mask sensitive values
        if len(value) > 20:
            display = value[:10] + "..." + value[-10:]
        else:
            display = value[:5] + "..."
        print(f"   ✓ {var}: {display}")
    else:
        print(f"   ✗ {var}: MISSING!")

# Test database connection
print("\n2. DATABASE CONNECTION:")
try:
    from sqlalchemy import create_engine, text
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("   ✓ Database connection successful!")
    else:
        print("   ✗ DATABASE_URL not set")
except Exception as e:
    print(f"   ✗ Database connection failed: {e}")

# Test Redis connection
print("\n3. REDIS CONNECTION:")
try:
    import redis
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        r = redis.from_url(redis_url)
        r.ping()
        print("   ✓ Redis connection successful!")
    else:
        print("   ✗ REDIS_URL not set")
except Exception as e:
    print(f"   ✗ Redis connection failed: {e}")

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)
