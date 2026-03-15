"""
Celery tasks for database cleanup and maintenance.
"""

import logging
from datetime import datetime, timedelta
from celery import shared_task
from sqlalchemy.orm import Session

from app.config.database import SessionLocal
from app.models.user import User

logger = logging.getLogger(__name__)


@shared_task(name="cleanup_unverified_accounts")
def cleanup_unverified_accounts():
    """
    Delete user accounts that have not verified their email within 7 days.

    This task should run daily to prevent database bloat from spam registrations.

    Returns:
        dict: Summary of cleanup results
    """
    db: Session = SessionLocal()
    try:
        # Calculate cutoff date (7 days ago)
        cutoff_date = datetime.utcnow() - timedelta(days=7)

        logger.info(f"Starting cleanup of unverified accounts older than {cutoff_date}")

        # Find unverified accounts older than 7 days
        unverified_users = db.query(User).filter(
            User.email_verified == False,
            User.created_at < cutoff_date
        ).all()

        deleted_count = 0
        deleted_emails = []

        for user in unverified_users:
            deleted_emails.append(user.email)
            db.delete(user)
            deleted_count += 1

        db.commit()

        logger.info(f"✅ Cleaned up {deleted_count} unverified accounts")
        if deleted_emails:
            logger.info(f"Deleted accounts: {', '.join(deleted_emails[:10])}")

        return {
            "success": True,
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat(),
            "message": f"Successfully deleted {deleted_count} unverified accounts older than 7 days"
        }

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error during cleanup: {str(e)}")
        return {
            "success": False,
            "deleted_count": 0,
            "error": str(e),
            "message": "Failed to cleanup unverified accounts"
        }
    finally:
        db.close()


@shared_task(name="cleanup_expired_tokens")
def cleanup_expired_tokens():
    """
    Delete expired verification codes and password reset tokens.

    This helps keep the user table clean and improves query performance.

    Returns:
        dict: Summary of cleanup results
    """
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()

        logger.info("Starting cleanup of expired tokens")

        # Clear expired verification codes
        users_with_expired_codes = db.query(User).filter(
            User.verification_code.isnot(None),
            User.verification_code_expires_at < now
        ).all()

        cleared_count = 0
        for user in users_with_expired_codes:
            user.verification_code = None
            user.verification_code_expires_at = None
            cleared_count += 1

        db.commit()

        logger.info(f"✅ Cleared {cleared_count} expired verification codes")

        return {
            "success": True,
            "cleared_count": cleared_count,
            "message": f"Successfully cleared {cleared_count} expired tokens"
        }

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error during token cleanup: {str(e)}")
        return {
            "success": False,
            "cleared_count": 0,
            "error": str(e),
            "message": "Failed to cleanup expired tokens"
        }
    finally:
        db.close()


@shared_task(name="get_unverified_accounts_stats")
def get_unverified_accounts_stats():
    """
    Get statistics about unverified accounts.

    Useful for monitoring and admin dashboards.

    Returns:
        dict: Statistics about unverified accounts
    """
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        cutoff_7_days = now - timedelta(days=7)
        cutoff_24_hours = now - timedelta(hours=24)

        # Count total unverified
        total_unverified = db.query(User).filter(
            User.email_verified == False
        ).count()

        # Count unverified older than 7 days (eligible for deletion)
        old_unverified = db.query(User).filter(
            User.email_verified == False,
            User.created_at < cutoff_7_days
        ).count()

        # Count recent unverified (last 24 hours)
        recent_unverified = db.query(User).filter(
            User.email_verified == False,
            User.created_at >= cutoff_24_hours
        ).count()

        logger.info(f"Unverified accounts stats: {total_unverified} total, {old_unverified} old, {recent_unverified} recent")

        return {
            "total_unverified": total_unverified,
            "old_unverified": old_unverified,
            "recent_unverified": recent_unverified,
            "cutoff_7_days": cutoff_7_days.isoformat(),
            "cutoff_24_hours": cutoff_24_hours.isoformat()
        }

    except Exception as e:
        logger.error(f"❌ Error getting stats: {str(e)}")
        return {
            "error": str(e)
        }
    finally:
        db.close()
