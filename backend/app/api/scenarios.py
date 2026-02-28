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

# AI Generation imports (optional - falls back to templates if not available)
try:
    import anthropic
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    logger.warning("Anthropic SDK not installed. AI generation will use templates.")


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


@router.post("/generate-ai", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
def generate_ai_scenario(
    context_type: str,
    target_segment: str,
    personalization_level: str,
    tone: str,
    language: str = "en",
    auto_save: bool = True,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Generate a phishing scenario using AI (Claude) or template-based generation.

    Parameters:
    - context_type: it_alert, hr_notification, finance_request, executive_message
    - target_segment: finance, it, hr, executive, all_staff
    - personalization_level: generic, department, individual
    - tone: urgent, friendly, professional, casual
    - language: en, ar (default: en)
    - auto_save: automatically save generated scenario (default: True)

    Requires TENANT_ADMIN or PLATFORM_SUPER_ADMIN role.
    """
    from pydantic import BaseModel
    import os
    import random
    import json

    # AI Generation prompt templates
    system_prompt = """You are an expert cybersecurity trainer creating realistic phishing simulation scenarios for employee security awareness training.

Your goal is to create EDUCATIONAL phishing scenarios that:
1. Are realistic and current (match real-world phishing tactics)
2. Are appropriate for corporate training (no explicit content)
3. Include clear red flags employees should notice
4. Follow UAE cultural and business norms
5. Are multilingual (English and Arabic)

Generate scenarios in a structured JSON format with all required fields."""

    user_prompt = f"""Create a phishing email scenario with these parameters:

Context: {context_type}
Target Audience: {target_segment}
Personalization: {personalization_level}
Tone: {tone}
Language: {language}

Return a JSON object with:
{{
  "name": "Brief scenario name",
  "description": "What this scenario tests (1-2 sentences)",
  "category": "One of: BEC, CREDENTIALS, DATA, MALWARE",
  "difficulty": "easy, medium, or hard",
  "email_subject": "The email subject line",
  "email_body_text": "Plain text email body (realistic, 3-5 paragraphs)",
  "email_body_html": "HTML version with basic formatting",
  "sender_name": "Realistic sender name",
  "sender_email": "Realistic but fake email address",
  "has_link": true/false,
  "has_attachment": true/false,
  "has_credential_form": true/false,
  "red_flags": ["List of 3-5 red flags employees should notice"]
}}

Make it realistic, appropriate for UAE business culture, and educationally valuable."""

    try:
        # Try AI generation if available and API key exists
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if AI_AVAILABLE and api_key:
            try:
                client = anthropic.Anthropic(api_key=api_key)

                response = client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=2000,
                    temperature=0.8,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ]
                )

                # Extract JSON from response
                content = response.content[0].text
                # Try to parse JSON from the response
                if "```json" in content:
                    json_str = content.split("```json")[1].split("```")[0].strip()
                else:
                    json_str = content

                scenario_data = json.loads(json_str)
                logger.info(f"AI-generated scenario using Claude API for user {current_user.email}")

            except Exception as e:
                logger.error(f"AI generation failed: {e}. Falling back to templates.")
                scenario_data = _generate_template_scenario(context_type, target_segment, tone, language)
        else:
            # Use template-based generation
            scenario_data = _generate_template_scenario(context_type, target_segment, tone, language)
            logger.info(f"Template-generated scenario for user {current_user.email}")

        # Save scenario if requested
        if auto_save:
            scenario = Scenario(
                tenant_id=current_user.tenant_id,
                name=scenario_data['name'],
                description=scenario_data['description'],
                category=scenario_data['category'],
                language=language,
                difficulty=scenario_data.get('difficulty', 'medium'),
                email_subject=scenario_data['email_subject'],
                email_body_html=scenario_data.get('email_body_html', scenario_data['email_body_text']),
                email_body_text=scenario_data['email_body_text'],
                sender_name=scenario_data['sender_name'],
                sender_email=scenario_data['sender_email'],
                has_link=scenario_data.get('has_link', True),
                has_attachment=scenario_data.get('has_attachment', False),
                has_credential_form=scenario_data.get('has_credential_form', False),
                is_active=True,
                created_by=current_user.id
            )

            db.add(scenario)
            db.commit()
            db.refresh(scenario)

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
                tags=[],
                is_active=scenario.is_active,
                created_by=str(scenario.created_by),
                created_at=scenario.created_at,
                updated_at=scenario.updated_at
            )
        else:
            # Return preview without saving
            from datetime import datetime
            return ScenarioResponse(
                id="preview",
                tenant_id=str(current_user.tenant_id),
                name=scenario_data['name'],
                description=scenario_data['description'],
                category=scenario_data['category'],
                language=language,
                difficulty=scenario_data.get('difficulty', 'medium'),
                email_subject=scenario_data['email_subject'],
                email_body_html=scenario_data.get('email_body_html', scenario_data['email_body_text']),
                email_body_text=scenario_data['email_body_text'],
                sender_name=scenario_data['sender_name'],
                sender_email=scenario_data['sender_email'],
                has_link=scenario_data.get('has_link', True),
                has_attachment=scenario_data.get('has_attachment', False),
                has_credential_form=scenario_data.get('has_credential_form', False),
                tags=[],
                is_active=False,
                created_by=str(current_user.id),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

    except Exception as e:
        logger.error(f"Scenario generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate scenario: {str(e)}"
        )


def _generate_template_scenario(context_type: str, target_segment: str, tone: str, language: str) -> dict:
    """
    Template-based scenario generation (fallback when AI is not available).
    Provides realistic, contextually appropriate phishing scenarios.
    """
    import random

    # Template library organized by context
    templates = {
        "it_alert": {
            "BEC": {
                "name": "IT Security Alert - Password Expiration",
                "description": "Tests user response to urgent IT security notifications with credential requests",
                "category": "CREDENTIALS",
                "difficulty": "medium",
                "email_subject": "URGENT: Your password expires in 24 hours",
                "sender_name": "IT Security Team",
                "sender_email": "security@{company}-it.com",
                "has_link": True,
                "has_credential_form": True,
                "has_attachment": False,
            }
        },
        "hr_notification": {
            "BEC": {
                "name": "HR Policy Update Notification",
                "description": "Tests recognition of fake HR communications requesting personal data",
                "category": "DATA",
                "difficulty": "easy",
                "email_subject": "Important: New Company Policy - Action Required",
                "sender_name": "Human Resources",
                "sender_email": "hr-notices@{company}.net",
                "has_link": True,
                "has_credential_form": False,
                "has_attachment": True,
            }
        },
        "finance_request": {
            "BEC": {
                "name": "Executive Finance Request",
                "description": "Tests detection of business email compromise from fake executives",
                "category": "BEC",
                "difficulty": "hard",
                "email_subject": "Urgent: Wire Transfer Needed Today",
                "sender_name": "CEO Office",
                "sender_email": "ceo@{company}-exec.com",
                "has_link": False,
                "has_credential_form": False,
                "has_attachment": True,
            }
        },
        "executive_message": {
            "BEC": {
                "name": "C-Suite Strategic Update",
                "description": "Tests awareness of executive impersonation tactics",
                "category": "BEC",
                "difficulty": "medium",
                "email_subject": "Confidential: Q4 Strategy Changes",
                "sender_name": "Chief Executive Officer",
                "sender_email": "executive@{company}-board.com",
                "has_link": True,
                "has_credential_form": False,
                "has_attachment": True,
            }
        }
    }

    # Select template
    context_templates = templates.get(context_type, templates["it_alert"])
    template = context_templates["BEC"]  # Default to BEC

    # Generate email body based on tone
    if tone == "urgent":
        body_text = f"""Dear Team Member,

This is an urgent security notification requiring your immediate attention.

{template['description']}

You must take action within the next 24 hours to avoid service interruption. Click the link below to verify your account immediately.

[Verify Account Now]

Failure to comply will result in account suspension.

Best regards,
{template['sender_name']}

--
This is an automated message. Do not reply to this email."""

    elif tone == "friendly":
        body_text = f"""Hi there!

Hope you're having a great day! We wanted to reach out about an important update.

{template['description']}

Could you take a quick moment to review this? Just click the link below when you have a chance.

[Click Here to Review]

Thanks so much for your cooperation!

Warm regards,
{template['sender_name']}"""

    else:  # professional
        body_text = f"""Dear Colleague,

We are writing to inform you of an important matter requiring your attention.

{template['description']}

Please review the attached documentation and confirm your acknowledgment by clicking the verification link below at your earliest convenience.

[Verification Link]

Should you have any questions, please contact our support team.

Kind regards,
{template['sender_name']}

--
Confidential Communication"""

    # Create HTML version with basic formatting
    body_html = f"""<html><body style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
<p>{body_text.replace(chr(10), '<br>')}</p>
</body></html>"""

    return {
        **template,
        "email_body_text": body_text,
        "email_body_html": body_html,
    }


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

