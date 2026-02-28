"""
Notification service for MAIDAR.

Handles in-app notifications and email notifications.
"""

import logging
from typing import List, Optional, Dict
from uuid import UUID
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType, NotificationPriority
from app.models.user import User
from app.core.email import email_service

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications."""

    @staticmethod
    def create_notification(
        db: Session,
        tenant_id: UUID,
        user_id: UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        metadata: Optional[Dict] = None,
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
        send_email: bool = False
    ) -> Notification:
        """
        Create a new notification.

        Args:
            db: Database session
            tenant_id: Tenant ID
            user_id: User ID to notify
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            priority: Priority level
            metadata: Optional metadata dict
            action_url: Optional action URL
            action_label: Optional action button label
            send_email: Whether to also send email

        Returns:
            Created Notification object
        """
        # Create notification
        notification = Notification(
            tenant_id=tenant_id,
            user_id=user_id,
            type=notification_type.value,
            priority=priority.value,
            title=title,
            message=message,
            metadata=metadata,
            action_url=action_url,
            action_label=action_label,
            is_read=False
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        # Send email if requested
        if send_email:
            NotificationService.send_email_notification(db, notification)

        logger.info(f"Notification created: {notification_type.value} for user {user_id}")

        return notification

    @staticmethod
    def send_email_notification(db: Session, notification: Notification):
        """Send email for a notification."""
        try:
            # Get user
            user = db.query(User).filter(User.id == notification.user_id).first()
            if not user:
                logger.warning(f"User not found for notification {notification.id}")
                return

            # Send email
            email_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }}
        .priority-{notification.priority.lower()} {{ border-left: 4px solid; padding-left: 15px; margin: 20px 0; }}
        .priority-low {{ border-color: #6b7280; }}
        .priority-medium {{ border-color: #3b82f6; }}
        .priority-high {{ border-color: #f59e0b; }}
        .priority-urgent {{ border-color: #ef4444; }}
        .button {{ display: inline-block; background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MAIDAR Notification</h1>
        </div>
        <div class="content">
            <h2>{notification.title}</h2>
            <div class="priority-{notification.priority.lower()}">
                <p>{notification.message}</p>
            </div>
            {f'<a href="{notification.action_url}" class="button">{notification.action_label}</a>' if notification.action_url else ''}
        </div>
        <div class="footer">
            <p>&copy; 2026 MAIDAR. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

            email_text = f"""
{notification.title}

{notification.message}

{f'{notification.action_label}: {notification.action_url}' if notification.action_url else ''}

---
MAIDAR - Human Risk Intelligence Platform
"""

            success = email_service.send_email(
                to_email=user.email,
                subject=f"MAIDAR: {notification.title}",
                html_content=email_html,
                text_content=email_text
            )

            if success:
                notification.email_sent = True
                notification.email_sent_at = datetime.utcnow()
                db.commit()
                logger.info(f"Email notification sent to {user.email}")

        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")

    @staticmethod
    def notify_simulation_launched(
        db: Session,
        simulation_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        simulation_name: str,
        target_count: int
    ):
        """Notify user when simulation is launched."""
        return NotificationService.create_notification(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            notification_type=NotificationType.SIMULATION_LAUNCHED,
            title=f"Simulation Launched: {simulation_name}",
            message=f"Your simulation has been launched to {target_count} employees. You can track results in real-time.",
            priority=NotificationPriority.MEDIUM,
            metadata={"simulation_id": str(simulation_id)},
            action_url=f"/tenant-admin/simulations/{simulation_id}",
            action_label="View Results",
            send_email=True
        )

    @staticmethod
    def notify_high_risk_detected(
        db: Session,
        tenant_id: UUID,
        user_id: UUID,
        employee_id: UUID,
        employee_name: str,
        risk_score: int
    ):
        """Notify admin when high-risk employee is detected."""
        return NotificationService.create_notification(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            notification_type=NotificationType.HIGH_RISK_DETECTED,
            title="High Risk Employee Detected",
            message=f"{employee_name} has been identified as high risk (score: {risk_score}). Immediate attention recommended.",
            priority=NotificationPriority.HIGH,
            metadata={"employee_id": str(employee_id), "risk_score": risk_score},
            action_url=f"/tenant-admin/employees/{employee_id}",
            action_label="View Employee",
            send_email=True
        )

    @staticmethod
    def notify_employee_clicked(
        db: Session,
        tenant_id: UUID,
        user_id: UUID,
        employee_id: UUID,
        employee_name: str,
        simulation_id: UUID
    ):
        """Notify admin when employee clicks phishing link."""
        return NotificationService.create_notification(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            notification_type=NotificationType.EMPLOYEE_CLICKED,
            title=f"Employee Clicked Phishing Link",
            message=f"{employee_name} clicked a phishing link in the current simulation.",
            priority=NotificationPriority.MEDIUM,
            metadata={"employee_id": str(employee_id), "simulation_id": str(simulation_id)},
            action_url=f"/tenant-admin/simulations/{simulation_id}",
            action_label="View Simulation",
            send_email=False  # Don't spam email for every click
        )

    @staticmethod
    def mark_as_read(db: Session, notification_id: UUID) -> bool:
        """Mark notification as read."""
        notification = db.query(Notification).filter(Notification.id == notification_id).first()
        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.commit()
            return True
        return False

    @staticmethod
    def mark_all_as_read(db: Session, user_id: UUID) -> int:
        """Mark all notifications for a user as read."""
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({
            "is_read": True,
            "read_at": datetime.utcnow()
        })
        db.commit()
        return count

    @staticmethod
    def get_unread_count(db: Session, user_id: UUID) -> int:
        """Get count of unread notifications for a user."""
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()


# Singleton instance
notification_service = NotificationService()
