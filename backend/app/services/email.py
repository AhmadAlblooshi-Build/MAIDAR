"""
Email service using SendGrid for sending authentication and notification emails.
"""

import logging
from typing import Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

from app.config.settings import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SendGrid."""

    def __init__(self):
        """Initialize email service."""
        self.api_key = getattr(settings, 'SENDGRID_API_KEY', None)
        self.from_email = getattr(settings, 'FROM_EMAIL', 'noreply@maidar.com')
        self.from_name = getattr(settings, 'FROM_NAME', 'MAIDAR')

        # Initialize SendGrid client if API key is provided
        self.client = None
        if self.api_key:
            try:
                self.client = SendGridAPIClient(self.api_key)
                logger.info(f"✅ SendGrid initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize SendGrid client: {str(e)}")
                self.client = None

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send an email via SendGrid.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email content
            text_content: Plain text email content (fallback)

        Returns:
            True if email sent successfully, False otherwise
        """
        # Development mode: Log email to console
        if not self.client:
            logger.info(f"""
            ========== EMAIL (Development Mode - SendGrid Not Configured) ==========
            From: {self.from_name} <{self.from_email}>
            To: {to_email}
            Subject: {subject}

            {text_content or html_content[:200]}...
            ===================================================================
            """)
            logger.warning("⚠️ SendGrid not configured. Set SENDGRID_API_KEY in environment.")
            return True

        try:
            # Create email message
            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )

            # Add plain text content if provided
            if text_content:
                message.add_content(Content("text/plain", text_content))

            # Send email via SendGrid
            response = self.client.send(message)

            if response.status_code in [200, 201, 202]:
                logger.info(f"✅ Email sent successfully to {to_email} (Status: {response.status_code})")
                return True
            else:
                logger.error(f"❌ SendGrid returned status {response.status_code}: {response.body}")
                return False

        except Exception as e:
            error_message = str(e)
            logger.error(f"❌ Failed to send email to {to_email}: {error_message}")

            # Provide helpful error messages
            if "authorization" in error_message.lower() or "api key" in error_message.lower():
                logger.error("   💡 Tip: Check if SENDGRID_API_KEY is correct")
            elif "not verified" in error_message.lower():
                logger.error("   💡 Tip: Verify sender email in SendGrid dashboard")

            return False

    def send_verification_email(
        self,
        to_email: str,
        verification_code: str,
        verification_link: Optional[str] = None
    ) -> bool:
        """
        Send email verification email.

        Args:
            to_email: User email address
            verification_code: 6-digit verification code
            verification_link: Optional verification link

        Returns:
            True if sent successfully
        """
        subject = "Verify Your MAIDAR Account"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }}
                .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); color: white; padding: 40px 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; font-weight: 600; }}
                .content {{ padding: 40px 30px; }}
                .code-container {{ background: #F0FDFA; border: 2px solid #14B8A6; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center; }}
                .code {{ font-size: 36px; font-weight: bold; color: #14B8A6; letter-spacing: 10px; font-family: 'Courier New', monospace; }}
                .button {{ display: inline-block; background: #14B8A6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }}
                .button:hover {{ background: #0D9488; }}
                .footer {{ background: #f9f9f9; padding: 20px 30px; text-align: center; color: #666; font-size: 13px; border-top: 1px solid #eee; }}
                .warning {{ background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Verify Your Email</h1>
                </div>
                <div class="content">
                    <p>Welcome to <strong>MAIDAR</strong> - The Human Risk Intelligence Platform!</p>

                    <p>To complete your registration, please verify your email address using the code below:</p>

                    <div class="code-container">
                        <div class="code">{verification_code}</div>
                        <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Enter this code on the verification page</p>
                    </div>

                    {f'<p style="text-align: center;"><a href="{verification_link}" class="button">Verify Email Instantly</a></p>' if verification_link else ''}

                    <div class="warning">
                        <strong>⏰ Code expires in 24 hours</strong><br>
                        If you didn't create a MAIDAR account, you can safely ignore this email.
                    </div>

                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                        Need help? Reply to this email or contact our support team.
                    </p>
                </div>
                <div class="footer">
                    <p style="margin: 0 0 5px 0; font-weight: 600;">MAIDAR - Human Risk Intelligence</p>
                    <p style="margin: 0;">© 2024 MAIDAR. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Verify Your MAIDAR Account

        Welcome to MAIDAR - The Human Risk Intelligence Platform!

        Please verify your email address using this code:

        {verification_code}

        This code will expire in 24 hours.

        {f'Or click this link: {verification_link}' if verification_link else ''}

        If you didn't create a MAIDAR account, you can safely ignore this email.

        Need help? Reply to this email or contact our support team.

        © 2024 MAIDAR. All rights reserved.
        """

        return self.send_email(to_email, subject, html_content, text_content)

    def send_password_reset_email(
        self,
        to_email: str,
        reset_link: str
    ) -> bool:
        """
        Send password reset email.

        Args:
            to_email: User email address
            reset_link: Password reset link with token

        Returns:
            True if sent successfully
        """
        subject = "Reset Your MAIDAR Password"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }}
                .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); color: white; padding: 40px 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; font-weight: 600; }}
                .content {{ padding: 40px 30px; }}
                .button {{ display: inline-block; background: #14B8A6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }}
                .warning {{ background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }}
                .footer {{ background: #f9f9f9; padding: 20px 30px; text-align: center; color: #666; font-size: 13px; border-top: 1px solid #eee; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔑 Reset Your Password</h1>
                </div>
                <div class="content">
                    <p>We received a request to reset your MAIDAR password.</p>

                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </p>

                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong><br>
                        This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.
                    </div>

                    <p style="color: #666; font-size: 14px;">
                        For your security, never share your password with anyone.
                    </p>
                </div>
                <div class="footer">
                    <p style="margin: 0 0 5px 0; font-weight: 600;">MAIDAR - Human Risk Intelligence</p>
                    <p style="margin: 0;">© 2024 MAIDAR. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Reset Your MAIDAR Password

        We received a request to reset your MAIDAR password.

        Click this link to reset your password: {reset_link}

        ⚠️ Security Notice:
        This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.

        For your security, never share your password with anyone.

        © 2024 MAIDAR. All rights reserved.
        """

        return self.send_email(to_email, subject, html_content, text_content)

    def send_welcome_email(
        self,
        to_email: str,
        full_name: str
    ) -> bool:
        """
        Send welcome email after successful verification.

        Args:
            to_email: User email address
            full_name: User's full name

        Returns:
            True if sent successfully
        """
        subject = "Welcome to MAIDAR!"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }}
                .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); color: white; padding: 40px 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; font-weight: 600; }}
                .content {{ padding: 40px 30px; }}
                .feature {{ background: #F0FDFA; padding: 20px; margin: 15px 0; border-left: 4px solid #14B8A6; border-radius: 6px; }}
                .feature-title {{ font-weight: 600; color: #0D9488; margin: 0 0 8px 0; font-size: 16px; }}
                .footer {{ background: #f9f9f9; padding: 20px 30px; text-align: center; color: #666; font-size: 13px; border-top: 1px solid #eee; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome to MAIDAR!</h1>
                </div>
                <div class="content">
                    <p>Hi <strong>{full_name}</strong>,</p>

                    <p>Your account has been successfully verified! You're now ready to start measuring and reducing human cyber risk in your organization.</p>

                    <h3 style="color: #0D9488; margin-top: 30px;">What's next?</h3>

                    <div class="feature">
                        <p class="feature-title">📊 Import Your Team</p>
                        <p style="margin: 0; color: #666;">Upload employee data to begin comprehensive risk assessment</p>
                    </div>

                    <div class="feature">
                        <p class="feature-title">🎯 Launch Simulations</p>
                        <p style="margin: 0; color: #666;">Run AI-powered phishing campaigns to test awareness</p>
                    </div>

                    <div class="feature">
                        <p class="feature-title">📈 View Analytics</p>
                        <p style="margin: 0; color: #666;">Track risk scores and identify vulnerabilities</p>
                    </div>

                    <p style="margin-top: 30px; color: #666;">
                        If you have any questions, our team is here to help!
                    </p>
                </div>
                <div class="footer">
                    <p style="margin: 0 0 5px 0; font-weight: 600;">MAIDAR - Human Risk Intelligence</p>
                    <p style="margin: 0;">© 2024 MAIDAR. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Welcome to MAIDAR!

        Hi {full_name},

        Your account has been successfully verified! You're now ready to start measuring and reducing human cyber risk in your organization.

        What's next?

        📊 Import Your Team - Upload employee data to begin risk assessment
        🎯 Launch Simulations - Run AI-powered phishing campaigns
        📈 View Analytics - Track risk scores and identify vulnerabilities

        If you have any questions, our team is here to help!

        © 2024 MAIDAR. All rights reserved.
        """

        return self.send_email(to_email, subject, html_content, text_content)


# Global email service instance
email_service = EmailService()
