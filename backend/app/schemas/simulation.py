"""
Simulation schemas (Pydantic models for simulation campaigns and results).
"""

from typing import Optional, List, Dict
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class SimulationBase(BaseModel):
    """Base simulation schema."""
    name: str = Field(..., min_length=1, max_length=255, description="Simulation campaign name")
    description: Optional[str] = Field(None, description="Campaign description")
    scenario_id: str = Field(..., description="Scenario UUID to use")

    # Targeting
    target_employee_ids: List[str] = Field(..., min_items=1, description="List of employee UUIDs to target")

    # Scheduling
    scheduled_at: Optional[datetime] = Field(None, description="When to send emails (null = immediate)")

    # Configuration
    send_immediately: bool = Field(default=True, description="Send immediately or schedule")
    track_opens: bool = Field(default=True, description="Track email opens")
    track_clicks: bool = Field(default=True, description="Track link clicks")
    track_credentials: bool = Field(default=True, description="Track credential submissions")


class SimulationCreate(SimulationBase):
    """Schema for creating a new simulation."""
    pass


class SimulationUpdate(BaseModel):
    """Schema for updating a simulation (limited fields)."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class SimulationResponse(BaseModel):
    """Schema for simulation response."""
    id: str
    tenant_id: str
    name: str
    description: Optional[str]
    scenario_id: str
    scenario_name: Optional[str]  # Joined from scenario

    # Status
    status: str  # draft, scheduled, in_progress, completed, cancelled

    # Targeting
    total_targets: int

    # Scheduling
    scheduled_at: Optional[datetime]
    sent_at: Optional[datetime]
    completed_at: Optional[datetime]

    # Configuration
    send_immediately: bool
    track_opens: bool
    track_clicks: bool
    track_credentials: bool

    # Metadata
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SimulationListResponse(BaseModel):
    """Schema for paginated simulation list."""
    total: int
    page: int
    page_size: int
    simulations: List[SimulationResponse]


class SimulationSearchRequest(BaseModel):
    """Schema for simulation search/filter."""
    query: Optional[str] = Field(None, description="Search query (name, description)")
    status: Optional[str] = None
    scenario_id: Optional[str] = None
    created_by: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=500)
    sort_by: Optional[str] = Field("created_at", description="Field to sort by")
    sort_order: Optional[str] = Field("desc", description="Sort order: asc or desc")


class SimulationResultBase(BaseModel):
    """Base simulation result schema."""
    simulation_id: str
    employee_id: str

    # Engagement tracking
    email_sent: bool = Field(default=False)
    email_sent_at: Optional[datetime] = None
    email_opened: bool = Field(default=False)
    email_opened_at: Optional[datetime] = None
    link_clicked: bool = Field(default=False)
    link_clicked_at: Optional[datetime] = None
    credentials_submitted: bool = Field(default=False)
    credentials_submitted_at: Optional[datetime] = None

    # User agent tracking
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None

    # Calculated metrics
    time_to_open: Optional[int] = Field(None, description="Seconds to open email")
    time_to_click: Optional[int] = Field(None, description="Seconds to click link")
    time_to_submit: Optional[int] = Field(None, description="Seconds to submit credentials")


class SimulationResultCreate(SimulationResultBase):
    """Schema for creating simulation result."""
    pass


class SimulationResultResponse(SimulationResultBase):
    """Schema for simulation result response."""
    id: str
    tenant_id: str
    employee_name: Optional[str]  # Joined from employee
    employee_email: Optional[str]  # Joined from employee
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SimulationResultListResponse(BaseModel):
    """Schema for paginated simulation result list."""
    total: int
    page: int
    page_size: int
    results: List[SimulationResultResponse]


class SimulationStatistics(BaseModel):
    """Schema for simulation statistics."""
    simulation_id: str
    simulation_name: str

    # Targeting
    total_targets: int

    # Engagement metrics
    emails_sent: int
    emails_opened: int
    links_clicked: int
    credentials_submitted: int

    # Percentages
    open_rate: float
    click_rate: float
    submission_rate: float

    # Time metrics (averages in seconds)
    avg_time_to_open: Optional[float]
    avg_time_to_click: Optional[float]
    avg_time_to_submit: Optional[float]

    # Risk insights
    high_risk_employees: int  # Employees who clicked or submitted
    medium_risk_employees: int  # Employees who opened
    low_risk_employees: int  # Employees who didn't engage


class SimulationDetailedStatistics(BaseModel):
    """Schema for detailed simulation statistics with breakdowns."""
    simulation_id: str
    simulation_name: str
    scenario_name: str
    status: str

    # Overall metrics
    total_targets: int
    emails_sent: int
    emails_opened: int
    links_clicked: int
    credentials_submitted: int

    # Rates
    open_rate: float
    click_rate: float
    submission_rate: float

    # Engagement breakdown
    engagement_by_department: Dict[str, Dict[str, int]]
    engagement_by_seniority: Dict[str, Dict[str, int]]
    engagement_by_age_range: Dict[str, Dict[str, int]]

    # Time metrics
    avg_time_to_open: Optional[float]
    avg_time_to_click: Optional[float]
    avg_time_to_submit: Optional[float]

    # Top vulnerable employees
    most_vulnerable: List[Dict[str, str]]  # Top 10 employees who submitted


class EmailTrackingEvent(BaseModel):
    """Schema for tracking email events (opens, clicks, submissions)."""
    simulation_id: str
    employee_id: str
    event_type: str  # open, click, submit
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class LaunchSimulationRequest(BaseModel):
    """Schema for launching a simulation."""
    simulation_id: str
    send_immediately: bool = Field(default=True)
    scheduled_at: Optional[datetime] = None


class LaunchSimulationResponse(BaseModel):
    """Schema for launch simulation response."""
    simulation_id: str
    status: str
    message: str
    emails_to_send: int
    scheduled_at: Optional[datetime]
