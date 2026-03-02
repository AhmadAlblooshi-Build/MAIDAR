"""
Assessment API endpoints.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.config.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentQuestionResponse,
    AssessmentResult,
    AssessmentAnswer,
    AssessmentStatus,
    AssessmentResultStatus,
    TargetAudience,
)
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentUpdate,
    AssessmentResponse,
    AssessmentListItem,
    AssessmentListResponse,
    AssessmentSubmit,
    AssessmentResultResponse,
    AssessmentResultListResponse,
)

router = APIRouter(tags=["Assessments"])


# ============================================================================
# Assessment CRUD Endpoints
# ============================================================================

@router.post("", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
def create_assessment(
    data: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new risk assessment.

    Requires: TENANT_ADMIN or ANALYST role
    """
    # Create assessment
    assessment = Assessment(
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        title=data.title,
        category=data.category,
        priority=data.priority,
        description=data.description,
        target_audience=data.target_audience,
        target_departments=data.target_departments,  # Save selected departments
        time_limit=data.time_limit,
        randomize_questions=data.randomize_questions,
        allow_pause_resume=data.allow_pause_resume,
        anonymous_responses=data.anonymous_responses,
        status=AssessmentStatus.DRAFT,
    )
    db.add(assessment)
    db.flush()  # Get assessment ID

    # Create questions and responses
    for q_data in data.questions:
        question = AssessmentQuestion(
            assessment_id=assessment.id,
            question_text=q_data.question_text,
            question_type=q_data.question_type,
            order_index=q_data.order_index,
        )
        db.add(question)
        db.flush()  # Get question ID

        # Create response options
        for r_data in q_data.responses:
            response = AssessmentQuestionResponse(
                question_id=question.id,
                response_text=r_data.response_text,
                is_correct=r_data.is_correct,
                order_index=r_data.order_index,
            )
            db.add(response)

    db.commit()
    db.refresh(assessment)

    return assessment


@router.get("", response_model=AssessmentListResponse)
def list_assessments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[AssessmentStatus] = None,
    target_audience: Optional[TargetAudience] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all assessments for the current tenant.

    Supports filtering by status, target audience, and search query.
    """
    # Base query with tenant isolation
    query = db.query(Assessment).filter(Assessment.tenant_id == current_user.tenant_id)

    # Apply filters
    if status:
        query = query.filter(Assessment.status == status)
    if target_audience:
        query = query.filter(Assessment.target_audience == target_audience)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Assessment.title.ilike(search_pattern),
                Assessment.description.ilike(search_pattern),
                Assessment.category.ilike(search_pattern),
            )
        )

    # Get total count
    total = query.count()

    # Apply pagination and order by created_at descending
    assessments = (
        query.order_by(Assessment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Build response with computed fields
    items = []
    for assessment in assessments:
        # Count questions
        question_count = len(assessment.questions)

        # Count unique participants (employees who started the assessment)
        participant_count = (
            db.query(func.count(func.distinct(AssessmentResult.employee_id)))
            .filter(AssessmentResult.assessment_id == assessment.id)
            .scalar()
        ) or 0

        item = AssessmentListItem(
            id=assessment.id,
            title=assessment.title,
            category=assessment.category,
            priority=assessment.priority,
            target_audience=assessment.target_audience,
            status=assessment.status,
            created_at=assessment.created_at,
            deployed_at=assessment.deployed_at,
            question_count=question_count,
            participant_count=participant_count,
        )
        items.append(item)

    total_pages = (total + page_size - 1) // page_size

    return AssessmentListResponse(
        assessments=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{assessment_id}", response_model=AssessmentResponse)
def get_assessment(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific assessment by ID.

    Returns full assessment details including all questions and response options.
    """
    assessment = (
        db.query(Assessment)
        .filter(
            Assessment.id == assessment_id,
            Assessment.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found",
        )

    return assessment


@router.patch("/{assessment_id}", response_model=AssessmentResponse)
def update_assessment(
    assessment_id: UUID,
    data: AssessmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing assessment.

    Only updates provided fields. Cannot update questions through this endpoint.
    """
    assessment = (
        db.query(Assessment)
        .filter(
            Assessment.id == assessment_id,
            Assessment.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found",
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(assessment, field, value)

    assessment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(assessment)

    return assessment


@router.post("/{assessment_id}/deploy", response_model=AssessmentResponse)
def deploy_assessment(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deploy an assessment, making it active and available to employees.

    Validates that assessment has at least one question before deploying.
    Creates AssessmentResult records for all targeted employees based on audience type.
    """
    from app.models.employee import Employee
    from app.models.assessment import AssessmentResult, TargetAudience
    from datetime import timedelta

    assessment = (
        db.query(Assessment)
        .filter(
            Assessment.id == assessment_id,
            Assessment.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found",
        )

    # Validate has questions
    if not assessment.questions or len(assessment.questions) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assessment must have at least one question to deploy",
        )

    # Query employees based on target audience (exclude soft-deleted)
    employee_query = db.query(Employee).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.is_active == True,
        Employee.deleted_at.is_(None),  # Exclude soft-deleted employees
    )

    if assessment.target_audience == TargetAudience.GLOBAL.value:
        # All active employees
        pass  # No additional filter needed

    elif assessment.target_audience == TargetAudience.RISK.value:
        # High risk employees (risk_score > 68, which is > 6.8 on 0-10 scale)
        employee_query = employee_query.filter(Employee.risk_score > 68)

    elif assessment.target_audience == TargetAudience.NEWHIRES.value:
        # Employees hired in the last 90 days
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        employee_query = employee_query.filter(Employee.created_at >= ninety_days_ago)

    elif assessment.target_audience == TargetAudience.DEPARTMENTAL.value:
        # Specific departments
        if not assessment.target_departments or len(assessment.target_departments) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Departmental filter requires at least one department to be selected",
            )

        # Convert JSONB to list if needed
        dept_list = assessment.target_departments
        if not isinstance(dept_list, list):
            dept_list = list(dept_list) if dept_list else []

        print(f"Filtering by departments: {dept_list}")
        employee_query = employee_query.filter(Employee.department.in_(dept_list))

    # Get all targeted employees
    try:
        targeted_employees = employee_query.all()
        print(f"Found {len(targeted_employees)} targeted employees")
    except Exception as e:
        print(f"Error querying employees: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query employees: {str(e)}",
        )

    if len(targeted_employees) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No employees match the selected audience criteria ({assessment.target_audience})",
        )

    # Create AssessmentResult records for each targeted employee
    created_count = 0
    for employee in targeted_employees:
        # Check if result already exists (avoid duplicates on re-deploy)
        existing = db.query(AssessmentResult).filter(
            AssessmentResult.assessment_id == assessment.id,
            AssessmentResult.employee_id == employee.id,
        ).first()

        if not existing:
            result = AssessmentResult(
                assessment_id=assessment.id,
                employee_id=employee.id,
                status="in_progress",
                started_at=datetime.utcnow(),
            )
            db.add(result)
            created_count += 1

    # Update assessment status
    assessment.status = AssessmentStatus.ACTIVE
    assessment.deployed_at = datetime.utcnow()
    assessment.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(assessment)
    except Exception as e:
        db.rollback()
        print(f"Error committing deployment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deploy assessment: {str(e)}",
        )

    # Log deployment info
    print(f"Assessment {assessment.id} deployed to {created_count} employees (audience: {assessment.target_audience})")

    return assessment


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assessment(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete an assessment.

    Cascade deletes all questions, responses, and results.
    """
    assessment = (
        db.query(Assessment)
        .filter(
            Assessment.id == assessment_id,
            Assessment.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found",
        )

    db.delete(assessment)
    db.commit()

    return None


# ============================================================================
# Employee Assessment Submission Endpoints
# ============================================================================

@router.post("/{assessment_id}/start", response_model=AssessmentResultResponse)
def start_assessment(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start an assessment for an employee.

    Creates an AssessmentResult record to track progress.
    Employees can only have one in-progress result per assessment.
    """
    # Verify assessment exists and is active
    assessment = (
        db.query(Assessment)
        .filter(
            Assessment.id == assessment_id,
            Assessment.tenant_id == current_user.tenant_id,
            Assessment.status == AssessmentStatus.ACTIVE,
        )
        .first()
    )

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found or not active",
        )

    # Check if employee already has in-progress result
    existing_result = (
        db.query(AssessmentResult)
        .filter(
            AssessmentResult.assessment_id == assessment_id,
            AssessmentResult.employee_id == current_user.employee_id,
            AssessmentResult.status == AssessmentResultStatus.IN_PROGRESS,
        )
        .first()
    )

    if existing_result:
        # Return existing in-progress result
        return existing_result

    # Create new result
    result = AssessmentResult(
        assessment_id=assessment_id,
        employee_id=current_user.employee_id,
        status=AssessmentResultStatus.IN_PROGRESS,
        started_at=datetime.utcnow(),
        total_questions=len(assessment.questions),
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    return result


@router.post("/{assessment_id}/submit", response_model=AssessmentResultResponse)
def submit_assessment(
    assessment_id: UUID,
    data: AssessmentSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a completed assessment.

    Grades answers, calculates score, and marks result as completed.
    """
    # Get the in-progress result
    result = (
        db.query(AssessmentResult)
        .filter(
            AssessmentResult.assessment_id == assessment_id,
            AssessmentResult.employee_id == current_user.employee_id,
            AssessmentResult.status == AssessmentResultStatus.IN_PROGRESS,
        )
        .first()
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No in-progress assessment found. Start the assessment first.",
        )

    # Get assessment with questions
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

    # Process answers
    correct_count = 0
    for answer_data in data.answers:
        # Check if this answer already exists (prevent duplicates)
        existing_answer = (
            db.query(AssessmentAnswer)
            .filter(
                AssessmentAnswer.result_id == result.id,
                AssessmentAnswer.question_id == answer_data.question_id,
            )
            .first()
        )

        if existing_answer:
            continue  # Skip duplicate answers

        # Create answer record
        answer = AssessmentAnswer(
            result_id=result.id,
            question_id=answer_data.question_id,
            response_id=answer_data.response_id,
            answer_text=answer_data.answer_text,
            time_taken=answer_data.time_taken,
        )

        # Grade answer if response_id provided
        if answer_data.response_id:
            response = (
                db.query(AssessmentQuestionResponse)
                .filter(AssessmentQuestionResponse.id == answer_data.response_id)
                .first()
            )
            if response and response.is_correct is not None:
                answer.is_correct = response.is_correct
                if response.is_correct:
                    correct_count += 1

        db.add(answer)

    # Calculate final score
    total_questions = result.total_questions or len(assessment.questions)
    score = int((correct_count / total_questions * 100)) if total_questions > 0 else 0

    # Update result
    result.status = AssessmentResultStatus.COMPLETED
    result.completed_at = datetime.utcnow()
    result.time_taken = int((result.completed_at - result.started_at).total_seconds())
    result.score = score
    result.correct_answers = correct_count

    db.commit()
    db.refresh(result)

    return result


@router.get("/{assessment_id}/results", response_model=AssessmentResultListResponse)
def get_assessment_results(
    assessment_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all results for an assessment.

    Requires: TENANT_ADMIN or ANALYST role (for viewing all results)
    """
    # Verify assessment exists and belongs to tenant
    assessment = (
        db.query(Assessment)
        .filter(
            Assessment.id == assessment_id,
            Assessment.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found",
        )

    # Query results
    query = db.query(AssessmentResult).filter(
        AssessmentResult.assessment_id == assessment_id
    )

    # Get total count
    total = query.count()

    # Apply pagination
    results = (
        query.order_by(AssessmentResult.started_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    total_pages = (total + page_size - 1) // page_size

    return AssessmentResultListResponse(
        results=results,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
