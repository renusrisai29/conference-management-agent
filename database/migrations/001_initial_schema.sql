-- ============================================================
-- CONFERENCE MANAGEMENT AGENT (AGENT 26) - DATABASE SCHEMA
-- Target Database: Supabase PostgreSQL (compatible with standard PostgreSQL)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & ROLES
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    institution VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    designation VARCHAR(150),
    role VARCHAR(50) NOT NULL DEFAULT 'AUTHOR', -- ADMIN, CHAIR, ORGANIZER, REVIEWER, AUTHOR, PARTICIPANT, SESSION_CHAIR
    orcid_id VARCHAR(50),
    scopus_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CONFERENCES
CREATE TABLE IF NOT EXISTS conferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    acronym VARCHAR(50) NOT NULL UNIQUE,
    theme TEXT,
    description TEXT,
    institution VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    mode VARCHAR(50) DEFAULT 'HYBRID', -- IN_PERSON, VIRTUAL, HYBRID
    website_url VARCHAR(255),
    submission_format VARCHAR(100) DEFAULT 'IEEE Double Column PDF',
    max_pages INT DEFAULT 8,
    review_model VARCHAR(50) DEFAULT 'DOUBLE_BLIND', -- SINGLE_BLIND, DOUBLE_BLIND
    acceptance_policy VARCHAR(100) DEFAULT 'MIN_2_ACCEPT_NO_REJECT',
    isbn VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ACTIVE', -- DRAFT, CFP, SUBMISSIONS_OPEN, IN_REVIEW, DECISIONS_ANNOUNCED, PROGRAMME_PUBLISHED, ARCHIVED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CONFERENCE DATES
CREATE TABLE IF NOT EXISTS conference_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
    cfp_open_date DATE NOT NULL,
    submission_deadline DATE NOT NULL,
    review_deadline DATE NOT NULL,
    notification_date DATE NOT NULL,
    camera_ready_deadline DATE NOT NULL,
    registration_deadline DATE NOT NULL,
    conference_start_date DATE NOT NULL,
    conference_end_date DATE NOT NULL
);

-- 4. TRACKS & TOPICS
CREATE TABLE IF NOT EXISTS tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    chair_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL
);

-- 5. SUBMISSIONS & AUTHORS
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_number INT NOT NULL,
    conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
    track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    abstract TEXT NOT NULL,
    keywords TEXT[] NOT NULL,
    primary_author_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'SUBMITTED', -- DRAFT, SUBMITTED, UNDER_REVIEW, ACCEPTED, REVISION_REQUIRED, REJECTED, CAMERA_READY
    page_count INT DEFAULT 6,
    file_path VARCHAR(500),
    similarity_score NUMERIC(5,2) DEFAULT 0.00,
    similarity_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PASSED, FLAGGED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submission_authors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    institution VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    country VARCHAR(100),
    is_corresponding BOOLEAN DEFAULT FALSE,
    author_order INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS submission_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL, -- MANUSCRIPT, CAMERA_READY, SOURCE_ZIP
    file_url VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    page_count INT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. REVIEWERS & EXPERTISE
CREATE TABLE IF NOT EXISTS reviewers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent17_id VARCHAR(100), -- external faculty research agent ID
    h_index INT DEFAULT 0,
    i10_index INT DEFAULT 0,
    citation_count INT DEFAULT 0,
    max_workload INT DEFAULT 5,
    current_workload INT DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviewer_expertise (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID REFERENCES reviewers(id) ON DELETE CASCADE,
    domain VARCHAR(150) NOT NULL,
    keywords TEXT[] NOT NULL,
    weight NUMERIC(3,2) DEFAULT 1.0
);

-- 7. CONFLICT OF INTEREST & ASSIGNMENTS
CREATE TABLE IF NOT EXISTS conflicts_of_interest (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES reviewers(id) ON DELETE CASCADE,
    conflict_type VARCHAR(100) NOT NULL, -- SAME_INSTITUTION, RECENT_COAUTHOR, SAME_DEPARTMENT, AUTHOR_SELF, PERSONAL
    details TEXT,
    flagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_waived BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS reviewer_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES reviewers(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    match_score NUMERIC(5,2), -- Calculated by Reviewer Matching algorithm
    match_details JSONB,
    status VARCHAR(50) DEFAULT 'ASSIGNED', -- ASSIGNED, ACCEPTED, DECLINED, COMPLETED
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE
);

-- 8. REVIEWS & REMINDERS
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES reviewer_assignments(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES reviewers(id) ON DELETE CASCADE,
    overall_score INT NOT NULL CHECK (overall_score >= 1 AND overall_score <= 10),
    confidence INT NOT NULL CHECK (confidence >= 1 AND confidence <= 5),
    soundness_score INT CHECK (soundness_score >= 1 AND soundness_score <= 5),
    originality_score INT CHECK (originality_score >= 1 AND originality_score <= 5),
    presentation_score INT CHECK (presentation_score >= 1 AND presentation_score <= 5),
    recommendation VARCHAR(50) NOT NULL, -- ACCEPT, MINOR_REVISION, MAJOR_REVISION, REJECT
    strengths TEXT NOT NULL,
    weaknesses TEXT NOT NULL,
    comments_to_author TEXT NOT NULL,
    confidential_comments_to_chair TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES reviewer_assignments(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) DEFAULT 'EMAIL',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status VARCHAR(50) DEFAULT 'SENT'
);

-- 9. DECISIONS & CAMERA READY
CREATE TABLE IF NOT EXISTS decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    ai_recommendation VARCHAR(50), -- AI suggested recommendation
    ai_reasoning TEXT,
    divergence_flag BOOLEAN DEFAULT FALSE,
    final_decision VARCHAR(50) NOT NULL, -- ACCEPT, MINOR_REVISION, MAJOR_REVISION, REJECT
    decided_by UUID REFERENCES users(id),
    decision_letter TEXT,
    decided_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notification_sent BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS camera_ready_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    file_url VARCHAR(500) NOT NULL,
    page_count INT,
    confirmed_metadata BOOLEAN DEFAULT TRUE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. REGISTRATIONS & PAYMENTS
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL, -- STUDENT, RESEARCH_SCHOLAR, FACULTY, INDUSTRY, AUTHOR, PARTICIPANT
    fee_amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, CONFIRMED, CANCELLED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_mode VARCHAR(50) DEFAULT 'SANDBOX',
    gateway_order_id VARCHAR(150),
    gateway_payment_id VARCHAR(150),
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, REFUNDED
    receipt_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE
);

-- 11. SESSIONS & PROGRAMME SCHEDULING
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
    track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    room VARCHAR(100) NOT NULL, -- e.g. Hall A, Hall B, Main Auditorium
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_chairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    presentation_order INT DEFAULT 1,
    start_time TIME,
    end_time TIME
);

-- 12. CERTIFICATES & PROCEEDINGS
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. VIGNAN-CONF2026-CERT-88492
    conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- AUTHOR, PRESENTER, REVIEWER, SESSION_CHAIR, PARTICIPANT
    paper_title VARCHAR(500),
    verification_hash VARCHAR(150) NOT NULL,
    issue_date DATE NOT NULL,
    pdf_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificate_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_id UUID REFERENCES certificates(id) ON DELETE CASCADE,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS proceedings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    isbn VARCHAR(50) DEFAULT 'ISBN pending',
    total_papers INT DEFAULT 0,
    total_pages INT DEFAULT 0,
    table_of_contents JSONB,
    compiled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. AUDIT LOGS & EMAILS
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(300) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- CFP, SUBMISSION_CONFIRM, REVIEWER_INVITE, REMINDER, DECISION, REGISTRATION, CERTIFICATE
    status VARCHAR(50) DEFAULT 'SENT',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    actor_id UUID REFERENCES users(id),
    target_entity VARCHAR(100),
    target_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_conference ON submissions(conference_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_reviewer_assignments_sub ON reviewer_assignments(submission_id);
CREATE INDEX IF NOT EXISTS idx_reviews_submission ON reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);
