-- MAIDAR Database Schema
-- Compliant with UAE Federal Decree-Law No. 45 of 2021
-- AES-256 encryption enabled at database level

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TENANTS - Multi-tenant isolation
-- ============================================================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    country_code VARCHAR(3) DEFAULT 'UAE',
    data_residency_region VARCHAR(50) DEFAULT 'UAE',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- USERS - RBAC (Platform Super Admin, Tenant Admin, Analyst)
-- ============================================================================
CREATE TYPE user_role AS ENUM ('PLATFORM_SUPER_ADMIN', 'TENANT_ADMIN', 'ANALYST');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Bcrypt hashed
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'ANALYST',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- EMPLOYEES - Core data model for risk assessment
-- ============================================================================
CREATE TYPE age_range AS ENUM ('18-25', '26-35', '36-50', '51-60', '60+');
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
CREATE TYPE seniority AS ENUM ('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'EXECUTIVE');

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Identifiers (minimally collected)
    employee_id VARCHAR(100), -- External employee ID from org
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL, -- For personalization

    -- Likelihood factors
    age_range age_range NOT NULL,
    gender gender,
    languages TEXT[] NOT NULL DEFAULT '{}', -- Array of language codes
    technical_literacy INTEGER NOT NULL CHECK (technical_literacy BETWEEN 0 AND 10),

    -- Impact factors
    seniority seniority NOT NULL,
    department VARCHAR(100) NOT NULL,
    job_title VARCHAR(255),

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE, -- Right to erasure

    UNIQUE(tenant_id, email),
    UNIQUE(tenant_id, employee_id)
);

CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_active ON employees(tenant_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_employees_department ON employees(tenant_id, department);
CREATE INDEX idx_employees_seniority ON employees(tenant_id, seniority);
CREATE INDEX idx_employees_age_range ON employees(tenant_id, age_range);

-- Row-level security for tenant isolation
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON employees
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================
-- SCENARIOS - Phishing scenario types
-- ============================================================================
CREATE TYPE scenario_category AS ENUM ('BEC', 'CREDENTIALS', 'DATA', 'MALWARE');

CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    category scenario_category NOT NULL,
    language VARCHAR(10) NOT NULL, -- ISO 639-1 code (e.g., 'en', 'ar')

    -- Template content (for AI Scenario Lab)
    subject_template TEXT,
    body_template TEXT,

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scenarios_tenant ON scenarios(tenant_id);
CREATE INDEX idx_scenarios_category ON scenarios(category);
CREATE INDEX idx_scenarios_language ON scenarios(language);

-- ============================================================================
-- RISK SCORES - Calculated risk scores with explainability
-- ============================================================================
CREATE TYPE risk_band AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,

    -- Core scores (0-1 range, stored as DECIMAL for precision)
    likelihood DECIMAL(5,4) NOT NULL CHECK (likelihood BETWEEN 0 AND 1),
    impact DECIMAL(5,4) NOT NULL CHECK (impact BETWEEN 0 AND 1),

    -- Final score (0-100)
    risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    risk_band risk_band NOT NULL,

    -- Explainability breakdown (stored as JSONB)
    likelihood_breakdown JSONB NOT NULL,
    impact_breakdown JSONB NOT NULL,

    -- Metadata
    algorithm_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(employee_id, scenario_id, algorithm_version)
);

CREATE INDEX idx_risk_scores_tenant ON risk_scores(tenant_id);
CREATE INDEX idx_risk_scores_employee ON risk_scores(employee_id);
CREATE INDEX idx_risk_scores_scenario ON risk_scores(scenario_id);
CREATE INDEX idx_risk_scores_band ON risk_scores(tenant_id, risk_band);
CREATE INDEX idx_risk_scores_score ON risk_scores(tenant_id, risk_score DESC);

-- ============================================================================
-- SIMULATIONS - Phishing simulation campaigns
-- ============================================================================
CREATE TYPE simulation_status AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES scenarios(id),

    name VARCHAR(255) NOT NULL,
    description TEXT,
    status simulation_status DEFAULT 'DRAFT',

    -- Targeting
    target_employee_ids UUID[] NOT NULL, -- Array of employee IDs

    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_simulations_tenant ON simulations(tenant_id);
CREATE INDEX idx_simulations_status ON simulations(status);
CREATE INDEX idx_simulations_scheduled ON simulations(scheduled_at) WHERE status = 'SCHEDULED';

-- ============================================================================
-- SIMULATION RESULTS - Employee interaction tracking
-- ============================================================================
CREATE TYPE interaction_type AS ENUM (
    'EMAIL_OPENED',
    'LINK_CLICKED',
    'CREDENTIALS_ENTERED',
    'ATTACHMENT_DOWNLOADED',
    'REPORTED_AS_PHISHING'
);

CREATE TABLE simulation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Email delivery
    email_sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    email_delivered BOOLEAN DEFAULT FALSE,

    -- Interactions (array of interaction events)
    interactions JSONB DEFAULT '[]'::JSONB,

    -- Outcome
    fell_for_simulation BOOLEAN DEFAULT FALSE,
    reported_as_phishing BOOLEAN DEFAULT FALSE,

    -- Timing metrics
    time_to_first_interaction INTERVAL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(simulation_id, employee_id)
);

CREATE INDEX idx_simulation_results_tenant ON simulation_results(tenant_id);
CREATE INDEX idx_simulation_results_simulation ON simulation_results(simulation_id);
CREATE INDEX idx_simulation_results_employee ON simulation_results(employee_id);
CREATE INDEX idx_simulation_results_outcome ON simulation_results(fell_for_simulation);

-- ============================================================================
-- AUDIT LOGS - Comprehensive audit trail for UAE compliance
-- ============================================================================
CREATE TYPE audit_action AS ENUM (
    'EMPLOYEE_CREATED',
    'EMPLOYEE_UPDATED',
    'EMPLOYEE_DELETED',
    'EMPLOYEE_EXPORTED',
    'RISK_SCORE_CALCULATED',
    'SIMULATION_CREATED',
    'SIMULATION_LAUNCHED',
    'SIMULATION_COMPLETED',
    'USER_LOGIN',
    'USER_LOGOUT',
    'DATA_EXPORTED',
    'SETTINGS_CHANGED'
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),

    action audit_action NOT NULL,
    resource_type VARCHAR(50), -- e.g., 'employee', 'simulation'
    resource_id UUID,

    -- Details
    details JSONB,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================================================
-- TECHNICAL LITERACY SURVEYS - Survey responses
-- ============================================================================
CREATE TABLE tech_literacy_surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Survey responses (JSONB for flexibility)
    responses JSONB NOT NULL,

    -- Calculated score
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),

    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(employee_id, completed_at)
);

CREATE INDEX idx_tech_surveys_employee ON tech_literacy_surveys(employee_id);

-- ============================================================================
-- CONFIGURATION - Lookup tables for risk scoring
-- ============================================================================

-- Age modifiers
CREATE TABLE config_age_modifiers (
    age_range age_range PRIMARY KEY,
    modifier DECIMAL(3,2) NOT NULL CHECK (modifier BETWEEN 0 AND 1)
);

INSERT INTO config_age_modifiers (age_range, modifier) VALUES
    ('18-25', 0.70),
    ('26-35', 0.55),
    ('36-50', 0.45),
    ('51-60', 0.60),
    ('60+', 0.75);

-- Gender modifiers
CREATE TABLE config_gender_modifiers (
    gender gender PRIMARY KEY,
    modifier DECIMAL(3,2) NOT NULL CHECK (modifier BETWEEN 0 AND 1)
);

INSERT INTO config_gender_modifiers (gender, modifier) VALUES
    ('MALE', 0.50),
    ('FEMALE', 0.55),
    ('OTHER', 0.50),
    ('PREFER_NOT_TO_SAY', 0.50);

-- Seniority impact
CREATE TABLE config_seniority_impact (
    seniority seniority PRIMARY KEY,
    impact DECIMAL(3,2) NOT NULL CHECK (impact BETWEEN 0 AND 1)
);

INSERT INTO config_seniority_impact (seniority, impact) VALUES
    ('INTERN', 0.20),
    ('JUNIOR', 0.35),
    ('MID', 0.55),
    ('SENIOR', 0.75),
    ('EXECUTIVE', 1.00);

-- Scenario alpha weights (how much seniority matters per scenario)
CREATE TABLE config_scenario_alpha (
    category scenario_category PRIMARY KEY,
    alpha DECIMAL(3,2) NOT NULL CHECK (alpha BETWEEN 0 AND 1),
    description TEXT
);

INSERT INTO config_scenario_alpha (category, alpha, description) VALUES
    ('BEC', 0.70, 'Invoice/wire fraud - seniority matters most'),
    ('CREDENTIALS', 0.20, 'Credential harvest - role matters most'),
    ('DATA', 0.30, 'Data disclosure - balanced'),
    ('MALWARE', 0.40, 'Malware lure - balanced');

-- Role-specific impact matrices
CREATE TABLE config_role_impact (
    category scenario_category NOT NULL,
    department VARCHAR(100) NOT NULL,
    impact DECIMAL(3,2) NOT NULL CHECK (impact BETWEEN 0 AND 1),
    PRIMARY KEY (category, department)
);

-- R_BEC (invoice/wire fraud impact)
INSERT INTO config_role_impact (category, department, impact) VALUES
    ('BEC', 'Finance', 1.00),
    ('BEC', 'Accounting', 1.00),
    ('BEC', 'Procurement', 0.85),
    ('BEC', 'Purchasing', 0.85),
    ('BEC', 'Executive', 0.80),
    ('BEC', 'Legal', 0.70),
    ('BEC', 'HR', 0.65),
    ('BEC', 'IT', 0.55),
    ('BEC', 'Security', 0.55),
    ('BEC', 'Sales', 0.50),
    ('BEC', 'Marketing', 0.50),
    ('BEC', 'Operations', 0.50),
    ('BEC', 'Other', 0.50);

-- R_CREDENTIALS (credential theft impact)
INSERT INTO config_role_impact (category, department, impact) VALUES
    ('CREDENTIALS', 'IT Security', 1.00),
    ('CREDENTIALS', 'IT Admin', 1.00),
    ('CREDENTIALS', 'IT', 0.85),
    ('CREDENTIALS', 'Finance', 0.75),
    ('CREDENTIALS', 'Legal', 0.75),
    ('CREDENTIALS', 'HR', 0.75),
    ('CREDENTIALS', 'Operations', 0.65),
    ('CREDENTIALS', 'Sales', 0.55),
    ('CREDENTIALS', 'Marketing', 0.55),
    ('CREDENTIALS', 'Other', 0.55);

-- R_DATA (data/PII disclosure impact)
INSERT INTO config_role_impact (category, department, impact) VALUES
    ('DATA', 'HR', 1.00),
    ('DATA', 'Legal', 0.90),
    ('DATA', 'Compliance', 0.90),
    ('DATA', 'Finance', 0.85),
    ('DATA', 'Customer Support', 0.80),
    ('DATA', 'Sales Operations', 0.80),
    ('DATA', 'Operations', 0.65),
    ('DATA', 'IT', 0.60),
    ('DATA', 'Security', 0.60),
    ('DATA', 'Marketing', 0.55),
    ('DATA', 'Other', 0.55);

-- R_MALWARE (malware/ransomware lure impact)
INSERT INTO config_role_impact (category, department, impact) VALUES
    ('MALWARE', 'IT Admin', 0.95),
    ('MALWARE', 'IT Security', 0.95),
    ('MALWARE', 'IT', 0.85),
    ('MALWARE', 'Operations', 0.80),
    ('MALWARE', 'Finance', 0.75),
    ('MALWARE', 'HR', 0.75),
    ('MALWARE', 'Legal', 0.75),
    ('MALWARE', 'Sales', 0.65),
    ('MALWARE', 'Marketing', 0.65),
    ('MALWARE', 'Other', 0.55);

-- ============================================================================
-- TRIGGERS - Auto-update timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulations_updated_at BEFORE UPDATE ON simulations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulation_results_updated_at BEFORE UPDATE ON simulation_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS - Documentation
-- ============================================================================
COMMENT ON TABLE employees IS 'Core employee data - minimized per UAE data protection law';
COMMENT ON TABLE risk_scores IS 'Calculated risk scores with full explainability';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for compliance';
COMMENT ON COLUMN employees.technical_literacy IS 'Survey score 0-10, higher = more literate';
COMMENT ON COLUMN risk_scores.likelihood IS 'Probability of falling for scenario (0-1)';
COMMENT ON COLUMN risk_scores.impact IS 'Damage potential if successful (0-1)';
COMMENT ON COLUMN risk_scores.risk_score IS 'Final score: round(100 × L × I)';
