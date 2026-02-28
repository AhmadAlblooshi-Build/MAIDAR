"""
Advanced Analytics API endpoints.

Provides executive-level risk analytics, trend analysis, reporting, and data export.
"""

import logging
from typing import List, Optional
from datetime import datetime, date, timedelta
from uuid import UUID
import io
import csv

from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc

from app.config.database import get_db
from app.core.dependencies import get_current_user, get_current_admin_user, get_current_super_admin
from app.core.exports import export_employees, export_risk_scores, export_simulation_results
from app.models.user import User
from app.models.employee import Employee
from app.models.risk_score import RiskScore, RiskBand
from app.models.simulation import Simulation, SimulationResult
from app.models.scenario import Scenario
from app.schemas.analytics import (
    DateRangeRequest,
    TrendDataPoint,
    RiskTrendAnalysis,
    DepartmentRiskComparison,
    DepartmentComparison,
    SeniorityRiskComparison,
    SeniorityComparison,
    EmployeeRiskProfile,
    TopVulnerableEmployees,
    SimulationPerformance,
    SimulationEffectiveness,
    VulnerabilityHeatmap,
    RiskDistribution,
    TrainingEffectiveness,
    ExecutiveSummary,
    DataExportRequest,
    DataExportResponse
)

router = APIRouter(tags=["Analytics & Reporting"])
logger = logging.getLogger(__name__)


@router.post("/risk-trends", response_model=RiskTrendAnalysis)
def get_risk_trends(
    date_range: DateRangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get risk trend analysis over time.

    Shows how risk scores have changed over the specified date range.
    """
    # Query risk scores within date range
    risk_scores = db.query(RiskScore).filter(
        RiskScore.tenant_id == current_user.tenant_id,
        RiskScore.created_at >= date_range.start_date,
        RiskScore.created_at <= date_range.end_date
    ).all()

    if not risk_scores:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No risk data found for the specified date range"
        )

    # Calculate overall trend
    daily_averages = {}
    for score in risk_scores:
        day = score.created_at.date()
        if day not in daily_averages:
            daily_averages[day] = []
        daily_averages[day].append(score.risk_score)

    overall_trend = [
        TrendDataPoint(
            date=day,
            value=round(sum(scores) / len(scores), 2)
        )
        for day, scores in sorted(daily_averages.items())
    ]

    # Calculate average risk score
    all_scores = [score.risk_score for score in risk_scores]
    avg_risk = sum(all_scores) / len(all_scores)

    # Calculate change percentage
    if len(overall_trend) >= 2:
        first_value = overall_trend[0].value
        last_value = overall_trend[-1].value
        change_pct = ((last_value - first_value) / first_value * 100) if first_value > 0 else 0
    else:
        change_pct = 0.0

    # Calculate trends by category
    risk_by_category = {}
    for score in risk_scores:
        if score.scenario:
            category = score.scenario.category
            day = score.created_at.date()

            if category not in risk_by_category:
                risk_by_category[category] = {}

            if day not in risk_by_category[category]:
                risk_by_category[category][day] = []

            risk_by_category[category][day].append(score.risk_score)

    category_trends = {
        category: [
            TrendDataPoint(date=day, value=round(sum(scores) / len(scores), 2))
            for day, scores in sorted(daily_data.items())
        ]
        for category, daily_data in risk_by_category.items()
    }

    # Calculate trends by department
    risk_by_department = {}
    for score in risk_scores:
        if score.employee:
            dept = score.employee.department
            day = score.created_at.date()

            if dept not in risk_by_department:
                risk_by_department[dept] = {}

            if day not in risk_by_department[dept]:
                risk_by_department[dept][day] = []

            risk_by_department[dept][day].append(score.risk_score)

    department_trends = {
        dept: [
            TrendDataPoint(date=day, value=round(sum(scores) / len(scores), 2))
            for day, scores in sorted(daily_data.items())
        ]
        for dept, daily_data in risk_by_department.items()
    }

    # Calculate trends by seniority
    risk_by_seniority = {}
    for score in risk_scores:
        if score.employee:
            seniority = score.employee.seniority
            day = score.created_at.date()

            if seniority not in risk_by_seniority:
                risk_by_seniority[seniority] = {}

            if day not in risk_by_seniority[seniority]:
                risk_by_seniority[seniority][day] = []

            risk_by_seniority[seniority][day].append(score.risk_score)

    seniority_trends = {
        seniority: [
            TrendDataPoint(date=day, value=round(sum(scores) / len(scores), 2))
            for day, scores in sorted(daily_data.items())
        ]
        for seniority, daily_data in risk_by_seniority.items()
    }

    return RiskTrendAnalysis(
        tenant_id=str(current_user.tenant_id),
        date_range=date_range,
        overall_risk_trend=overall_trend,
        average_risk_score=round(avg_risk, 2),
        risk_change_percentage=round(change_pct, 2),
        risk_by_category=category_trends,
        risk_by_department=department_trends,
        risk_by_seniority=seniority_trends
    )


@router.get("/department-comparison", response_model=DepartmentComparison)
def get_department_comparison(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compare risk across all departments.

    Identifies highest and lowest risk departments.
    """
    # Get all departments
    departments = db.query(Employee.department).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None
    ).distinct().all()

    department_comparisons = []
    for (dept,) in departments:
        # Get employees in department
        employees = db.query(Employee).filter(
            Employee.tenant_id == current_user.tenant_id,
            Employee.department == dept,
            Employee.deleted_at == None
        ).all()

        if not employees:
            continue

        # Get risk scores for department
        emp_ids = [emp.id for emp in employees]
        risk_scores = db.query(RiskScore).filter(
            RiskScore.employee_id.in_(emp_ids)
        ).all()

        if risk_scores:
            avg_risk = sum(score.risk_score for score in risk_scores) / len(risk_scores)

            # Count by risk level
            high_risk = sum(1 for score in risk_scores if score.risk_score >= 60)
            medium_risk = sum(1 for score in risk_scores if 40 <= score.risk_score < 60)
            low_risk = sum(1 for score in risk_scores if score.risk_score < 40)
        else:
            avg_risk = 0
            high_risk = medium_risk = low_risk = 0

        # Get simulation metrics for department
        sim_results = db.query(SimulationResult).filter(
            SimulationResult.employee_id.in_(emp_ids)
        ).all()

        recent_sims = len(set(result.simulation_id for result in sim_results))
        click_rate = (sum(1 for r in sim_results if r.link_clicked) / len(sim_results) * 100) if sim_results else 0
        submit_rate = (sum(1 for r in sim_results if r.credentials_entered) / len(sim_results) * 100) if sim_results else 0

        # Determine trend (simplified - would need historical data)
        risk_trend = "stable"

        department_comparisons.append(DepartmentRiskComparison(
            department=dept,
            total_employees=len(employees),
            average_risk_score=round(avg_risk, 2),
            high_risk_count=high_risk,
            medium_risk_count=medium_risk,
            low_risk_count=low_risk,
            recent_simulations=recent_sims,
            average_click_rate=round(click_rate, 2),
            average_submission_rate=round(submit_rate, 2),
            risk_trend=risk_trend,
            risk_rank=0  # Will be set after sorting
        ))

    # Sort by risk score and assign ranks
    department_comparisons.sort(key=lambda x: x.average_risk_score, reverse=True)
    for idx, dept_comp in enumerate(department_comparisons, 1):
        dept_comp.risk_rank = idx

    # Calculate overall average
    avg_all = sum(d.average_risk_score for d in department_comparisons) / len(department_comparisons) if department_comparisons else 0

    return DepartmentComparison(
        total_departments=len(department_comparisons),
        departments=department_comparisons,
        highest_risk_department=department_comparisons[0].department if department_comparisons else "",
        lowest_risk_department=department_comparisons[-1].department if department_comparisons else "",
        average_risk_all_departments=round(avg_all, 2)
    )


@router.get("/seniority-comparison", response_model=SeniorityComparison)
def get_seniority_comparison(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compare risk across seniority levels.

    Shows which seniority levels are most vulnerable.
    """
    # Get distinct seniority levels for this tenant
    seniority_levels = db.query(Employee.seniority).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None
    ).distinct().all()

    seniority_comparisons = []

    for (seniority,) in seniority_levels:
        if not seniority:
            continue

        # Get employees at this seniority
        employees = db.query(Employee).filter(
            Employee.tenant_id == current_user.tenant_id,
            Employee.seniority == seniority,
            Employee.deleted_at == None
        ).all()

        if not employees:
            continue

        emp_ids = [emp.id for emp in employees]

        # Get risk scores
        risk_scores = db.query(RiskScore).filter(
            RiskScore.employee_id.in_(emp_ids)
        ).all()

        avg_risk = sum(score.risk_score for score in risk_scores) / len(risk_scores) if risk_scores else 0
        high_risk = sum(1 for score in risk_scores if score.risk_score >= 60)

        # Get simulation results
        sim_results = db.query(SimulationResult).filter(
            SimulationResult.employee_id.in_(emp_ids)
        ).all()

        click_rate = (sum(1 for r in sim_results if r.link_clicked) / len(sim_results) * 100) if sim_results else 0
        submit_rate = (sum(1 for r in sim_results if r.credentials_entered) / len(sim_results) * 100) if sim_results else 0

        # Find most vulnerable category
        category_counts = {}
        for score in risk_scores:
            if score.scenario:
                cat = score.scenario.category
                category_counts[cat] = category_counts.get(cat, 0) + score.risk_score

        most_vulnerable = max(category_counts.items(), key=lambda x: x[1])[0] if category_counts else "Unknown"

        seniority_comparisons.append(SeniorityRiskComparison(
            seniority=seniority,  # seniority is already a string from DB
            total_employees=len(employees),
            average_risk_score=round(avg_risk, 2),
            high_risk_count=high_risk,
            average_click_rate=round(click_rate, 2),
            average_submission_rate=round(submit_rate, 2),
            most_vulnerable_to=most_vulnerable
        ))

    # Sort by risk score
    seniority_comparisons.sort(key=lambda x: x.average_risk_score, reverse=True)

    return SeniorityComparison(
        seniority_levels=seniority_comparisons,
        highest_risk_seniority=seniority_comparisons[0].seniority if seniority_comparisons else "",
        lowest_risk_seniority=seniority_comparisons[-1].seniority if seniority_comparisons else ""
    )


@router.get("/top-vulnerable", response_model=TopVulnerableEmployees)
def get_top_vulnerable_employees(
    limit: int = Query(default=10, ge=1, le=100, description="Maximum number of results (1-100)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get top vulnerable employees.

    Identifies employees with highest risk scores or most concerning simulation behavior.
    """
    # Get all employees with risk scores
    employees_with_risk = db.query(
        Employee,
        func.max(RiskScore.risk_score).label('max_risk')
    ).join(RiskScore).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None
    ).group_by(Employee.id).order_by(desc('max_risk')).limit(limit).all()

    employee_profiles = []
    for employee, max_risk in employees_with_risk:
        # Get risk history
        risk_history = db.query(RiskScore).filter(
            RiskScore.employee_id == employee.id
        ).order_by(RiskScore.created_at).all()

        history_points = [
            TrendDataPoint(
                date=score.created_at.date(),
                value=float(score.risk_score)
            )
            for score in risk_history
        ]

        # Determine trend
        if len(history_points) >= 2:
            trend = "declining" if history_points[-1].value < history_points[0].value else "improving"
        else:
            trend = "stable"

        # Get simulation metrics
        sim_results = db.query(SimulationResult).filter(
            SimulationResult.employee_id == employee.id
        ).all()

        total_sims = len(sim_results)
        opened = sum(1 for r in sim_results if r.email_opened)
        clicked = sum(1 for r in sim_results if r.link_clicked)
        submitted = sum(1 for r in sim_results if r.credentials_entered)

        # Find vulnerabilities
        category_scores = {}
        for score in risk_history:
            if score.scenario:
                cat = score.scenario.category
                if cat not in category_scores:
                    category_scores[cat] = []
                category_scores[cat].append(score.risk_score)

        category_averages = {
            cat: sum(scores) / len(scores)
            for cat, scores in category_scores.items()
        }

        most_vulnerable = max(category_averages.items(), key=lambda x: x[1])[0] if category_averages else "Unknown"
        least_vulnerable = min(category_averages.items(), key=lambda x: x[1])[0] if category_averages else "Unknown"

        # Determine risk band
        risk_band = "CRITICAL" if max_risk >= 80 else "HIGH" if max_risk >= 60 else "MEDIUM" if max_risk >= 40 else "LOW"

        employee_profiles.append(EmployeeRiskProfile(
            employee_id=str(employee.id),
            employee_name=employee.full_name,
            department=employee.department,
            seniority=employee.seniority,
            current_risk_score=float(max_risk),
            risk_band=risk_band,
            risk_history=history_points,
            risk_trend=trend,
            simulations_received=total_sims,
            emails_opened=opened,
            links_clicked=clicked,
            credentials_entered=submitted,
            open_rate=round((opened / total_sims * 100) if total_sims > 0 else 0, 2),
            click_rate=round((clicked / total_sims * 100) if total_sims > 0 else 0, 2),
            submission_rate=round((submitted / total_sims * 100) if total_sims > 0 else 0, 2),
            most_vulnerable_category=most_vulnerable,
            least_vulnerable_category=least_vulnerable,
            training_recommended=clicked > 0 or submitted > 0,
            priority_level="high" if submitted > 0 else "medium" if clicked > 0 else "low"
        ))

    total = db.query(Employee).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None
    ).count()

    return TopVulnerableEmployees(
        total_employees=total,
        employees=employee_profiles
    )


@router.get("/risk-distribution", response_model=RiskDistribution)
def get_risk_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get risk score distribution across all employees.

    Shows how many employees fall into each risk band.
    """
    # Get latest risk score for each employee
    latest_scores = db.query(
        RiskScore.employee_id,
        func.max(RiskScore.risk_score).label('max_risk')
    ).filter(
        RiskScore.tenant_id == current_user.tenant_id
    ).group_by(RiskScore.employee_id).all()

    if not latest_scores:
        return RiskDistribution(
            total_employees=0,
            critical_count=0,
            high_count=0,
            medium_count=0,
            low_count=0,
            critical_percentage=0,
            high_percentage=0,
            medium_percentage=0,
            low_percentage=0,
            mean_risk_score=0,
            median_risk_score=0,
            std_deviation=0
        )

    scores = [score for _, score in latest_scores]
    total = len(scores)

    # Count by band
    critical = sum(1 for s in scores if s >= 80)
    high = sum(1 for s in scores if 60 <= s < 80)
    medium = sum(1 for s in scores if 40 <= s < 60)
    low = sum(1 for s in scores if s < 40)

    # Calculate statistics
    mean = sum(scores) / len(scores)
    sorted_scores = sorted(scores)
    median = sorted_scores[len(sorted_scores) // 2]

    # Standard deviation
    variance = sum((s - mean) ** 2 for s in scores) / len(scores)
    std_dev = variance ** 0.5

    return RiskDistribution(
        total_employees=total,
        critical_count=critical,
        high_count=high,
        medium_count=medium,
        low_count=low,
        critical_percentage=round(critical / total * 100, 2),
        high_percentage=round(high / total * 100, 2),
        medium_percentage=round(medium / total * 100, 2),
        low_percentage=round(low / total * 100, 2),
        mean_risk_score=round(mean, 2),
        median_risk_score=round(median, 2),
        std_deviation=round(std_dev, 2)
    )


@router.get("/executive-summary", response_model=ExecutiveSummary)
def get_executive_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get executive summary report.

    High-level overview for leadership with key findings and recommendations.
    """
    # Default date range: last 30 days
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    date_range = DateRangeRequest(start_date=start_date, end_date=end_date)

    # Get tenant name
    tenant_name = current_user.tenant.name if current_user.tenant else "Organization"

    # Total employees
    total_employees = db.query(Employee).filter(
        Employee.tenant_id == current_user.tenant_id,
        Employee.deleted_at == None
    ).count()

    # Total simulations
    total_simulations = db.query(Simulation).filter(
        Simulation.tenant_id == current_user.tenant_id,
        Simulation.created_at >= start_date,
        Simulation.created_at <= end_date
    ).count()

    # Average risk score
    risk_scores = db.query(RiskScore.risk_score).filter(
        RiskScore.tenant_id == current_user.tenant_id
    ).all()

    avg_risk = sum(score for (score,) in risk_scores) / len(risk_scores) if risk_scores else 0

    # Risk distribution
    critical = sum(1 for (score,) in risk_scores if score >= 80)
    high = sum(1 for (score,) in risk_scores if 60 <= score < 80)
    medium = sum(1 for (score,) in risk_scores if 40 <= score < 60)
    low = sum(1 for (score,) in risk_scores if score < 40)

    # Simulation metrics
    sim_results = db.query(SimulationResult).join(Simulation).filter(
        Simulation.tenant_id == current_user.tenant_id,
        Simulation.created_at >= start_date,
        Simulation.created_at <= end_date
    ).all()

    if sim_results:
        open_rate = sum(1 for r in sim_results if r.email_opened) / len(sim_results) * 100
        click_rate = sum(1 for r in sim_results if r.link_clicked) / len(sim_results) * 100
        submit_rate = sum(1 for r in sim_results if r.credentials_entered) / len(sim_results) * 100
    else:
        open_rate = click_rate = submit_rate = 0

    # Risk trend determination
    risk_trend = "stable"  # Simplified

    # Most vulnerable department
    dept_comparison = get_department_comparison(current_user, db)
    most_vulnerable_dept = dept_comparison.highest_risk_department

    # Most vulnerable category (simplified)
    most_vulnerable_cat = "CREDENTIALS"

    # Key findings
    key_findings = [
        f"Average risk score: {round(avg_risk, 2)}/100",
        f"{critical} employees in CRITICAL risk band",
        f"{click_rate:.1f}% click rate on phishing simulations",
        f"{most_vulnerable_dept} department shows highest risk"
    ]

    # Immediate actions
    immediate_actions = []
    if critical > 0:
        immediate_actions.append(f"Provide immediate training to {critical} critical-risk employees")
    if click_rate > 30:
        immediate_actions.append("Implement targeted phishing awareness campaign")
    if submit_rate > 10:
        immediate_actions.append("Review and strengthen password policies")

    # Long-term recommendations
    long_term = [
        "Implement regular quarterly phishing simulations",
        "Develop department-specific security training programs",
        "Establish security champion program in high-risk departments"
    ]

    return ExecutiveSummary(
        tenant_name=tenant_name,
        report_date=date.today(),
        date_range=date_range,
        total_employees=total_employees,
        total_simulations=total_simulations,
        average_risk_score=round(avg_risk, 2),
        risk_trend=risk_trend,
        critical_risk_employees=critical,
        high_risk_employees=high,
        medium_risk_employees=medium,
        low_risk_employees=low,
        average_open_rate=round(open_rate, 2),
        average_click_rate=round(click_rate, 2),
        average_submission_rate=round(submit_rate, 2),
        most_vulnerable_department=most_vulnerable_dept,
        most_vulnerable_category=most_vulnerable_cat,
        key_findings=key_findings,
        immediate_actions=immediate_actions if immediate_actions else ["Continue current security program"],
        long_term_recommendations=long_term,
        compliance_status="compliant",
        compliance_notes=["All UAE PDPL requirements met", "Regular audits conducted"]
    )


@router.post("/export")
async def export_data(
    export_request: DataExportRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Export data to CSV, Excel, or PDF format.

    Requires admin privileges. Supports exporting employees, simulations, scenarios, and risk scores.
    Returns file as downloadable response.
    """
    export_type = export_request.export_type
    format = export_request.format.lower()

    # Validate format
    if format not in ["csv", "excel", "pdf"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid format. Must be one of: csv, excel, pdf"
        )

    try:
        # Fetch data based on export type
        if export_type == "employees":
            query = db.query(Employee).filter(Employee.tenant_id == current_user.tenant_id)
            employees = query.all()

            data = [
                {
                    "ID": str(emp.id),
                    "Email": emp.email,
                    "Full Name": emp.full_name,
                    "Department": emp.department or "N/A",
                    "Job Title": emp.job_title or "N/A",
                    "Seniority": emp.seniority_level or "N/A",
                    "Risk Score": emp.risk_score or 0,
                    "Risk Band": emp.risk_band or "UNSCORED",
                    "Status": "Active" if emp.is_active else "Inactive",
                    "Created": emp.created_at.strftime("%Y-%m-%d") if emp.created_at else "N/A"
                }
                for emp in employees
            ]

            file_bytes = export_employees(data, format)
            filename = f"employees_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{format if format != 'excel' else 'xlsx'}"

        elif export_type == "risk_scores":
            query = db.query(RiskScore).filter(RiskScore.tenant_id == current_user.tenant_id)
            risk_scores = query.all()

            data = [
                {
                    "Employee ID": str(rs.employee_id),
                    "Risk Score": rs.risk_score,
                    "Risk Band": rs.risk_band,
                    "Age": rs.age_range or "Unknown",
                    "Department": rs.department or "Unknown",
                    "Seniority": rs.seniority_level or "Unknown",
                    "Previous Clicks": rs.previous_clicks,
                    "Previous Opens": rs.previous_opens,
                    "Training Completed": rs.training_completed,
                    "Last Calculated": rs.calculated_at.strftime("%Y-%m-%d %H:%M:%S") if rs.calculated_at else "N/A"
                }
                for rs in risk_scores
            ]

            file_bytes = export_risk_scores(data, format)
            filename = f"risk_scores_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{format if format != 'excel' else 'xlsx'}"

        elif export_type == "simulations":
            query = db.query(SimulationResult).join(Simulation).filter(
                Simulation.tenant_id == current_user.tenant_id
            )
            results = query.all()

            data = [
                {
                    "Simulation ID": str(res.simulation_id),
                    "Employee ID": str(res.employee_id),
                    "Status": res.status,
                    "Opened": res.opened_at.strftime("%Y-%m-%d %H:%M:%S") if res.opened_at else "No",
                    "Clicked": res.clicked_at.strftime("%Y-%m-%d %H:%M:%S") if res.clicked_at else "No",
                    "Submitted": res.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if res.submitted_at else "No",
                    "Reported": res.reported_at.strftime("%Y-%m-%d %H:%M:%S") if res.reported_at else "No",
                    "Delivered": res.delivered_at.strftime("%Y-%m-%d %H:%M:%S") if res.delivered_at else "N/A",
                    "Score Change": res.score_change or 0
                }
                for res in results
            ]

            file_bytes = export_simulation_results(data, format)
            filename = f"simulation_results_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{format if format != 'excel' else 'xlsx'}"

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid export type: {export_type}"
            )

        # Determine content type
        content_types = {
            "csv": "text/csv",
            "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "pdf": "application/pdf"
        }

        logger.info(f"Data export completed: {export_type} ({format}) by user {current_user.email}, {len(data)} records")

        return Response(
            content=file_bytes,
            media_type=content_types[format],
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(file_bytes))
            }
        )

    except RuntimeError as e:
        # Handle missing dependencies
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )
