"""
Unit tests for authentication endpoints.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_verification_token,
    create_password_reset_token,
    verify_token,
    generate_verification_code
)
from app.models.user import User, UserRole
from app.models.tenant import Tenant


class TestPasswordHashing:
    """Test password hashing and verification."""

    def test_password_hashing(self):
        """Test that password hashing works correctly."""
        password = "TestPassword123"
        hashed = get_password_hash(password)

        assert hashed != password
        assert len(hashed) > 0
        assert verify_password(password, hashed)

    def test_different_passwords_different_hashes(self):
        """Test that same password generates different hashes (due to salt)."""
        password = "TestPassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        assert hash1 != hash2
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)

    def test_wrong_password_fails(self):
        """Test that wrong password fails verification."""
        password = "TestPassword123"
        wrong_password = "WrongPassword456"
        hashed = get_password_hash(password)

        assert not verify_password(wrong_password, hashed)


class TestJWTTokens:
    """Test JWT token creation and verification."""

    def test_create_access_token(self):
        """Test access token creation."""
        email = "test@example.com"
        token = create_access_token(data={"sub": email})

        assert token is not None
        assert len(token) > 0
        assert isinstance(token, str)

    def test_verify_access_token(self):
        """Test access token verification."""
        email = "test@example.com"
        token = create_access_token(data={"sub": email})

        # Verify token (no expected_type for access tokens)
        verified_email = verify_token(token)
        assert verified_email == email

    def test_create_verification_token(self):
        """Test verification token creation."""
        email = "test@example.com"
        token = create_verification_token(email)

        assert token is not None
        assert len(token) > 0

        # Verify token
        verified_email = verify_token(token, expected_type="email_verification")
        assert verified_email == email

    def test_create_password_reset_token(self):
        """Test password reset token creation."""
        email = "test@example.com"
        token = create_password_reset_token(email)

        assert token is not None
        assert len(token) > 0

        # Verify token
        verified_email = verify_token(token, expected_type="password_reset")
        assert verified_email == email

    def test_expired_token_fails(self):
        """Test that expired token fails verification."""
        email = "test@example.com"
        # Create token that expires immediately
        token = create_access_token(
            data={"sub": email},
            expires_delta=timedelta(seconds=-1)  # Already expired
        )

        # Verification should fail
        verified_email = verify_token(token)
        assert verified_email is None

    def test_wrong_token_type_fails(self):
        """Test that wrong token type fails verification."""
        email = "test@example.com"
        token = create_verification_token(email)

        # Try to verify as password reset token (should fail)
        verified_email = verify_token(token, expected_type="password_reset")
        assert verified_email is None


class TestVerificationCode:
    """Test verification code generation."""

    def test_generate_verification_code(self):
        """Test that verification code is 6 digits."""
        code = generate_verification_code()

        assert len(code) == 6
        assert code.isdigit()
        assert 0 <= int(code) <= 999999

    def test_verification_codes_are_different(self):
        """Test that multiple codes are different (most of the time)."""
        codes = [generate_verification_code() for _ in range(10)]

        # At least some codes should be different
        unique_codes = set(codes)
        assert len(unique_codes) > 1


class TestPasswordValidation:
    """Test password validation rules."""

    def test_valid_passwords(self):
        """Test that valid passwords pass validation."""
        from app.schemas.auth import UserRegister
        from pydantic import ValidationError

        valid_passwords = [
            "Password1",
            "TestPass123",
            "MySecureP@ss1",
            "ComplexPassword123",
        ]

        for password in valid_passwords:
            try:
                user = UserRegister(
                    email="test@example.com",
                    password=password,
                    full_name="Test User",
                    organization_name="Test Org"
                )
                assert user.password == password
            except ValidationError as e:
                pytest.fail(f"Valid password '{password}' failed validation: {e}")

    def test_invalid_passwords(self):
        """Test that invalid passwords fail validation."""
        from app.schemas.auth import UserRegister
        from pydantic import ValidationError

        invalid_passwords = [
            "short1",  # Too short
            "nouppercase1",  # No uppercase
            "NOLOWERCASE1",  # No lowercase (actually, this might pass - let's check)
            "NoDigits",  # No digits
            "password",  # Too simple
        ]

        for password in invalid_passwords:
            with pytest.raises(ValidationError):
                UserRegister(
                    email="test@example.com",
                    password=password,
                    full_name="Test User",
                    organization_name="Test Org"
                )


class TestUserModel:
    """Test User model functionality."""

    def test_user_can_access_own_tenant(self):
        """Test that user can access their own tenant."""
        from uuid import uuid4

        tenant_id = uuid4()
        user = User(
            email="test@example.com",
            password_hash="hashed",
            full_name="Test User",
            role=UserRole.ANALYST,
            tenant_id=tenant_id
        )

        assert user.can_access_tenant(str(tenant_id))

    def test_user_cannot_access_other_tenant(self):
        """Test that user cannot access other tenant."""
        from uuid import uuid4

        tenant_id = uuid4()
        other_tenant_id = uuid4()

        user = User(
            email="test@example.com",
            password_hash="hashed",
            full_name="Test User",
            role=UserRole.ANALYST,
            tenant_id=tenant_id
        )

        assert not user.can_access_tenant(str(other_tenant_id))

    def test_super_admin_can_access_any_tenant(self):
        """Test that super admin can access any tenant."""
        from uuid import uuid4

        any_tenant_id = uuid4()

        user = User(
            email="admin@example.com",
            password_hash="hashed",
            full_name="Super Admin",
            role=UserRole.PLATFORM_SUPER_ADMIN,
            tenant_id=None
        )

        assert user.can_access_tenant(str(any_tenant_id))


class TestRateLimiting:
    """Test rate limiting functionality."""

    def test_rate_limiter_allows_under_limit(self):
        """Test that rate limiter allows requests under limit."""
        from app.core.dependencies import RateLimiter

        limiter = RateLimiter(max_attempts=5, window_seconds=300)
        identifier = "test-user-1"

        # First 5 attempts should be allowed
        for i in range(5):
            assert limiter.is_allowed(identifier), f"Attempt {i+1} should be allowed"

    def test_rate_limiter_blocks_over_limit(self):
        """Test that rate limiter blocks requests over limit."""
        from app.core.dependencies import RateLimiter

        limiter = RateLimiter(max_attempts=3, window_seconds=300)
        identifier = "test-user-2"

        # First 3 attempts allowed
        for i in range(3):
            assert limiter.is_allowed(identifier)

        # 4th attempt should be blocked
        assert not limiter.is_allowed(identifier)

    def test_rate_limiter_resets_after_window(self):
        """Test that rate limiter resets after time window."""
        from app.core.dependencies import RateLimiter
        import time

        limiter = RateLimiter(max_attempts=2, window_seconds=1)
        identifier = "test-user-3"

        # Use up attempts
        assert limiter.is_allowed(identifier)
        assert limiter.is_allowed(identifier)
        assert not limiter.is_allowed(identifier)

        # Wait for window to expire
        time.sleep(1.1)

        # Should be allowed again
        assert limiter.is_allowed(identifier)


class TestTenantModel:
    """Test Tenant model functionality."""

    def test_tenant_creation(self):
        """Test tenant model creation."""
        tenant = Tenant(
            name="Test Organization",
            subdomain="test-org",
            country_code="UAE",
            data_residency_region="UAE"
        )

        assert tenant.name == "Test Organization"
        assert tenant.subdomain == "test-org"
        assert tenant.country_code == "UAE"
        assert tenant.data_residency_region == "UAE"
        assert tenant.is_active is True

    def test_tenant_repr(self):
        """Test tenant string representation."""
        tenant = Tenant(
            name="Test Org",
            subdomain="test"
        )

        assert repr(tenant) == "<Tenant Test Org (test)>"


def test_user_roles():
    """Test that all user roles are defined."""
    assert UserRole.PLATFORM_SUPER_ADMIN == "PLATFORM_SUPER_ADMIN"
    assert UserRole.TENANT_ADMIN == "TENANT_ADMIN"
    assert UserRole.ANALYST == "ANALYST"


# Integration test outline (requires database setup)
"""
class TestAuthenticationEndpoints:
    # These tests would require a test database
    # and FastAPI TestClient setup

    def test_register_first_user_becomes_super_admin(self):
        # Test that first user gets PLATFORM_SUPER_ADMIN role
        pass

    def test_register_with_organization_creates_tenant(self):
        # Test tenant creation on registration
        pass

    def test_register_duplicate_email_fails(self):
        # Test that duplicate email registration fails
        pass

    def test_login_with_valid_credentials(self):
        # Test successful login
        pass

    def test_login_with_invalid_credentials(self):
        # Test failed login
        pass

    def test_login_rate_limiting(self):
        # Test that login is rate limited
        pass

    def test_email_verification_with_code(self):
        # Test email verification with 6-digit code
        pass

    def test_email_verification_with_token(self):
        # Test email verification with token
        pass

    def test_password_reset_flow(self):
        # Test complete password reset flow
        pass

    def test_change_password(self):
        # Test password change for authenticated user
        pass

    def test_protected_endpoint_requires_auth(self):
        # Test that protected endpoints require authentication
        pass
"""


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
