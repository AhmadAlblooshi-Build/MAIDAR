"""
Scenario Management API endpoints.

Provides CRUD operations for phishing scenarios.
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.config.database import get_db
from app.core.dependencies import get_current_user, get_current_admin_user, check_tenant_access
from app.core.risk_engine import ScenarioCategory
from app.models.user import User
from app.models.scenario import Scenario
from app.schemas.scenario import (
    ScenarioCreate,
    ScenarioUpdate,
    ScenarioResponse,
    ScenarioListResponse,
    ScenarioSearchRequest,
    ScenarioStatistics
)

router = APIRouter(tags=["Scenario Management"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
def create_scenario(
    scenario_data: ScenarioCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new phishing scenario.

    Requires TENANT_ADMIN or PLATFORM_SUPER_ADMIN role.
    """
    # Create scenario
    scenario = Scenario(
        tenant_id=current_user.tenant_id,
        name=scenario_data.name,
        description=scenario_data.description,
        category=scenario_data.category,
        language=scenario_data.language,
        difficulty=scenario_data.difficulty if hasattr(scenario_data, 'difficulty') else None,
        email_subject=scenario_data.email_subject,
        email_body_html=scenario_data.email_body_html,
        email_body_text=scenario_data.email_body_text,
        sender_name=scenario_data.sender_name,
        sender_email=scenario_data.sender_email,
        has_link=scenario_data.has_link if hasattr(scenario_data, 'has_link') else True,
        has_attachment=scenario_data.has_attachment if hasattr(scenario_data, 'has_attachment') else False,
        has_credential_form=scenario_data.has_credential_form if hasattr(scenario_data, 'has_credential_form') else False,
        is_active=True,
        created_by=current_user.id
    )

    db.add(scenario)
    db.commit()
    db.refresh(scenario)

    logger.info(f"Scenario created: {scenario.name} by user {current_user.email}")

    return ScenarioResponse(
        id=str(scenario.id),
        tenant_id=str(scenario.tenant_id),
        name=scenario.name,
        description=scenario.description,
        category=scenario.category,
        language=scenario.language,
        difficulty=scenario.difficulty,
        email_subject=scenario.email_subject,
        email_body_html=scenario.email_body_html,
        email_body_text=scenario.email_body_text,
        sender_name=scenario.sender_name,
        sender_email=scenario.sender_email,
        has_link=scenario.has_link,
        has_attachment=scenario.has_attachment,
        has_credential_form=scenario.has_credential_form,
        tags=[],  # Tags not implemented in model yet
        is_active=scenario.is_active,
        created_by=str(scenario.created_by),
        created_at=scenario.created_at,
        updated_at=scenario.updated_at
    )



@router.get("/statistics", response_model=ScenarioStatistics)
def get_scenario_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get scenario statistics for the current tenant.
    """
    # Total scenarios
    total = db.query(Scenario).filter(
        Scenario.tenant_id == current_user.tenant_id
    ).count()

    # By category
    by_category = {}
    category_counts = db.query(
        Scenario.category,
        func.count(Scenario.id)
    ).filter(
        Scenario.tenant_id == current_user.tenant_id
    ).group_by(Scenario.category).all()

    for category, count in category_counts:
        by_category[category] = count  # category is already a string

    # By language
    by_language = {}
    language_counts = db.query(
        Scenario.language,
        func.count(Scenario.id)
    ).filter(
        Scenario.tenant_id == current_user.tenant_id
    ).group_by(Scenario.language).all()

    for language, count in language_counts:
        by_language[language] = count

    # By difficulty
    by_difficulty = {}
    difficulty_counts = db.query(
        Scenario.difficulty,
        func.count(Scenario.id)
    ).filter(
        Scenario.tenant_id == current_user.tenant_id
    ).group_by(Scenario.difficulty).all()

    for difficulty, count in difficulty_counts:
        by_difficulty[difficulty] = count

    # Active scenarios
    active = db.query(Scenario).filter(
        Scenario.tenant_id == current_user.tenant_id,
        Scenario.is_active == True
    ).count()

    # With links
    with_links = db.query(Scenario).filter(
        Scenario.tenant_id == current_user.tenant_id,
        Scenario.has_link == True
    ).count()

    # With attachments
    with_attachments = db.query(Scenario).filter(
        Scenario.tenant_id == current_user.tenant_id,
        Scenario.has_attachment == True
    ).count()

    # With credential forms
    with_credentials = db.query(Scenario).filter(
        Scenario.tenant_id == current_user.tenant_id,
        Scenario.has_credential_form == True
    ).count()

    return ScenarioStatistics(
        total_scenarios=total,
        by_category=by_category,
        by_language=by_language,
        by_difficulty=by_difficulty,
        active_scenarios=active,
        with_links=with_links,
        with_attachments=with_attachments,
        with_credential_forms=with_credentials
    )


@router.get("/{scenario_id}", response_model=ScenarioResponse)
def get_scenario(
    scenario_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get scenario by ID.
    """
    try:
        uuid_id = UUID(scenario_id)
        scenario = db.query(Scenario).filter(Scenario.id == uuid_id).first()
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

    # Check tenant access
    check_tenant_access(str(scenario.tenant_id), current_user)

    return ScenarioResponse(
        id=str(scenario.id),
        tenant_id=str(scenario.tenant_id),
        name=scenario.name,
        description=scenario.description,
        category=scenario.category,
        language=scenario.language,
        difficulty=scenario.difficulty,
        email_subject=scenario.email_subject,
        email_body_html=scenario.email_body_html,
        email_body_text=scenario.email_body_text,
        sender_name=scenario.sender_name,
        sender_email=scenario.sender_email,
        has_link=scenario.has_link,
        has_attachment=scenario.has_attachment,
        has_credential_form=scenario.has_credential_form,
        tags=[],  # Tags not implemented in model yet
        is_active=scenario.is_active,
        created_by=str(scenario.created_by),
        created_at=scenario.created_at,
        updated_at=scenario.updated_at
    )


@router.put("/{scenario_id}", response_model=ScenarioResponse)
def update_scenario(
    scenario_id: str,
    scenario_data: ScenarioUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update scenario by ID.

    Requires TENANT_ADMIN or PLATFORM_SUPER_ADMIN role.
    """
    try:
        uuid_id = UUID(scenario_id)
        scenario = db.query(Scenario).filter(Scenario.id == uuid_id).first()
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

    # Check tenant access
    check_tenant_access(str(scenario.tenant_id), current_user)

    # Update fields
    update_data = scenario_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if field == 'category' and value:
            try:
                # Validate enum but store as string (database uses String type)
                ScenarioCategory(value)
                setattr(scenario, field, value)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid category value: {value}. Must be one of: BEC, CREDENTIALS, DATA, MALWARE"
                )
        else:
            setattr(scenario, field, value)

    db.commit()
    db.refresh(scenario)

    logger.info(f"Scenario updated: {scenario.name} by user {current_user.email}")

    return ScenarioResponse(
        id=str(scenario.id),
        tenant_id=str(scenario.tenant_id),
        name=scenario.name,
        description=scenario.description,
        category=scenario.category,
        language=scenario.language,
        difficulty=scenario.difficulty,
        email_subject=scenario.email_subject,
        email_body_html=scenario.email_body_html,
        email_body_text=scenario.email_body_text,
        sender_name=scenario.sender_name,
        sender_email=scenario.sender_email,
        has_link=scenario.has_link,
        has_attachment=scenario.has_attachment,
        has_credential_form=scenario.has_credential_form,
        tags=[],  # Tags not implemented in model yet
        is_active=scenario.is_active,
        created_by=str(scenario.created_by),
        created_at=scenario.created_at,
        updated_at=scenario.updated_at
    )


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scenario(
    scenario_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete scenario (hard delete - only if not used in simulations).

    Requires TENANT_ADMIN or PLATFORM_SUPER_ADMIN role.
    """
    try:
        uuid_id = UUID(scenario_id)
        scenario = db.query(Scenario).filter(Scenario.id == uuid_id).first()
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

    # Check tenant access
    check_tenant_access(str(scenario.tenant_id), current_user)

    # Check if scenario is used in any simulations
    from app.models.simulation import Simulation
    simulations_count = db.query(Simulation).filter(
        Simulation.scenario_id == scenario.id
    ).count()

    if simulations_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete scenario: used in {simulations_count} simulation(s). Deactivate instead."
        )

    # Hard delete
    db.delete(scenario)
    db.commit()

    logger.info(f"Scenario deleted: {scenario.name} by user {current_user.email}")

    return None


@router.post("/search", response_model=ScenarioListResponse)
def search_scenarios(
    search_request: ScenarioSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search and filter scenarios with pagination.
    """
    query = db.query(Scenario).filter(
        Scenario.tenant_id == current_user.tenant_id
    )

    # Apply text search
    if search_request.query:
        search_term = f"%{search_request.query}%"
        query = query.filter(
            or_(
                Scenario.name.ilike(search_term),
                Scenario.description.ilike(search_term)
            )
        )

    # Apply filters
    if search_request.category:
        try:
            # Validate enum (category stored as string in DB)
            ScenarioCategory(search_request.category)
            query = query.filter(Scenario.category == search_request.category)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category value: {search_request.category}"
            )

    if search_request.language:
        query = query.filter(Scenario.language == search_request.language)

    if search_request.difficulty:
        query = query.filter(Scenario.difficulty == search_request.difficulty)

    if search_request.is_active is not None:
        query = query.filter(Scenario.is_active == search_request.is_active)

    # Tag filtering not implemented yet (tags column doesn't exist in model)
    # if search_request.tags:
    #     # Filter by tags (PostgreSQL array contains)
    #     for tag in search_request.tags:
    #         query = query.filter(Scenario.tags.contains([tag]))

    # Get total count
    total = query.count()

    # Apply sorting
    if search_request.sort_by:
        sort_column = getattr(Scenario, search_request.sort_by, Scenario.created_at)
        if search_request.sort_order == 'desc':
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (search_request.page - 1) * search_request.page_size
    scenarios = query.offset(offset).limit(search_request.page_size).all()

    # Convert to response
    scenario_responses = [
        ScenarioResponse(
            id=str(s.id),
            tenant_id=str(s.tenant_id),
            name=s.name,
            description=s.description,
            category=s.category,
            language=s.language,
            difficulty=s.difficulty,
            email_subject=s.email_subject,
            email_body_html=s.email_body_html,
            email_body_text=s.email_body_text,
            sender_name=s.sender_name,
            sender_email=s.sender_email,
            has_link=s.has_link,
            has_attachment=s.has_attachment,
            has_credential_form=s.has_credential_form,
            tags=[],  # Tags not implemented in model yet
            is_active=s.is_active,
            created_by=str(s.created_by),
            created_at=s.created_at,
            updated_at=s.updated_at
        )
        for s in scenarios
    ]

    return ScenarioListResponse(
        total=total,
        page=search_request.page,
        page_size=search_request.page_size,
        scenarios=scenario_responses
    )

