"""
Email service for MAIDAR - SMTP integration with tracking.
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


class EmailService:
    """Email service with SMTP and tracking capabilities."""

    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "localhost")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
        self.from_email = os.getenv("FROM_EMAIL", "noreply@maidar.ai")
        self.from_name = os.getenv("FROM_NAME", "MAIDAR")

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[Dict]] = None,
        tracking_id: Optional[str] = None,
    ) -> bool:
        """
        Send an email via SMTP.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email body
            text_content: Plain text email body (optional)
            attachments: List of attachments with 'filename' and 'content' keys
            tracking_id: Optional tracking ID for analytics

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject

            # Add tracking pixel if tracking_id provided
            if tracking_id:
                tracking_url = os.getenv("APP_URL", "http://localhost:8000")
                tracking_pixel = f'<img src="{tracking_url}/api/v1/email/track/open/{tracking_id}" width="1" height="1" />'
                html_content += tracking_pixel

            # Add text part
            if text_content:
                part_text = MIMEText(text_content, 'plain', 'utf-8')
                msg.attach(part_text)

            # Add HTML part
            part_html = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(part_html)

            # Add attachments
            if attachments:
                for attachment in attachments:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment['content'])
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename={attachment["filename"]}'
                    )
                    msg.attach(part)

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_use_tls:
                    server.starttls()
                if self.smtp_user and self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    def send_welcome_email(self, to_email: str, full_name: str, verification_code: str) -> bool:
        """Send welcome email with verification code."""
        subject = "Welcome to MAIDAR - Verify Your Email"
        html_content = self._render_template("welcome", {
            "full_name": full_name,
            "verification_code": verification_code,
            "app_url": os.getenv("APP_URL", "http://localhost:3000"),
        })
        text_content = f"""
Welcome to MAIDAR, {full_name}!

Your verification code is: {verification_code}

Please enter this code to verify your email address.

Best regards,
The MAIDAR Team
"""
        return self.send_email(to_email, subject, html_content, text_content)

    def send_password_reset_email(self, to_email: str, reset_token: str) -> bool:
        """Send password reset email."""
        subject = "MAIDAR - Password Reset Request"
        reset_url = f"{os.getenv('APP_URL', 'http://localhost:3000')}/reset-password?token={reset_token}"
        html_content = self._render_template("password_reset", {
            "reset_url": reset_url,
        })
        text_content = f"""
You requested a password reset for your MAIDAR account.

Click the link below to reset your password:
{reset_url}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
The MAIDAR Team
"""
        return self.send_email(to_email, subject, html_content, text_content)

    def send_simulation_launch_notification(
        self,
        to_email: str,
        full_name: str,
        simulation_name: str,
        target_count: int
    ) -> bool:
        """Send notification when simulation is launched."""
        subject = f"Simulation Launched: {simulation_name}"
        html_content = self._render_template("simulation_launch", {
            "full_name": full_name,
            "simulation_name": simulation_name,
            "target_count": target_count,
            "app_url": os.getenv("APP_URL", "http://localhost:3000"),
        })
        text_content = f"""
Hi {full_name},

Your simulation "{simulation_name}" has been successfully launched to {target_count} employees.

You can track results in real-time in your MAIDAR dashboard.

Best regards,
The MAIDAR Team
"""
        return self.send_email(to_email, subject, html_content, text_content)

    def send_phishing_simulation_email(
        self,
        to_email: str,
        scenario_subject: str,
        scenario_html: str,
        scenario_text: str,
        sender_name: str,
        sender_email: str,
        tracking_id: str
    ) -> bool:
        """
        Send phishing simulation email to employee.

        This is the actual phishing test email that employees receive.
        """
        # Add tracking links
        tracking_url = os.getenv("APP_URL", "http://localhost:8000")
        click_tracking_url = f"{tracking_url}/api/v1/email/track/click/{tracking_id}"

        # Replace [PHISHING LINK] placeholder with actual tracking link
        scenario_html = scenario_html.replace("[Phishing Link]", click_tracking_url)
        scenario_html = scenario_html.replace("[PHISHING_LINK]", click_tracking_url)
        scenario_text = scenario_text.replace("[Phishing Link]", click_tracking_url)
        scenario_text = scenario_text.replace("[PHISHING_LINK]", click_tracking_url)

        # Create custom message with spoofed sender
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{sender_name} <{sender_email}>"
        msg['To'] = to_email
        msg['Subject'] = scenario_subject

        # Add tracking pixel
        tracking_pixel = f'<img src="{tracking_url}/api/v1/email/track/open/{tracking_id}" width="1" height="1" />'
        scenario_html += tracking_pixel

        # Add content
        part_text = MIMEText(scenario_text, 'plain', 'utf-8')
        part_html = MIMEText(scenario_html, 'html', 'utf-8')
        msg.attach(part_text)
        msg.attach(part_html)

        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_use_tls:
                    server.starttls()
                if self.smtp_user and self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            logger.info(f"Phishing simulation email sent to {to_email} (tracking_id: {tracking_id})")
            return True

        except Exception as e:
            logger.error(f"Failed to send phishing simulation email to {to_email}: {e}")
            return False

    def _render_template(self, template_name: str, context: Dict) -> str:
        """
        Render email template with context.

        Args:
            template_name: Name of template (without .html extension)
            context: Dictionary of variables to substitute

        Returns:
            Rendered HTML string
        """
        # Simple template rendering (replace with Jinja2 for production)
        templates = {
            "welcome": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }}
        .code {{ font-size: 32px; font-weight: bold; color: #14b8a6; letter-spacing: 8px; text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px; margin: 20px 0; }}
        .button {{ display: inline-block; background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to MAIDAR</h1>
        </div>
        <div class="content">
            <p>Hi {full_name},</p>
            <p>Thank you for joining MAIDAR! To get started, please verify your email address using the code below:</p>
            <div class="code">{verification_code}</div>
            <p>Or click the button below to verify automatically:</p>
            <a href="{app_url}/verify-email?code={verification_code}" class="button">Verify Email</a>
            <p>If you didn't create this account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 MAIDAR. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
""",
            "password_reset": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }}
        .button {{ display: inline-block; background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset</h1>
        </div>
        <div class="content">
            <p>You requested a password reset for your MAIDAR account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="{reset_url}" class="button">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 MAIDAR. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
""",
            "simulation_launch": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }}
        .stats {{ background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .button {{ display: inline-block; background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Simulation Launched</h1>
        </div>
        <div class="content">
            <p>Hi {full_name},</p>
            <p>Your simulation "<strong>{simulation_name}</strong>" has been successfully launched!</p>
            <div class="stats">
                <p><strong>Target Employees:</strong> {target_count}</p>
                <p><strong>Status:</strong> Active</p>
            </div>
            <p>You can track results in real-time in your MAIDAR dashboard.</p>
            <a href="{app_url}/tenant-admin/simulations" class="button">View Dashboard</a>
        </div>
        <div class="footer">
            <p>&copy; 2026 MAIDAR. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
""",
        }

        template = templates.get(template_name, "")
        # Simple variable substitution
        for key, value in context.items():
            template = template.replace(f"{{{key}}}", str(value))

        return template


# Singleton instance
email_service = EmailService()
