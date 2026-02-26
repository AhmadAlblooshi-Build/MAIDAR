"""
Security utilities for authentication and authorization.
"""

from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config.settings import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary of claims to encode in the token
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return encoded_jwt


def create_verification_token(email: str) -> str:
    """
    Create a verification token for email verification.

    Args:
        email: User email address

    Returns:
        Encoded JWT token valid for 24 hours
    """
    expires_delta = timedelta(hours=24)
    return create_access_token(
        data={"sub": email, "type": "email_verification"},
        expires_delta=expires_delta
    )


def create_password_reset_token(email: str) -> str:
    """
    Create a password reset token.

    Args:
        email: User email address

    Returns:
        Encoded JWT token valid for 1 hour
    """
    expires_delta = timedelta(hours=1)
    return create_access_token(
        data={"sub": email, "type": "password_reset"},
        expires_delta=expires_delta
    )


def verify_token(token: str, expected_type: Optional[str] = None) -> Optional[str]:
    """
    Verify a JWT token and extract the subject (email).

    Args:
        token: JWT token to verify
        expected_type: Expected token type (email_verification, password_reset, etc.)

    Returns:
        Email from token subject, or None if invalid
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")

        if email is None:
            return None

        if expected_type and token_type != expected_type:
            return None

        return email

    except JWTError:
        return None


def generate_verification_code() -> str:
    """
    Generate a 6-digit verification code.

    Returns:
        6-digit string code
    """
    import random
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])
