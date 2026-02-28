"""
Multi-Factor Authentication (MFA) service using TOTP.
"""

import pyotp
import qrcode
import secrets
import base64
from io import BytesIO
from typing import List, Tuple
from datetime import datetime


class MFAService:
    """Service for handling TOTP-based multi-factor authentication."""

    def __init__(self):
        """Initialize MFA service."""
        self.issuer_name = "MAIDAR"

    def generate_secret(self) -> str:
        """
        Generate a new TOTP secret key.

        Returns:
            Base32-encoded secret key
        """
        return pyotp.random_base32()

    def generate_qr_code(self, secret: str, user_email: str) -> str:
        """
        Generate QR code data URL for authenticator app setup.

        Args:
            secret: TOTP secret key
            user_email: User's email address

        Returns:
            Data URL containing QR code image (PNG, base64-encoded)
        """
        # Create TOTP URI
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user_email,
            issuer_name=self.issuer_name
        )

        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(provisioning_uri)
        qr.make(fit=True)

        # Create image
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64 data URL
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode()

        return f"data:image/png;base64,{img_base64}"

    def verify_token(self, secret: str, token: str) -> bool:
        """
        Verify a TOTP token.

        Args:
            secret: TOTP secret key
            token: 6-digit code from authenticator app

        Returns:
            True if token is valid, False otherwise
        """
        try:
            totp = pyotp.TOTP(secret)
            # Allow 30-second window for token validation
            return totp.verify(token, valid_window=1)
        except Exception:
            return False

    def generate_backup_codes(self, count: int = 10) -> List[str]:
        """
        Generate backup recovery codes.

        Args:
            count: Number of backup codes to generate (default: 10)

        Returns:
            List of backup codes (8 characters each)
        """
        backup_codes = []
        for _ in range(count):
            # Generate 8-character alphanumeric code
            code = secrets.token_hex(4).upper()  # 8 hex characters
            # Format as XXXX-XXXX for readability
            formatted_code = f"{code[:4]}-{code[4:]}"
            backup_codes.append(formatted_code)

        return backup_codes

    def verify_backup_code(self, provided_code: str, stored_codes: List[str]) -> Tuple[bool, List[str]]:
        """
        Verify a backup code and remove it from the list if valid.

        Args:
            provided_code: Code provided by user
            stored_codes: List of remaining valid backup codes

        Returns:
            Tuple of (is_valid, updated_codes_list)
        """
        # Normalize code (remove hyphens, convert to uppercase)
        normalized_code = provided_code.replace("-", "").upper()

        for stored_code in stored_codes:
            normalized_stored = stored_code.replace("-", "").upper()
            if secrets.compare_digest(normalized_code, normalized_stored):
                # Code is valid - remove it from the list
                updated_codes = [c for c in stored_codes if c != stored_code]
                return True, updated_codes

        return False, stored_codes

    def get_current_token(self, secret: str) -> str:
        """
        Get the current TOTP token (for testing purposes).

        Args:
            secret: TOTP secret key

        Returns:
            Current 6-digit token
        """
        totp = pyotp.TOTP(secret)
        return totp.now()


# Global MFA service instance
mfa_service = MFAService()
