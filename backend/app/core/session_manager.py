"""
Session management service.

Handles session creation, validation, and cleanup.
"""

import secrets
import logging
from typing import Optional, List, Tuple
from datetime import datetime, timedelta
from uuid import UUID
from sqlalchemy.orm import Session as DBSession

from app.models.session import Session
from app.models.user import User

logger = logging.getLogger(__name__)


class SessionManager:
    """Service for managing user sessions."""

    def __init__(
        self,
        session_timeout_minutes: int = 30,
        max_concurrent_sessions: int = 3
    ):
        """
        Initialize session manager.

        Args:
            session_timeout_minutes: Minutes of inactivity before session expires
            max_concurrent_sessions: Maximum number of concurrent sessions per user
        """
        self.session_timeout_minutes = session_timeout_minutes
        self.max_concurrent_sessions = max_concurrent_sessions

    def generate_session_token(self) -> str:
        """
        Generate a cryptographically secure session token.

        Returns:
            Random session token (64 characters)
        """
        return secrets.token_urlsafe(48)  # 64 character token

    def parse_user_agent(self, user_agent: str) -> str:
        """
        Parse user agent string to friendly device name.

        Args:
            user_agent: Raw user agent string

        Returns:
            Friendly device name (e.g., "Chrome on Windows")
        """
        if not user_agent:
            return "Unknown Device"

        ua_lower = user_agent.lower()

        # Detect browser
        browser = "Unknown Browser"
        if "chrome" in ua_lower and "edg" not in ua_lower:
            browser = "Chrome"
        elif "safari" in ua_lower and "chrome" not in ua_lower:
            browser = "Safari"
        elif "firefox" in ua_lower:
            browser = "Firefox"
        elif "edg" in ua_lower:
            browser = "Edge"

        # Detect OS
        os_name = "Unknown OS"
        if "windows" in ua_lower:
            os_name = "Windows"
        elif "mac" in ua_lower and "iphone" not in ua_lower and "ipad" not in ua_lower:
            os_name = "macOS"
        elif "linux" in ua_lower:
            os_name = "Linux"
        elif "iphone" in ua_lower or "ipad" in ua_lower:
            os_name = "iOS"
        elif "android" in ua_lower:
            os_name = "Android"

        return f"{browser} on {os_name}"

    def create_session(
        self,
        db: DBSession,
        user: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[Session, str]:
        """
        Create a new session for a user.

        Enforces max concurrent session limit by terminating oldest sessions.

        Args:
            db: Database session
            user: User to create session for
            ip_address: Client IP address
            user_agent: Client user agent string

        Returns:
            Tuple of (Session object, session_token)
        """
        # Check active sessions
        active_sessions = db.query(Session).filter(
            Session.user_id == user.id,
            Session.is_active == True,
            Session.expires_at > datetime.utcnow()
        ).order_by(Session.created_at.asc()).all()

        # Enforce max concurrent sessions
        if len(active_sessions) >= self.max_concurrent_sessions:
            # Terminate oldest session(s)
            sessions_to_terminate = active_sessions[:len(active_sessions) - self.max_concurrent_sessions + 1]
            for old_session in sessions_to_terminate:
                old_session.terminate()
                logger.info(f"Terminated old session {old_session.id} for user {user.id} (max concurrent limit)")

        # Generate session token
        session_token = self.generate_session_token()

        # Parse device name from user agent
        device_name = self.parse_user_agent(user_agent) if user_agent else None

        # Create new session
        new_session = Session(
            user_id=user.id,
            session_token=session_token,
            device_name=device_name,
            ip_address=ip_address,
            user_agent=user_agent,
            last_activity=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(minutes=self.session_timeout_minutes),
            is_active=True
        )

        db.add(new_session)
        db.commit()
        db.refresh(new_session)

        logger.info(f"Created session {new_session.id} for user {user.id} from {ip_address}")

        return new_session, session_token

    def get_session_by_token(
        self,
        db: DBSession,
        session_token: str
    ) -> Optional[Session]:
        """
        Get session by token.

        Args:
            db: Database session
            session_token: Session token to look up

        Returns:
            Session object if found and valid, None otherwise
        """
        session = db.query(Session).filter(
            Session.session_token == session_token
        ).first()

        if not session:
            return None

        # Check if expired
        if session.is_expired:
            session.terminate()
            db.commit()
            return None

        # Update activity
        session.update_activity(self.session_timeout_minutes)
        db.commit()

        return session

    def get_user_sessions(
        self,
        db: DBSession,
        user_id: UUID,
        active_only: bool = True
    ) -> List[Session]:
        """
        Get all sessions for a user.

        Args:
            db: Database session
            user_id: User UUID
            active_only: Only return active sessions

        Returns:
            List of Session objects
        """
        query = db.query(Session).filter(Session.user_id == user_id)

        if active_only:
            query = query.filter(
                Session.is_active == True,
                Session.expires_at > datetime.utcnow()
            )

        return query.order_by(Session.created_at.desc()).all()

    def terminate_session(
        self,
        db: DBSession,
        session_id: UUID,
        user_id: Optional[UUID] = None
    ) -> bool:
        """
        Terminate a specific session.

        Args:
            db: Database session
            session_id: Session UUID to terminate
            user_id: Optional user ID for authorization check

        Returns:
            True if terminated, False if not found
        """
        query = db.query(Session).filter(Session.id == session_id)

        # Optional: verify session belongs to user
        if user_id:
            query = query.filter(Session.user_id == user_id)

        session = query.first()

        if not session:
            return False

        session.terminate()
        db.commit()

        logger.info(f"Terminated session {session_id} for user {session.user_id}")
        return True

    def terminate_all_sessions(
        self,
        db: DBSession,
        user_id: UUID,
        except_session_id: Optional[UUID] = None
    ) -> int:
        """
        Terminate all sessions for a user.

        Args:
            db: Database session
            user_id: User UUID
            except_session_id: Optional session ID to keep active (current session)

        Returns:
            Number of sessions terminated
        """
        query = db.query(Session).filter(
            Session.user_id == user_id,
            Session.is_active == True
        )

        # Keep current session active if specified
        if except_session_id:
            query = query.filter(Session.id != except_session_id)

        sessions = query.all()
        count = len(sessions)

        for session in sessions:
            session.terminate()

        db.commit()

        logger.info(f"Terminated {count} sessions for user {user_id}")
        return count

    def cleanup_expired_sessions(self, db: DBSession) -> int:
        """
        Clean up expired sessions (called periodically by Celery).

        Args:
            db: Database session

        Returns:
            Number of sessions cleaned up
        """
        expired_sessions = db.query(Session).filter(
            Session.is_active == True,
            Session.expires_at <= datetime.utcnow()
        ).all()

        count = len(expired_sessions)

        for session in expired_sessions:
            session.terminate()

        db.commit()

        if count > 0:
            logger.info(f"Cleaned up {count} expired sessions")

        return count


# Global session manager instance
session_manager = SessionManager(
    session_timeout_minutes=30,
    max_concurrent_sessions=3
)
