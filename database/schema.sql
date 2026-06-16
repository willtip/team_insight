-- Team Insight AI — PostgreSQL Schema
-- Run: psql -d team_insight_ai -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For full-text search

-- Enums
CREATE TYPE skill_level AS ENUM ('Beginner', 'Intermediate', 'Advanced', 'Expert');
CREATE TYPE goal_status AS ENUM ('Not Started', 'In Progress', 'At Risk', 'Completed', 'Deferred');
CREATE TYPE goal_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE goal_category AS ENUM ('Quarterly', 'Annual', 'Personal Development', 'Organizational');
CREATE TYPE promotion_readiness AS ENUM (
    'Ready Now', 'Ready in 6 Months', 'Ready in 12 Months', 'Development Needed'
);
CREATE TYPE note_category AS ENUM (
    'Coaching', 'Recognition', 'Leadership Potential', 'Performance Observation',
    'Career Aspirations', 'Succession Planning', 'Concerns', 'Follow-Up Actions'
);
CREATE TYPE user_role AS ENUM ('director', 'manager', 'employee', 'admin');

-- Users (from Entra ID)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    azure_oid VARCHAR(255) UNIQUE,  -- Entra ID Object ID
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_azure_oid ON users(azure_oid);

-- Employees
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    employee_id VARCHAR(50) UNIQUE NOT NULL,  -- ENG-XXXX

    -- Identity
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    level VARCHAR(20),  -- L3-L8
    department VARCHAR(255),
    manager_id UUID REFERENCES employees(id),
    hire_date DATE,
    location VARCHAR(255),
    email VARCHAR(255),
    bio TEXT,
    career_aspirations TEXT,

    -- Computed / maintained flags
    is_high_potential BOOLEAN DEFAULT FALSE,
    needs_coaching BOOLEAN DEFAULT FALSE,
    promotion_readiness promotion_readiness,
    tags JSONB DEFAULT '[]',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_dept ON employees(department);
CREATE INDEX idx_employees_tags ON employees USING gin(tags);

-- Skills
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    current_level skill_level,
    target_level skill_level,
    score INTEGER CHECK (score BETWEEN 0 AND 4),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, name)
);

CREATE INDEX idx_skills_employee ON skills(employee_id);
CREATE INDEX idx_skills_name ON skills(name);

-- Goals
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    strategic_alignment VARCHAR(255),
    due_date DATE,
    priority goal_priority,
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    status goal_status DEFAULT 'Not Started',
    category goal_category,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_employee ON goals(employee_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_due_date ON goals(due_date);

-- Project Contributions
CREATE TABLE project_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    initiative VARCHAR(255),
    description TEXT,
    business_impact TEXT,
    technical_impact TEXT,
    leadership_score INTEGER CHECK (leadership_score BETWEEN 1 AND 5),
    collaboration_score INTEGER CHECK (collaboration_score BETWEEN 1 AND 5),
    innovation_score INTEGER CHECK (innovation_score BETWEEN 1 AND 5),
    date DATE,
    evidence_links JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contributions_employee ON project_contributions(employee_id);
CREATE INDEX idx_contributions_project ON project_contributions(project_name);

-- Certifications
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(255),
    date_earned DATE,
    expiration_date DATE,
    credential_id VARCHAR(255)
);

-- Training Records
CREATE TABLE training_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    course_name VARCHAR(255) NOT NULL,
    platform VARCHAR(100),
    status VARCHAR(50),  -- Completed, In Progress, Planned
    completion_date DATE,
    hours_completed INTEGER
);

-- Conferences
CREATE TABLE conferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    date DATE,
    role VARCHAR(50),  -- Attendee, Speaker, Panelist
    key_learnings TEXT
);

-- Mentoring Relations
CREATE TABLE mentoring_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    type VARCHAR(20),  -- Mentor, Mentee
    partner_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    outcomes TEXT,
    active BOOLEAN DEFAULT TRUE
);

-- Director Notes (private, RBAC-controlled)
CREATE TABLE director_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    category note_category NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    follow_up_date DATE,
    is_private BOOLEAN DEFAULT TRUE,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_employee ON director_notes(employee_id);
CREATE INDEX idx_notes_author ON director_notes(author_id);
CREATE INDEX idx_notes_follow_up ON director_notes(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- Performance Scores (calculated, not manually entered)
CREATE TABLE performance_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    overall NUMERIC(5,2),
    goal_achievement NUMERIC(5,2),
    project_contributions NUMERIC(5,2),
    professional_development NUMERIC(5,2),
    leadership_behaviors NUMERIC(5,2),
    collaboration NUMERIC(5,2),
    innovation NUMERIC(5,2),
    growth_score NUMERIC(5,2),
    leadership_readiness NUMERIC(5,2),
    promotion_readiness_score NUMERIC(5,2),
    trend VARCHAR(10) DEFAULT 'stable',  -- up, down, stable
    last_calculated TIMESTAMPTZ DEFAULT NOW()
);

-- Score Weight Configuration
CREATE TABLE score_weight_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department VARCHAR(255),  -- NULL = org-wide default
    goal_achievement_weight NUMERIC(4,3) DEFAULT 0.300,
    project_contributions_weight NUMERIC(4,3) DEFAULT 0.250,
    professional_development_weight NUMERIC(4,3) DEFAULT 0.150,
    leadership_behaviors_weight NUMERIC(4,3) DEFAULT 0.150,
    collaboration_weight NUMERIC(4,3) DEFAULT 0.100,
    innovation_weight NUMERIC(4,3) DEFAULT 0.050,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT weights_sum_to_one CHECK (
        ROUND(goal_achievement_weight + project_contributions_weight +
              professional_development_weight + leadership_behaviors_weight +
              collaboration_weight + innovation_weight, 3) = 1.000
    )
);

-- Audit Logs (immutable)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Partition audit logs by quarter
CREATE TABLE audit_logs_2026_q1 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE audit_logs_2026_q2 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE audit_logs_2026_q3 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE audit_logs_2026_q4 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

-- Insert default score weight config
INSERT INTO score_weight_configs (department, is_active)
VALUES (NULL, TRUE);

-- Row-level security policies
ALTER TABLE director_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY notes_director_access ON director_notes
    USING (author_id = current_setting('app.current_user_id')::UUID
           OR current_setting('app.user_role') IN ('director', 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON director_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
