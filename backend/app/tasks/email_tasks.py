"""
Email-related background tasks.

These tasks handle sending emails asynchronously to avoid blocking API requests.
"""

import logging
from typing import Optional
from uuid import UUID

from app.core.celery_app import celery_app
from app.core.email import email_service
from app.config.database import SessionLocal
from app.models.employee import Employee
from app.models.scenario import Scenario
from app.models.simulation import Simulation, SimulationResult

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.email_tasks.send_welcome_email", max_retries=3)
def send_welcome_email(
    to_email: str,
    full_name: str,
    verification_code: str
) -> bool:
    """
    Send welcome email with verification code.

    Args:
        to_email: Recipient email address
        full_name: User's full name
        verification_code: 6-digit verification code

    Returns:
        True if sent successfully
    """
    try:
        success = email_service.send_welcome_email(to_email, full_name, verification_code)
        if success:
            logger.info(f"Welcome email sent to {to_email}")
        else:
            logger.error(f"Failed to send welcome email to {to_email}")
        return success
    except Exception as e:
        logger.error(f"Error sending welcome email: {e}")
        # Retry with exponential backoff
        raise send_welcome_email.retry(exc=e, countdown=60 * (2 ** send_welcome_email.request.retries))


@celery_app.task(name="app.tasks.email_tasks.send_password_reset_email", max_retries=3)
def send_password_reset_email(
    to_email: str,
    reset_token: str
) -> bool:
    """
    Send password reset email.

    Args:
        to_email: Recipient email address
        reset_token: Password reset token

    Returns:
        True if sent successfully
    """
    try:
        success = email_service.send_password_reset_email(to_email, reset_token)
        if success:
            logger.info(f"Password reset email sent to {to_email}")
        else:
            logger.error(f"Failed to send password reset email to {to_email}")
        return success
    except Exception as e:
        logger.error(f"Error sending password reset email: {e}")
        raise send_password_reset_email.retry(exc=e, countdown=60 * (2 ** send_password_reset_email.request.retries))


@celery_app.task(name="app.tasks.email_tasks.send_phishing_simulation_email", max_retries=2)
def send_phishing_simulation_email(
    simulation_id: str,
    employee_id: str,
    to_email: str
) -> bool:
    """
    Send phishing simulation email to an employee.

    Args:
        simulation_id: Simulation UUID
        employee_id: Employee UUID
        to_email: Employee email address

    Returns:
        True if sent successfully
    """
    db = SessionLocal()
    try:
        # Get simulation and scenario details
        sim_uuid = UUID(simulation_id)
        emp_uuid = UUID(employee_id)

        simulation = db.query(Simulation).filter(Simulation.id == sim_uuid).first()
        if not simulation:
            logger.error(f"Simulation {simulation_id} not found")
            return False

        scenario = db.query(Scenario).filter(Scenario.id == simulation.scenario_id).first()
        if not scenario:
            logger.error(f"Scenario {simulation.scenario_id} not found")
            return False

        employee = db.query(Employee).filter(Employee.id == emp_uuid).first()
        if not employee:
            logger.error(f"Employee {employee_id} not found")
            return False

        # Generate tracking ID (combination of simulation_id and employee_id)
        tracking_id = f"{simulation_id}_{employee_id}"

        # Send phishing email
        success = email_service.send_phishing_simulation_email(
            to_email=to_email,
            scenario_subject=scenario.email_subject,
            scenario_html=scenario.email_html_body,
            scenario_text=scenario.email_text_body,
            sender_name=scenario.sender_name,
            sender_email=scenario.sender_email,
            tracking_id=tracking_id
        )

        if success:
            # Update simulation result
            result = db.query(SimulationResult).filter(
                SimulationResult.simulation_id == sim_uuid,
                SimulationResult.employee_id == emp_uuid
            ).first()

            if result:
                from datetime import datetime
                result.email_delivered = True
                result.email_sent_at = datetime.utcnow()
                db.commit()
                logger.info(f"Phishing email sent to {to_email} for simulation {simulation_id}")
            else:
                logger.warning(f"SimulationResult not found for {simulation_id}/{employee_id}")
        else:
            logger.error(f"Failed to send phishing email to {to_email}")

        return success

    except Exception as e:
        logger.error(f"Error sending phishing email: {e}")
        db.rollback()
        # Retry with exponential backoff (max 2 retries)
        if send_phishing_simulation_email.request.retries < 2:
            raise send_phishing_simulation_email.retry(exc=e, countdown=60 * (2 ** send_phishing_simulation_email.request.retries))
        return False
    finally:
        db.close()


@celery_app.task(name="app.tasks.email_tasks.send_simulation_launch_notification")
def send_simulation_launch_notification(
    to_email: str,
    full_name: str,
    simulation_name: str,
    target_count: int
) -> bool:
    """
    Notify admin that simulation was launched.

    Args:
        to_email: Admin email address
        full_name: Admin's full name
        simulation_name: Name of simulation
        target_count: Number of employees targeted

    Returns:
        True if sent successfully
    """
    try:
        success = email_service.send_simulation_launch_notification(
            to_email, full_name, simulation_name, target_count
        )
        if success:
            logger.info(f"Simulation launch notification sent to {to_email}")
        return success
    except Exception as e:
        logger.error(f"Error sending simulation launch notification: {e}")
        return False


@celery_app.task(name="app.tasks.email_tasks.cleanup_expired_sessions")
def cleanup_expired_sessions() -> int:
    """
    Clean up expired sessions from database.

    Returns:
        Number of sessions cleaned up
    """
    db = SessionLocal()
    try:
        from app.core.session_manager import session_manager

        # Clean up expired sessions
        count = session_manager.cleanup_expired_sessions(db)

        if count > 0:
            logger.info(f"Cleaned up {count} expired sessions")

        return count
    except Exception as e:
        logger.error(f"Error cleaning up sessions: {e}")
        return 0
    finally:
        db.close()
