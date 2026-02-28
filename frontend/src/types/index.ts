/**
 * TypeScript type definitions for MAIDAR API
 */

// User and Auth Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id: string | null;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Employee Types
export interface Employee {
  id: string;
  email: string;
  full_name: string;
  department: string;
  seniority: string;
  technical_literacy: number;
  age_range?: string;
  language?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSearchResponse {
  employees: Employee[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EmployeeStatistics {
  total_employees: number;
  avg_technical_literacy: number;
  by_department: Record<string, number>;
  by_seniority: Record<string, number>;
}

// Scenario Types
export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  language: string;
  email_subject: string;
  email_body_html: string;
  email_body_text: string;
  sender_name: string;
  sender_email: string;
  has_link: boolean;
  has_attachment: boolean;
  has_credential_form: boolean;
  is_template?: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ScenarioSearchResponse {
  scenarios: Scenario[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Simulation Types
export interface Simulation {
  id: string;
  name: string;
  description?: string;
  scenario_id: string;
  scenario_name: string;
  status: string;
  total_targets: number;
  created_at: string;
  scheduled_at?: string;
}

export interface SimulationSearchResponse {
  simulations: Simulation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SimulationResult {
  id: string;
  simulation_id: string;
  employee_id: string;
  employee_name: string;
  email_sent_at: string;
  email_opened: boolean;
  link_clicked: boolean;
  credentials_submitted: boolean;
  time_to_open?: number;
  time_to_click?: number;
}

export interface SimulationStatistics {
  total_sent: number;
  email_opened_count: number;
  link_clicked_count: number;
  credentials_submitted_count: number;
  open_rate: number;
  click_rate: number;
  compromise_rate: number;
}

// Risk Types
export interface RiskScore {
  id: string;
  employee_id: string;
  scenario_id: string;
  risk_score: number;
  likelihood: number;
  impact: number;
  created_at: string;
}

// Analytics Types
export interface RiskDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ExecutiveSummary {
  total_employees: number;
  average_risk_score: number;
  high_risk_employees: number;
  recent_simulations: number;
  risk_distribution: RiskDistribution;
}

export interface ApiError {
  detail: string;
  status: number;
}
