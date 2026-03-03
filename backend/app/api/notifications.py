"""
Notifications API - In-app notifications
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.config.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.core.dependencies import get_current_user
from app.core.notifications import notification_service
from app.core.audit_logger import audit_logger

router = APIRouter(tags=["Notifications"])


# Pydantic schemas
class NotificationResponse(BaseModel):
    id: str
    type: str
    priority: str
    title: str
    message: str
    metadata: dict = None
    action_url: str = None
    action_label: str = None
    is_read: bool
    read_at: str = None
    created_at: str

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


@router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    page: int = 1,
    page_size: int = 20,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for current user."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    total = query.count()
    unread_count = notification_service.get_unread_count(db, current_user.id)

    # Apply pagination
    offset = (page - 1) * page_size
    notifications = query.order_by(desc(Notification.created_at)).offset(offset).limit(page_size).all()

    return NotificationListResponse(
        notifications=[
            NotificationResponse(
                id=str(n.id),
                type=n.type,
                priority=n.priority,
                title=n.title,
                message=n.message,
                metadata=n.metadata,
                action_url=n.action_url,
                action_label=n.action_label,
                is_read=n.is_read,
                read_at=n.read_at.isoformat() if n.read_at else None,
                created_at=n.created_at.isoformat()
            )
            for n in notifications
        ],
        total=total,
        unread_count=unread_count
    )


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications."""
    count = notification_service.get_unread_count(db, current_user.id)
    return {"unread_count": count}


@router.put("/{notification_id}/read", response_model=dict)
async def mark_notification_as_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    success = notification_service.mark_as_read(db, notification_id)

    # Create audit log
    if success:
        audit_logger.log_event(
            db=db,
            action="NOTIFICATION_MARKED_READ",
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            resource_type="notification",
            resource_id=notification.id,
            details={
                "notification_type": notification.type,
                "notification_title": notification.title
            },
            status="success"
        )

    return {"success": success}


@router.put("/mark-all-read", response_model=dict)
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for current user."""
    count = notification_service.mark_all_as_read(db, current_user.id)

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="NOTIFICATIONS_MARKED_ALL_READ",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="notification",
        resource_id=None,
        details={
            "marked_count": count
        },
        status="success"
    )

    return {"marked_read": count}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notification_type = notification.type
    notification_title = notification.title
    notification_uuid = notification.id

    db.delete(notification)
    db.commit()

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="NOTIFICATION_DELETED",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="notification",
        resource_id=notification_uuid,
        details={
            "notification_type": notification_type,
            "notification_title": notification_title
        },
        status="success"
    )

    return None
