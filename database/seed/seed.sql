-- ============================================================
-- CONFERENCE MANAGEMENT AGENT (AGENT 26) - SEED DATA
-- ============================================================

-- Users
INSERT INTO users (id, email, full_name, institution, department, designation, role, scopus_id, orcid_id)
VALUES 
('11111111-1111-1111-1111-111111111111', 'chair@vignan.ac.in', 'Dr. Radhika Sharma', 'Vignan''s Foundation for Science, Technology & Research', 'Computer Science and Engineering', 'Professor & General Chair', 'CHAIR', '57193821000', '0000-0002-1825-0097'),
('22222222-2222-2222-2222-222222222222', 'organizer@vignan.ac.in', 'Dr. Suresh Kumar', 'Vignan''s Foundation for Science, Technology & Research', 'Information Technology', 'Associate Professor & Organizing Chair', 'ORGANIZER', '57201948201', '0000-0003-2941-1102'),
('33333333-3333-3333-3333-333333333333', 'author1@mit.edu', 'Prof. Elena Rostova', 'Massachusetts Institute of Technology', 'CSAIL', 'Principal Investigator', 'AUTHOR', '56481029481', '0000-0001-4921-7782'),
('44444444-4444-4444-4444-444444444444', 'author2@stanford.edu', 'Alex Vance', 'Stanford University', 'Computer Science', 'PhD Candidate', 'AUTHOR', '57294810293', '0000-0002-9981-4019'),
('55555555-5555-5555-5555-555555555555', 'reviewer1@oxford.ac.uk', 'Dr. Marcus Holloway', 'University of Oxford', 'Department of Computer Science', 'Reader in Machine Learning', 'REVIEWER', '57102938471', '0000-0001-8392-1920'),
('66666666-6666-6666-6666-666666666666', 'participant@iitb.ac.in', 'Kiran Patel', 'Indian Institute of Technology Bombay', 'Electrical Engineering', 'Research Fellow', 'PARTICIPANT', '57391820491', '0000-0003-8192-3049')
ON CONFLICT (email) DO NOTHING;

-- Conference
INSERT INTO conferences (id, name, acronym, theme, description, institution, venue, mode, website_url, submission_format, max_pages, review_model, acceptance_policy, status)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'International Conference on Agentic AI & Autonomous Systems',
    'AGENTIC-AI-2026',
    'Architectures, Collaboration, and Governance of Autonomous AI Agents',
    'The premier academic conference bringing together researchers, faculty, and industry pioneers to present groundbreaking advances in agentic AI, LLM reasoning architectures, and verifiable multi-agent coordination.',
    'Vignan''s Foundation for Science, Technology & Research',
    'Main Auditorium, Vignan Deemed to be University, Vadlamudi, Guntur, AP, India',
    'HYBRID',
    'https://vignan.ac.in/agentic-ai-2026',
    'IEEE Double Column PDF',
    8,
    'DOUBLE_BLIND',
    'MIN_2_ACCEPT_NO_REJECT',
    'ACTIVE'
) ON CONFLICT (acronym) DO NOTHING;

-- Conference Dates
INSERT INTO conference_dates (id, conference_id, cfp_open_date, submission_deadline, review_deadline, notification_date, camera_ready_deadline, registration_deadline, conference_start_date, conference_end_date)
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '2026-08-01',
    '2026-10-15',
    '2026-11-10',
    '2026-11-25',
    '2026-12-10',
    '2026-12-20',
    '2027-01-18',
    '2027-01-20'
) ON CONFLICT DO NOTHING;

-- Tracks
INSERT INTO tracks (id, conference_id, name, code, description)
VALUES 
('t1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Autonomous Agents & Multi-Agent Coordination', 'TRACK-1', 'Decentralized decision making, agent negotiation, multi-agent reinforcement learning, and collective intelligence.'),
('t2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Deep Learning & Foundation Reasoning Models', 'TRACK-2', 'LLMs, chain-of-thought, retrieval-augmented generation, tool use, and cognitive memory architectures.'),
('t3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Trustworthy AI, Alignment & Cybersecurity', 'TRACK-3', 'Agent safety, sandboxing, alignment, adversarial defense, and verification of autonomous actions.'),
('t4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Edge AI, Robotics & Physical Autonomous Systems', 'TRACK-4', 'Embodied AI, robot manipulation, low-latency edge agent execution, and cyber-physical systems.')
ON CONFLICT DO NOTHING;
