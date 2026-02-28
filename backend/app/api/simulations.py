"""
Simulation Management API endpoints.

Provides CRUD operations for simulation campaigns, launching, and tracking results.
"""

import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, and_

# Import Celery tasks
from app.tasks.simulation_tasks import launch_simulation_emails

from app.config.database import get_db
from app.core.dependencies import get_current_user, get_current_admin_user, check_tenant_access
from app.models.user import User
from app.models.simulation import Simulation, SimulationStatus, SimulationResult
from app.models.scenario import Scenario
from app.models.employee import Employee
from app.schemas.simulation import (
    SimulationCreate,
    SimulationUpdate,
    SimulationResponse,
    SimulationListResponse,
    SimulationSearchRequest,
    SimulationStatistics,
    SimulationDetailedStatistics,
    SimulationResultResponse,
    SimulationResultListResponse,
    EmailTrackingEvent,
    LaunchSimulationRequest,
    LaunchSimulationResponse
)

router = APIRouter(tags=["Simulation Management"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED)
def create_simulation(
    simulation_data: SimulationCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new simulation campaign.

    Requires TENANT_ADMIN or PLATFORM_SUPER_ADMIN role.
    """
    # Verify scenario exists and belongs to tenant
    try:
        scenario_uuid = UUID(simulation_data.scenario_id)
        scenario = db.query(Scenario).filter(Scenario.id == scenario_uuid).first()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid scenario ID format"
        )

    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )

    check_tenant_access(str(scenario.tenant_id), current_user)

    if not scenario.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create simulation with inactive scenario"
        )

    # Verify all employees exist and belong to tenant
    employee_uuids = []
    for emp_id in simulation_data.target_employee_ids:
        try:
            emp_uuid = UUID(emp_id)
            employee = db.query(Employee).filter(
                Employee.id == emp_uuid,
                Employee.tenant_id == current_user.tenant_id,
                Employee.deleted_at == None
            ).first()

            if not employee:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Employee {emp_id} not found"
                )

            employee_uuids.append(emp_uuid)

        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid employee ID format: {emp_id}"
            )

    # Determine status
    if simulation_data.send_immediately:
        status_value = SimulationStatus.IN_PROGRESS
    elif simulation_data.scheduled_at:
        status_value = SimulationStatus.SCHEDULED
    else:
        status_value = SimulationStatus.DRAFT

    # Create simulation
    simulation = Simulation(
        tenant_id=current_user.tenant_id,
        name=simulation_data.name,
        description=simulation_data.description,
        scenario_id=scenario_uuid,
        status=status_value,
        target_employee_ids=employee_uuids,  # Store the employee IDs array
        scheduled_at=simulation_data.scheduled_at,
        created_by=current_user.id
    )

    db.add(simulation)
    db.flush()  # Get simulation ID

    # Create simulation results for each employee
    for emp_uuid in employee_uuids:
        result = SimulationResult(
            tenant_id=current_user.tenant_id,
            simulation_id=simulation.id,
            employee_id=emp_uuid
            # email_sent_at will be set when email is actually sent
        )
        db.add(result)

    db.commit()
    db.refresh(simulation)

    logger.info(f"Simulation created: {simulation.name} by user {current_user.email} with {len(employee_uuids)} targets")

    return SimulationResponse(
        id=str(simulation.id),
        tenant_id=str(simulation.tenant_id),
        name=simulation.name,
        description=simulation.description,
        scenario_id=str(simulation.scenario_id),
        scenario_name=scenario.name,
        status=simulation.status,
        total_targets=len(simulation.target_employee_ids),
        scheduled_at=simulation.scheduled_at,
        started_at=simulation.started_at,
        completed_at=simulation.completed_at,
        send_immediately=False,  # Default value (field not in model yet)
        track_opens=True,  # Default value (field not in model yet)
        track_clicks=True,  # Default value (field not in model yet)
        track_credentials=True,  # Default value (field not in model yet)
        created_by=str(simulation.created_by),
        created_at=simulation.created_at,
        updated_at=simulation.updated_at
    )


@router.get("/{simulation_id}", response_model=SimulationResponse)
def get_simulation(
    simulation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get simulation by ID.
    """
    try:
        uuid_id = UUID(simulation_id)
        simulation = db.query(Simulation).filter(Simulation.id == uuid_id).first()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid simulation ID format"
        )

    if not simulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found"
        )

    check_tenant_access(str(simulation.tenant_id), current_user)

    # Get scenario name
    scenario = db.query(Scenario).filter(Scenario.id == simulation.scenario_id).first()

    return SimulationResponse(
        id=str(simulation.id),
        tenant_id=str(simulation.tenant_id),
        name=simulation.name,
        description=simulation.description,
        scenario_id=str(simulation.scenario_id),
        scenario_name=scenario.name if scenario else None,
        status=simulation.status,
        total_targets=len(simulation.target_employee_ids),
        scheduled_at=simulation.scheduled_at,
        started_at=simulation.started_at,
        completed_at=simulation.completed_at,
        send_immediately=simulation.send_immediately,
        track_opens=simulation.track_opens,
        track_clicks=simulation.track_clicks,
        track_credentials=simulation.track_credentials,
        created_by=str(simulation.created_by),
        created_at=simulation.created_at,
        updated_at=simulation.updated_at
    )


@router.put("/{simulation_id}", response_model=SimulationResponse)
def update_simulation(
    simulation_id: str,
    simulation_data: SimulationUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update simulation (limited fields, only for draft/scheduled simulations).

    Requires TENANT_ADMIN or PLATFORM_SUPER_ADMIN role.
    """
    try:
        uuid_id = UUID(simulation_id)
        simulation = db.query(Simulation).filter(Simulation.id == uuid_id).first()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid simulation ID format"
        )

    if not simulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found"
        )

    check_tenant_access(str(simulation.tenant_id), current_user)

    # Can only update draft or scheduled simulations
    if simulation.status not in [SimulationStatus.DRAFT, SimulationStatus.SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update simulation in {simulation.status} status"
        )

    # Update fields
    update_data = simulation_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(simulation, field, value)

    db.commit()
    db.refresh(simulation)

    # Get scenario name
    scenario = db.query(Scenario).filter(Scenario.id == simulation.scenario_id).first()

    logger.info(f"Simulation updated: {simulation.name} by user {current_user.email}")

    return SimulationResponse(
        id=str(simulation.id),
        tenant_id=str(simulation.tenant_id),
        name=simulation.name,
        description=simulation.description,
        scenario_id=str(simulation.scenario_id),
        scenario_name=scenario.name if scenario else None,
        status=simulation.status,
        total_targets=len(simulation.target_employee_ids),
        scheduled_at=simulation.scheduled_at,
        started_at=simulation.started_at,
        completed_at=simulation.completed_at,
        send_immediately=simulation.send_immediately,
        track_opens=simulation.track_opens,
        track_clicks=simulation.track_clicks,
        track_credentials=simulation.track_credentials,
        created_by=str(simulation.created_by),
        created_at=simulation.created_at,
        updated_at=simulation.updated_at
    )


@router.delete("/{simulation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_simulation(
    simulation_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Cancel/delete simulation (can only delete draft simulations, others are cancelled).

    Requires TENANT_ADMIN or PLATFORM_SUPER_ADMIN role.
    """
    try:
        uuid_id = UUID(simulation_id)
        simulation = db.query(Simulation).filter(Simulation.id == uuid_id).first()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid simulation ID format"
        )

    if not simulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found"
        )

    check_tenant_access(str(simulation.tenant_id), current_user)

    if simulation.status == SimulationStatus.DRAFT:
        # Hard delete draft simulations
        db.delete(simulation)
        logger.info(f"Simulation deleted: {simulation.name} by user {current_user.email}")
    else:
        # Cancel other simulations
        simulation.status = SimulationStatus.CANCELLED
        logger.info(f"Simulation cancelled: {simulation.name} by user {current_user.email}")

    db.commit()

    return None


@router.post("/search")
def search_simulations(
    search_request: SimulationSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search and filter simulations with pagination.
    """

    # Build query
    query = db.query(Simulation).filter(
        Simulation.tenant_id == current_user.tenant_id
    )

    # Apply text search
    if search_request.query:
        search_term = f"%{search_request.query}%"
        query = query.filter(
            or_(
                Simulation.name.ilike(search_term),
                Simulation.description.ilike(search_term)
            )
        )

    # Apply filters
    if search_request.status:
        try:
            query = query.filter(Simulation.status == SimulationStatus(search_request.status))
        except ValueError:
            pass

    if search_request.scenario_id:
        try:
            scenario_uuid = UUID(search_request.scenario_id)
            query = query.filter(Simulation.scenario_id == scenario_uuid)
        except ValueError:
            pass

    if search_request.created_by:
        try:
            user_uuid = UUID(search_request.created_by)
            query = query.filter(Simulation.created_by == user_uuid)
        except ValueError:
            pass

    # Get total count
    total = query.count()

    # Apply sorting
    if search_request.sort_by:
        sort_column = getattr(Simulation, search_request.sort_by, Simulation.created_at)
        if search_request.sort_order == 'desc':
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (search_request.page - 1) * search_request.page_size
    simulations = query.offset(offset).limit(search_request.page_size).all()

    # Convert to response using model_construct to bypass validation
    simulation_responses = []
    for sim in simulations:
        scenario = db.query(Scenario).filter(Scenario.id == sim.scenario_id).first()

        # Use model_construct which doesn't validate
        sim_response = SimulationResponse.model_construct(
            id=str(sim.id),
            tenant_id=str(sim.tenant_id),
            name=sim.name,
            description=sim.description,
            scenario_id=str(sim.scenario_id),
            scenario_name=scenario.name if scenario else None,
            status=sim.status,
            total_targets=len(sim.target_employee_ids),
            scheduled_at=sim.scheduled_at,
            started_at=sim.started_at,
            completed_at=sim.completed_at,
            send_immediately=getattr(sim, 'send_immediately', False),
            track_opens=getattr(sim, 'track_opens', True),
            track_clicks=getattr(sim, 'track_clicks', True),
            track_credentials=getattr(sim, 'track_credentials', True),
            created_by=str(sim.created_by),
            created_at=sim.created_at,
            updated_at=sim.updated_at
        )
        simulation_responses.append(sim_response)

    # Use model_construct for the list response to bypass validation
    return SimulationListResponse.model_construct(
        total=total,
        page=search_request.page,
        page_size=search_request.page_size,
        simulations=simulation_responses
    )


@router.post("/{simulation_id}/launch", response_model=LaunchSimulationResponse)
def launch_simulation(
    simulation_id: str,
    launch_request: LaunchSimulationRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Launch a simulation (send phishing emails to targets).

    Requires TENANT_ADMIN or PLATFORM_SUPER_ADMIN role.
    """
    try:
        uuid_id = UUID(simulation_id)
        simulation = db.query(Simulation).filter(Simulation.id == uuid_id).first()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid simulation ID format"
        )

    if not simulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found"
        )

    check_tenant_access(str(simulation.tenant_id), current_user)

    # Can only launch draft or scheduled simulations
    if simulation.status not in [SimulationStatus.DRAFT, SimulationStatus.SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot launch simulation in {simulation.status} status"
        )

    # Update simulation status
    if launch_request.send_immediately:
        simulation.status = SimulationStatus.IN_PROGRESS
        simulation.started_at = datetime.utcnow()
        status_message = "Simulation launched successfully. Emails are being sent in the background."

        # Queue background task to send emails
        launch_simulation_emails.delay(
            simulation_id=str(simulation.id),
            admin_email=current_user.email,
            admin_name=current_user.full_name
        )
    else:
        simulation.status = SimulationStatus.SCHEDULED
        simulation.scheduled_at = launch_request.scheduled_at
        status_message = f"Simulation scheduled for {launch_request.scheduled_at}. Emails will be sent automatically."

    db.commit()

    logger.info(f"Simulation launched: {simulation.name} by user {current_user.email}")

    return LaunchSimulationResponse(
        simulation_id=str(simulation.id),
        status=simulation.status,
        message=status_message,
        emails_to_send=len(simulation.target_employee_ids),
        scheduled_at=simulation.scheduled_at
    )


@router.post("/{simulation_id}/track", status_code=status.HTTP_204_NO_CONTENT)
def track_email_event(
    simulation_id: str,
    tracking_event: EmailTrackingEvent,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Track email engagement event (open, click, submit).

    Public endpoint (no authentication required) - uses unique tracking tokens.
    """
    try:
        sim_uuid = UUID(simulation_id)
        emp_uuid = UUID(tracking_event.employee_id)

        result = db.query(SimulationResult).filter(
            SimulationResult.simulation_id == sim_uuid,
            SimulationResult.employee_id == emp_uuid
        ).first()

    except ValueError:
        return None  # Silent fail for invalid IDs

    if not result:
        return None  # Silent fail

    # Get client info
    user_agent = request.headers.get("User-Agent")
    client_ip = request.client.host

    # Update result based on event type using the interactions system
    from app.models.simulation import InteractionType

    if tracking_event.event_type == "open" and not result.email_opened:
        result.add_interaction(InteractionType.EMAIL_OPENED)
        logger.info(f"Email opened: simulation {simulation_id}, employee {tracking_event.employee_id}")

    elif tracking_event.event_type == "click" and not result.link_clicked:
        result.add_interaction(InteractionType.LINK_CLICKED)
        logger.info(f"Link clicked: simulation {simulation_id}, employee {tracking_event.employee_id}")

    elif tracking_event.event_type == "submit" and not result.credentials_submitted:
        result.add_interaction(InteractionType.CREDENTIALS_ENTERED)
        logger.warning(f"Credentials submitted: simulation {simulation_id}, employee {tracking_event.employee_id}")

    db.commit()

    return None


@router.get("/{simulation_id}/results", response_model=SimulationResultListResponse)
def get_simulation_results(
    simulation_id: str,
    page: int = 1,
    page_size: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get simulation results with pagination.
    """
    try:
        sim_uuid = UUID(simulation_id)
        simulation = db.query(Simulation).filter(Simulation.id == sim_uuid).first()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid simulation ID format"
        )

    if not simulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found"
        )

    check_tenant_access(str(simulation.tenant_id), current_user)

    # Get results
    query = db.query(SimulationResult).filter(
        SimulationResult.simulation_id == sim_uuid
    )

    total = query.count()

    offset = (page - 1) * page_size
    results = query.offset(offset).limit(page_size).all()

    # Convert to response with employee data
    result_responses = []
    for res in results:
        employee = db.query(Employee).filter(Employee.id == res.employee_id).first()

        result_responses.append(SimulationResultResponse(
            id=str(res.id),
            tenant_id=str(res.tenant_id),
            simulation_id=str(res.simulation_id),
            employee_id=str(res.employee_id),
            employee_name=employee.full_name if employee else None,
            employee_email=employee.email if employee else None,
            email_sent=res.email_delivered,  # email_delivered is the actual column
            email_sent_at=res.email_sent_at,
            email_opened=res.email_opened,  # This is a property
            email_opened_at=None,  # Not tracked separately in current schema
            link_clicked=res.link_clicked,  # This is a property
            link_clicked_at=None,  # Not tracked separately in current schema
            credentials_submitted=res.credentials_submitted,  # This is a property
            credentials_submitted_at=res.credentials_submitted_at,  # This is a property we added
            user_agent=None,  # Not in current schema
            ip_address=None,  # Not in current schema
            time_to_open=None,  # Not in current schema
            time_to_click=None,  # Not in current schema
            time_to_submit=None,  # Not in current schema
            created_at=res.created_at,
            updated_at=res.updated_at
        ))

    return SimulationResultListResponse(
        total=total,
        page=page,
        page_size=page_size,
        results=result_responses
    )


@router.get("/{simulation_id}/statistics", response_model=SimulationStatistics)
def get_simulation_statistics(
    simulation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get simulation statistics (engagement metrics).
    """
    try:
        sim_uuid = UUID(simulation_id)
        simulation = db.query(Simulation).filter(Simulation.id == sim_uuid).first()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid simulation ID format"
        )

    if not simulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found"
        )

    check_tenant_access(str(simulation.tenant_id), current_user)

    # Get counts
    results = db.query(SimulationResult).filter(
        SimulationResult.simulation_id == sim_uuid
    ).all()

    total_targets = len(results)
    emails_sent = sum(1 for r in results if r.email_delivered)
    emails_opened = sum(1 for r in results if r.email_opened)
    links_clicked = sum(1 for r in results if r.link_clicked)
    credentials_submitted = sum(1 for r in results if r.credentials_submitted)

    # Calculate rates
    open_rate = (emails_opened / emails_sent * 100) if emails_sent > 0 else 0.0
    click_rate = (links_clicked / emails_sent * 100) if emails_sent > 0 else 0.0
    submission_rate = (credentials_submitted / emails_sent * 100) if emails_sent > 0 else 0.0

    # Calculate average times (using time_to_first_interaction from model)
    times_to_first = [r.time_to_first_interaction.total_seconds() for r in results if r.time_to_first_interaction]

    # For now, use time_to_first_interaction as approximation for all timing metrics
    # In future, could calculate specific times from interactions JSONB array
    avg_time_to_open = sum(times_to_first) / len(times_to_first) if times_to_first else None
    avg_time_to_click = sum(times_to_first) / len(times_to_first) if times_to_first else None
    avg_time_to_submit = sum(times_to_first) / len(times_to_first) if times_to_first else None

    # Risk classification
    high_risk = sum(1 for r in results if r.link_clicked or r.credentials_submitted)
    medium_risk = sum(1 for r in results if r.email_opened and not r.link_clicked)
    low_risk = sum(1 for r in results if not r.email_opened)

    return SimulationStatistics(
        simulation_id=str(simulation.id),
        simulation_name=simulation.name,
        total_targets=total_targets,
        emails_sent=emails_sent,
        emails_opened=emails_opened,
        links_clicked=links_clicked,
        credentials_submitted=credentials_submitted,
        open_rate=round(open_rate, 2),
        click_rate=round(click_rate, 2),
        submission_rate=round(submission_rate, 2),
        avg_time_to_open=round(avg_time_to_open, 2) if avg_time_to_open else None,
        avg_time_to_click=round(avg_time_to_click, 2) if avg_time_to_click else None,
        avg_time_to_submit=round(avg_time_to_submit, 2) if avg_time_to_submit else None,
        high_risk_employees=high_risk,
        medium_risk_employees=medium_risk,
        low_risk_employees=low_risk
    )
