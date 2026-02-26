"""
Email service for sending authentication and notification emails.
"""

import logging
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib

from app.config.settings import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails."""

    def __init__(self):
        """Initialize email service."""
        self.smtp_server = getattr(settings, 'SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_username = getattr(settings, 'SMTP_USERNAME', None)
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
        self.from_email = getattr(settings, 'FROM_EMAIL', 'noreply@maidar.com')
        self.from_name = getattr(settings, 'FROM_NAME', 'MAIDAR')

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send an email.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email content
            text_content: Plain text email content (fallback)

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # If SMTP not configured, log the email (for development)
            if not self.smtp_username or not self.smtp_password:
                logger.info(f"""
                ========== EMAIL (Development Mode) ==========
                To: {to_email}
                Subject: {subject}

                {text_content or html_content}
                =============================================
                """)
                return True

            # Create message
            message = MIMEMultipart('alternative')
            message['From'] = f"{self.from_name} <{self.from_email}>"
            message['To'] = to_email
            message['Subject'] = subject

            # Add plain text part
            if text_content:
                text_part = MIMEText(text_content, 'plain')
                message.attach(text_part)

            # Add HTML part
            html_part = MIMEText(html_content, 'html')
            message.attach(html_part)

            # Send email via SMTP
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
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
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .code {{ font-size: 32px; font-weight: bold; color: #14B8A6; text-align: center; letter-spacing: 8px; margin: 20px 0; }}
                .button {{ display: inline-block; background: #14B8A6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Verify Your Email</h1>
                </div>
                <div class="content">
                    <p>Welcome to <strong>MAIDAR</strong> - Human Risk Intelligence Platform!</p>

                    <p>Please verify your email address using the code below:</p>

                    <div class="code">{verification_code}</div>

                    <p>This code will expire in 24 hours.</p>

                    {f'<p style="text-align: center;"><a href="{verification_link}" class="button">Verify Email</a></p>' if verification_link else ''}

                    <p>If you didn't create a MAIDAR account, you can safely ignore this email.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 MAIDAR. All rights reserved.</p>
                    <p>Human Risk Intelligence Platform</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Verify Your MAIDAR Account

        Welcome to MAIDAR - Human Risk Intelligence Platform!

        Please verify your email address using this code: {verification_code}

        This code will expire in 24 hours.

        {f'Or click this link: {verification_link}' if verification_link else ''}

        If you didn't create a MAIDAR account, you can safely ignore this email.

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
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #14B8A6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .warning {{ background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
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

                    <p>For your security, never share your password with anyone.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 MAIDAR. All rights reserved.</p>
                    <p>Human Risk Intelligence Platform</p>
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
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .feature {{ background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #14B8A6; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome to MAIDAR!</h1>
                </div>
                <div class="content">
                    <p>Hi {full_name},</p>

                    <p>Your account has been successfully verified! You're now ready to start measuring and reducing human cyber risk in your organization.</p>

                    <h3>What's next?</h3>

                    <div class="feature">
                        <strong>📊 Import Your Team</strong><br>
                        Upload employee data to begin risk assessment
                    </div>

                    <div class="feature">
                        <strong>🎯 Run Simulations</strong><br>
                        Launch AI-powered phishing simulations
                    </div>

                    <div class="feature">
                        <strong>📈 View Analytics</strong><br>
                        Track risk scores and identify vulnerabilities
                    </div>

                    <p>If you have any questions, our team is here to help!</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 MAIDAR. All rights reserved.</p>
                    <p>Human Risk Intelligence Platform</p>
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
        🎯 Run Simulations - Launch AI-powered phishing simulations
        📈 View Analytics - Track risk scores and identify vulnerabilities

        If you have any questions, our team is here to help!

        © 2024 MAIDAR. All rights reserved.
        """

        return self.send_email(to_email, subject, html_content, text_content)


# Global email service instance
email_service = EmailService()
