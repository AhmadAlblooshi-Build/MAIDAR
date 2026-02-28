"""
Simulation-related background tasks.

These tasks handle simulation launching, scheduling, and risk recalculation.
"""

import logging
from datetime import datetime
from uuid import UUID
from typing import List

from app.core.celery_app import celery_app
from app.config.database import SessionLocal
from app.models.simulation import Simulation, SimulationStatus, SimulationResult
from app.models.employee import Employee
from app.tasks.email_tasks import send_phishing_simulation_email, send_simulation_launch_notification

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.simulation_tasks.launch_simulation_emails")
def launch_simulation_emails(
    simulation_id: str,
    admin_email: str,
    admin_name: str
) -> dict:
    """
    Launch a simulation by sending phishing emails to all targets.

    This task:
    1. Queues phishing emails for all target employees
    2. Sends notification to admin
    3. Updates simulation status

    Args:
        simulation_id: Simulation UUID
        admin_email: Admin email for notification
        admin_name: Admin name for notification

    Returns:
        Dictionary with launch status and counts
    """
    db = SessionLocal()
    try:
        sim_uuid = UUID(simulation_id)
        simulation = db.query(Simulation).filter(Simulation.id == sim_uuid).first()

        if not simulation:
            logger.error(f"Simulation {simulation_id} not found")
            return {"success": False, "error": "Simulation not found"}

        # Get all simulation results (one per employee)
        results = db.query(SimulationResult).filter(
            SimulationResult.simulation_id == sim_uuid
        ).all()

        if not results:
            logger.error(f"No simulation results found for {simulation_id}")
            return {"success": False, "error": "No targets found"}

        # Queue email sending task for each employee
        emails_queued = 0
        for result in results:
            # Get employee email
            employee = db.query(Employee).filter(Employee.id == result.employee_id).first()
            if not employee:
                logger.warning(f"Employee {result.employee_id} not found, skipping")
                continue

            # Queue phishing email task
            send_phishing_simulation_email.delay(
                simulation_id=simulation_id,
                employee_id=str(result.employee_id),
                to_email=employee.email
            )
            emails_queued += 1

        # Send notification to admin
        send_simulation_launch_notification.delay(
            to_email=admin_email,
            full_name=admin_name,
            simulation_name=simulation.name,
            target_count=emails_queued
        )

        logger.info(f"Simulation {simulation_id} launched: {emails_queued} emails queued")

        return {
            "success": True,
            "simulation_id": simulation_id,
            "emails_queued": emails_queued,
            "total_targets": len(simulation.target_employee_ids)
        }

    except Exception as e:
        logger.error(f"Error launching simulation: {e}")
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()


@celery_app.task(name="app.tasks.simulation_tasks.launch_scheduled_simulations")
def launch_scheduled_simulations() -> int:
    """
    Check for simulations scheduled to launch now and trigger them.

    This task runs every minute via Celery Beat.

    Returns:
        Number of simulations launched
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()

        # Find all scheduled simulations that should launch now
        simulations = db.query(Simulation).filter(
            Simulation.status == SimulationStatus.SCHEDULED,
            Simulation.scheduled_at <= now
        ).all()

        launched_count = 0
        for simulation in simulations:
            try:
                # Update status
                simulation.status = SimulationStatus.IN_PROGRESS
                simulation.started_at = now
                db.commit()

                # Queue email sending
                # Note: We need to get the admin who created this simulation
                from app.models.user import User
                admin = db.query(User).filter(User.id == simulation.created_by).first()

                if admin:
                    launch_simulation_emails.delay(
                        simulation_id=str(simulation.id),
                        admin_email=admin.email,
                        admin_name=admin.full_name
                    )
                    launched_count += 1
                    logger.info(f"Launched scheduled simulation: {simulation.name}")
                else:
                    logger.error(f"Admin user {simulation.created_by} not found for simulation {simulation.id}")

            except Exception as e:
                logger.error(f"Error launching simulation {simulation.id}: {e}")
                db.rollback()
                continue

        if launched_count > 0:
            logger.info(f"Launched {launched_count} scheduled simulations")

        return launched_count

    except Exception as e:
        logger.error(f"Error in launch_scheduled_simulations: {e}")
        return 0
    finally:
        db.close()


@celery_app.task(name="app.tasks.simulation_tasks.recalculate_all_risk_scores")
def recalculate_all_risk_scores() -> int:
    """
    Recalculate risk scores for all employees across all tenants.

    This task runs daily via Celery Beat to ensure risk scores stay current
    based on latest simulation results.

    Returns:
        Number of employees whose risk scores were recalculated
    """
    db = SessionLocal()
    try:
        from app.core.risk_engine import risk_engine

        # Get all employees
        employees = db.query(Employee).all()
        updated_count = 0

        for employee in employees:
            try:
                # Recalculate risk score using risk engine
                # The risk engine will look at the employee's latest simulation results
                risk_score = risk_engine.calculate_employee_risk(
                    employee=employee,
                    db=db
                )

                # Update employee risk score if changed
                if employee.risk_score != risk_score:
                    employee.risk_score = risk_score
                    updated_count += 1

            except Exception as e:
                logger.error(f"Error recalculating risk for employee {employee.id}: {e}")
                continue

        db.commit()
        logger.info(f"Recalculated risk scores for {updated_count} employees")
        return updated_count

    except Exception as e:
        logger.error(f"Error in recalculate_all_risk_scores: {e}")
        db.rollback()
        return 0
    finally:
        db.close()


@celery_app.task(name="app.tasks.simulation_tasks.complete_simulation")
def complete_simulation(simulation_id: str) -> bool:
    """
    Mark a simulation as completed and calculate final statistics.

    Args:
        simulation_id: Simulation UUID

    Returns:
        True if successful
    """
    db = SessionLocal()
    try:
        sim_uuid = UUID(simulation_id)
        simulation = db.query(Simulation).filter(Simulation.id == sim_uuid).first()

        if not simulation:
            logger.error(f"Simulation {simulation_id} not found")
            return False

        # Update simulation status
        simulation.status = SimulationStatus.COMPLETED
        simulation.completed_at = datetime.utcnow()

        # Calculate final statistics (you can expand this)
        results = db.query(SimulationResult).filter(
            SimulationResult.simulation_id == sim_uuid
        ).all()

        total_sent = sum(1 for r in results if r.email_delivered)
        total_opened = sum(1 for r in results if r.email_opened)
        total_clicked = sum(1 for r in results if r.link_clicked)
        total_submitted = sum(1 for r in results if r.credentials_submitted)

        logger.info(
            f"Simulation {simulation.name} completed: "
            f"{total_sent} sent, {total_opened} opened, "
            f"{total_clicked} clicked, {total_submitted} submitted"
        )

        db.commit()
        return True

    except Exception as e:
        logger.error(f"Error completing simulation: {e}")
        db.rollback()
        return False
    finally:
        db.close()
