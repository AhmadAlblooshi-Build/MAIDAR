"""
Analytics schemas (Pydantic models for advanced analytics and reporting).
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID

from pydantic import BaseModel, Field


class DateRangeRequest(BaseModel):
    """Schema for date range filtering."""
    start_date: date
    end_date: date


class TrendDataPoint(BaseModel):
    """Schema for a single data point in a trend."""
    date: date
    value: float
    label: Optional[str] = None


class RiskTrendAnalysis(BaseModel):
    """Schema for risk trend analysis over time."""
    tenant_id: str
    date_range: DateRangeRequest

    # Overall trends
    overall_risk_trend: List[TrendDataPoint]
    average_risk_score: float
    risk_change_percentage: float  # Positive = worse, negative = better

    # By category
    risk_by_category: Dict[str, List[TrendDataPoint]]

    # By department
    risk_by_department: Dict[str, List[TrendDataPoint]]

    # By seniority
    risk_by_seniority: Dict[str, List[TrendDataPoint]]


class DepartmentRiskComparison(BaseModel):
    """Schema for department risk comparison."""
    department: str
    total_employees: int
    average_risk_score: float
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    recent_simulations: int
    average_click_rate: float
    average_submission_rate: float
    risk_trend: str  # improving, declining, stable
    risk_rank: int  # 1 = highest risk


class DepartmentComparison(BaseModel):
    """Schema for comparing all departments."""
    total_departments: int
    departments: List[DepartmentRiskComparison]
    highest_risk_department: str
    lowest_risk_department: str
    average_risk_all_departments: float


class SeniorityRiskComparison(BaseModel):
    """Schema for seniority level risk comparison."""
    seniority: str
    total_employees: int
    average_risk_score: float
    high_risk_count: int
    average_click_rate: float
    average_submission_rate: float
    most_vulnerable_to: str  # Category they're most vulnerable to


class SeniorityComparison(BaseModel):
    """Schema for comparing all seniority levels."""
    seniority_levels: List[SeniorityRiskComparison]
    highest_risk_seniority: str
    lowest_risk_seniority: str


class EmployeeRiskProfile(BaseModel):
    """Schema for individual employee risk profile."""
    employee_id: str
    employee_name: str
    department: str
    seniority: str

    # Current risk
    current_risk_score: float
    risk_band: str  # CRITICAL, HIGH, MEDIUM, LOW

    # Historical data
    risk_history: List[TrendDataPoint]
    risk_trend: str  # improving, declining, stable

    # Simulation performance
    simulations_received: int
    emails_opened: int
    links_clicked: int
    credentials_submitted: int
    open_rate: float
    click_rate: float
    submission_rate: float

    # Vulnerabilities
    most_vulnerable_category: str
    least_vulnerable_category: str

    # Recommendations
    training_recommended: bool
    priority_level: str  # high, medium, low


class TopVulnerableEmployees(BaseModel):
    """Schema for top vulnerable employees list."""
    date_range: Optional[DateRangeRequest] = None
    total_employees: int
    employees: List[EmployeeRiskProfile]


class SimulationPerformance(BaseModel):
    """Schema for simulation campaign performance."""
    simulation_id: str
    simulation_name: str
    scenario_category: str
    launch_date: datetime

    # Metrics
    total_targets: int
    open_rate: float
    click_rate: float
    submission_rate: float

    # Comparison to tenant average
    open_rate_vs_average: float  # Percentage difference
    click_rate_vs_average: float
    submission_rate_vs_average: float

    # Performance rating
    effectiveness_score: float  # 0-100
    performance_rating: str  # excellent, good, average, poor


class SimulationEffectiveness(BaseModel):
    """Schema for overall simulation effectiveness."""
    total_simulations: int
    date_range: DateRangeRequest
    simulations: List[SimulationPerformance]

    # Overall metrics
    average_open_rate: float
    average_click_rate: float
    average_submission_rate: float

    # Trends
    effectiveness_trend: str  # improving, declining, stable

    # Best/worst
    most_effective_simulation: str
    least_effective_simulation: str


class VulnerabilityHeatmap(BaseModel):
    """Schema for vulnerability heatmap data."""
    # Matrix: [category][seniority] = risk_score
    heatmap_data: Dict[str, Dict[str, float]]

    # Highest risk combinations
    highest_risk_combinations: List[Dict[str, Any]]

    # Metadata
    last_updated: datetime


class RiskDistribution(BaseModel):
    """Schema for risk score distribution."""
    total_employees: int

    # Distribution by band
    critical_count: int  # 80-100
    high_count: int      # 60-79
    medium_count: int    # 40-59
    low_count: int       # 0-39

    # Percentages
    critical_percentage: float
    high_percentage: float
    medium_percentage: float
    low_percentage: float

    # Statistics
    mean_risk_score: float
    median_risk_score: float
    std_deviation: float


class TrainingEffectiveness(BaseModel):
    """Schema for measuring training effectiveness."""
    department: Optional[str] = None
    date_range: DateRangeRequest

    # Pre-training metrics
    pre_training_risk_score: float
    pre_training_click_rate: float

    # Post-training metrics
    post_training_risk_score: float
    post_training_click_rate: float

    # Improvement
    risk_score_improvement: float  # Percentage
    click_rate_improvement: float  # Percentage

    # Effectiveness rating
    effectiveness_rating: str  # highly_effective, effective, minimal, ineffective


class PredictiveRiskModel(BaseModel):
    """Schema for predictive risk analysis."""
    employee_id: str
    employee_name: str
    current_risk_score: float

    # Predictions (30/60/90 days)
    predicted_risk_30_days: float
    predicted_risk_60_days: float
    predicted_risk_90_days: float

    # Confidence
    prediction_confidence: float  # 0-1

    # Risk factors
    increasing_risk_factors: List[str]
    decreasing_risk_factors: List[str]

    # Recommendations
    recommended_actions: List[str]


class ExecutiveSummary(BaseModel):
    """Schema for executive summary report."""
    tenant_name: str
    report_date: date
    date_range: DateRangeRequest

    # Key metrics
    total_employees: int
    total_simulations: int
    average_risk_score: float
    risk_trend: str  # improving, declining, stable

    # Risk distribution
    critical_risk_employees: int
    high_risk_employees: int
    medium_risk_employees: int
    low_risk_employees: int

    # Simulation metrics
    average_open_rate: float
    average_click_rate: float
    average_submission_rate: float

    # Top vulnerabilities
    most_vulnerable_department: str
    most_vulnerable_category: str

    # Recommendations
    key_findings: List[str]
    immediate_actions: List[str]
    long_term_recommendations: List[str]

    # Compliance
    compliance_status: str  # compliant, needs_attention, non_compliant
    compliance_notes: List[str]


class ReportGenerationRequest(BaseModel):
    """Schema for requesting report generation."""
    report_type: str  # executive_summary, department_analysis, employee_detail, simulation_report
    format: str = Field(default="pdf", description="pdf or csv")
    date_range: Optional[DateRangeRequest] = None

    # Filters
    department: Optional[str] = None
    employee_ids: Optional[List[str]] = None
    simulation_ids: Optional[List[str]] = None

    # Options
    include_charts: bool = True
    include_recommendations: bool = True
    language: str = "en"


class ReportGenerationResponse(BaseModel):
    """Schema for report generation response."""
    report_id: str
    report_type: str
    format: str
    status: str  # generating, completed, failed
    download_url: Optional[str] = None
    generated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    file_size_bytes: Optional[int] = None


class DataExportRequest(BaseModel):
    """Schema for data export request."""
    export_type: str  # employees, simulations, scenarios, risk_scores, audit_logs, all
    format: str = Field(default="csv", description="csv or json")
    date_range: Optional[DateRangeRequest] = None

    # Filters
    include_deleted: bool = False
    include_sensitive_data: bool = False  # Requires super admin


class DataExportResponse(BaseModel):
    """Schema for data export response."""
    export_id: str
    export_type: str
    format: str
    status: str  # processing, completed, failed
    download_url: Optional[str] = None
    record_count: Optional[int] = None
    file_size_bytes: Optional[int] = None
    expires_at: Optional[datetime] = None


class ComplianceReport(BaseModel):
    """Schema for UAE PDPL compliance report."""
    tenant_id: str
    report_date: date
    reporting_period: DateRangeRequest

    # Data inventory
    total_employees: int
    total_users: int
    data_retention_days: int

    # Processing activities
    simulations_run: int
    emails_sent: int
    data_access_events: int

    # Security measures
    encryption_enabled: bool
    tls_enabled: bool
    mfa_enabled: bool
    access_controls_active: bool

    # Rights exercised
    data_access_requests: int
    data_deletion_requests: int
    data_correction_requests: int

    # Audit trail
    audit_logs_available: bool
    audit_log_retention_days: int

    # Compliance status
    compliant: bool
    issues_found: List[str]
    remediation_actions: List[str]
