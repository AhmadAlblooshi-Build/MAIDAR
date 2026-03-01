#!/usr/bin/env python3
"""Generate bcrypt hash for super admin password."""

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Password to hash
password = "Welldone1@"

# Generate hash
password_hash = pwd_context.hash(password)

print("Password hash generated:")
print(password_hash)
