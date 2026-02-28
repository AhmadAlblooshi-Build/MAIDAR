"""
Session Management API endpoints.

Allows users to view and manage their active sessions across devices.
"""

import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session as DBSession

from app.config.database import get_db
from app.core.dependencies import get_current_user
from app.core.session_manager import session_manager
from app.core.audit_logger import audit_logger
from app.models.user import User
from app.models.session import Session
from app.schemas.session import (
    SessionListResponse,
    SessionResponse,
    TerminateSessionRequest,
    TerminateSessionResponse,
    TerminateAllSessionsResponse
)

router = APIRouter(tags=["Session Management"])
logger = logging.getLogger(__name__)


def get_current_session_id(request: Request) -> Optional[str]:
    """
    Extract current session ID from request headers.

    The frontend should send X-Session-ID header with each request.
    """
    return request.headers.get("X-Session-ID")


@router.get("/", response_model=SessionListResponse)
def list_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """
    List all active sessions for the current user.

    Shows all devices where the user is logged in.
    """
    # Get all active sessions
    sessions = session_manager.get_user_sessions(
        db=db,
        user_id=current_user.id,
        active_only=True
    )

    # Get current session ID from header
    current_session_id = get_current_session_id(request)

    # Convert to response schema
    session_responses = []
    for session in sessions:
        session_response = SessionResponse(
            id=str(session.id),
            device_name=session.device_name,
            ip_address=session.ip_address,
            user_agent=session.user_agent,
            last_activity=session.last_activity,
            expires_at=session.expires_at,
            is_active=session.is_active,
            created_at=session.created_at,
            is_current=(str(session.id) == current_session_id)
        )
        session_responses.append(session_response)

    return SessionListResponse(
        total=len(sessions),
        active_sessions=len([s for s in sessions if s.is_valid]),
        sessions=session_responses
    )


@router.post("/terminate", response_model=TerminateSessionResponse)
def terminate_session(
    request_data: TerminateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """
    Terminate a specific session.

    The user can log out a specific device.
    """
    try:
        session_uuid = UUID(request_data.session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID format"
        )

    # Verify session belongs to current user and terminate
    success = session_manager.terminate_session(
        db=db,
        session_id=session_uuid,
        user_id=current_user.id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or does not belong to you"
        )

    # Log audit event
    audit_logger.log_event(
        db=db,
        action="session_terminated",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="session",
        resource_id=session_uuid,
        details={"terminated_session_id": str(session_uuid)}
    )

    logger.info(f"User {current_user.email} terminated session {session_uuid}")

    return TerminateSessionResponse(
        success=True,
        message="Session terminated successfully",
        session_id=str(session_uuid)
    )


@router.post("/terminate-all", response_model=TerminateAllSessionsResponse)
def terminate_all_sessions(
    request: Request,
    keep_current: bool = True,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """
    Terminate all sessions for the current user.

    Useful when account is compromised or user wants to log out everywhere.

    Args:
        keep_current: If True, keeps the current session active (default)
    """
    # Get current session ID
    current_session_id = None
    if keep_current:
        current_session_id_str = get_current_session_id(request)
        if current_session_id_str:
            try:
                current_session_id = UUID(current_session_id_str)
            except ValueError:
                pass

    # Terminate all sessions (except current if specified)
    count = session_manager.terminate_all_sessions(
        db=db,
        user_id=current_user.id,
        except_session_id=current_session_id
    )

    # Log audit event
    audit_logger.log_event(
        db=db,
        action="all_sessions_terminated",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        details={
            "sessions_terminated": count,
            "kept_current_session": keep_current
        }
    )

    logger.warning(
        f"User {current_user.email} terminated all sessions "
        f"({count} sessions, keep_current={keep_current})"
    )

    return TerminateAllSessionsResponse(
        success=True,
        message=f"Successfully terminated {count} session(s)",
        terminated_count=count
    )


@router.get("/current")
def get_current_session(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """
    Get details about the current session.
    """
    current_session_id_str = get_current_session_id(request)

    if not current_session_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No session ID provided in X-Session-ID header"
        )

    try:
        session_uuid = UUID(current_session_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID format"
        )

    # Get session
    session = db.query(Session).filter(
        Session.id == session_uuid,
        Session.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    return SessionResponse(
        id=str(session.id),
        device_name=session.device_name,
        ip_address=session.ip_address,
        user_agent=session.user_agent,
        last_activity=session.last_activity,
        expires_at=session.expires_at,
        is_active=session.is_active,
        created_at=session.created_at,
        is_current=True
    )
