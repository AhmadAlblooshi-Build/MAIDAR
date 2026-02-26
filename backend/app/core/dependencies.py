"""
FastAPI dependencies for authentication and authorization.
"""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.config.settings import settings
from app.models.user import User, UserRole

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from JWT token.

    Args:
        token: JWT access token
        db: Database session

    Returns:
        User object

    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")

        if email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get the current active user.

    Args:
        current_user: Current user from token

    Returns:
        User object

    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get the current user and verify they have admin privileges.

    Args:
        current_user: Current user from token

    Returns:
        User object

    Raises:
        HTTPException: If user is not an admin
    """
    if current_user.role not in [UserRole.TENANT_ADMIN, UserRole.PLATFORM_SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


def get_current_super_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get the current user and verify they are a platform super admin.

    Args:
        current_user: Current user from token

    Returns:
        User object

    Raises:
        HTTPException: If user is not a super admin
    """
    if current_user.role != UserRole.PLATFORM_SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_user


def check_tenant_access(
    tenant_id: str,
    current_user: User = Depends(get_current_user)
) -> bool:
    """
    Check if the current user has access to a specific tenant.

    Args:
        tenant_id: Tenant UUID to check
        current_user: Current authenticated user

    Returns:
        True if user has access

    Raises:
        HTTPException: If user doesn't have access
    """
    # Platform super admins have access to all tenants
    if current_user.role == UserRole.PLATFORM_SUPER_ADMIN:
        return True

    # Regular users can only access their own tenant
    if str(current_user.tenant_id) != str(tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this tenant is forbidden"
        )

    return True


class RateLimiter:
    """
    Simple rate limiter for authentication endpoints.

    In production, use Redis-based rate limiting.
    """

    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        """
        Initialize rate limiter.

        Args:
            max_attempts: Maximum attempts allowed
            window_seconds: Time window in seconds
        """
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.attempts = {}  # In-memory storage (use Redis in production)

    def is_allowed(self, identifier: str) -> bool:
        """
        Check if request is allowed.

        Args:
            identifier: Unique identifier (e.g., IP address or email)

        Returns:
            True if allowed, False if rate limited
        """
        import time

        current_time = time.time()

        if identifier not in self.attempts:
            self.attempts[identifier] = []

        # Remove old attempts outside the window
        self.attempts[identifier] = [
            attempt_time
            for attempt_time in self.attempts[identifier]
            if current_time - attempt_time < self.window_seconds
        ]

        # Check if limit exceeded
        if len(self.attempts[identifier]) >= self.max_attempts:
            return False

        # Add current attempt
        self.attempts[identifier].append(current_time)
        return True


# Global rate limiter instances
login_rate_limiter = RateLimiter(max_attempts=5, window_seconds=300)  # 5 attempts per 5 minutes
password_reset_limiter = RateLimiter(max_attempts=3, window_seconds=3600)  # 3 attempts per hour
