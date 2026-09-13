-- ============================================================
-- CONFERENCE MANAGEMENT AGENT (AGENT 26) - DATABASE SEED DATA
-- Fully normalized and compatible with 001_initial_schema.sql
-- All UUIDs are valid RFC 4122 hexadecimal strings.
-- Idempotent: safe to run multiple times without duplicating data.
-- ============================================================

-- 1. USERS (11 users: Chairs, Organizers, Authors, Reviewers, Delegates)
INSERT INTO users (id, email, full_name, institution, department, designation, role, scopus_id, orcid_id, is_active)
VALUES 
('11111111-1111-1111-1111-111111111111', 'chair@vignan.ac.in', 'Dr. Radhika Sharma', 'Vignan''s Foundation for Science, Technology & Research', 'Computer Science and Engineering', 'Professor & General Chair', 'CHAIR', '57193821000', '0000-0002-1825-0097', true),
('22222222-2222-2222-2222-222222222222', 'organizer@vignan.ac.in', 'Dr. Suresh Kumar', 'Vignan''s Foundation for Science, Technology & Research', 'Information Technology', 'Associate Professor & Organizing Chair', 'ORGANIZER', '57201948201', '0000-0003-2941-1102', true),
('33333333-3333-3333-3333-333333333333', 'author1@mit.edu', 'Prof. Elena Rostova', 'Massachusetts Institute of Technology', 'CSAIL', 'Principal Investigator', 'AUTHOR', '56481029481', '0000-0001-4921-7782', true),
('44444444-4444-4444-4444-444444444444', 'author2@stanford.edu', 'Alex Vance', 'Stanford University', 'Computer Science', 'PhD Candidate', 'AUTHOR', '57294810293', '0000-0002-9981-4019', true),
('55555555-5555-5555-5555-555555555555', 'reviewer1@oxford.ac.uk', 'Dr. Marcus Holloway', 'University of Oxford', 'Department of Computer Science', 'Reader in Machine Learning', 'REVIEWER', '57102938471', '0000-0001-8392-1920', true),
('66666666-6666-6666-6666-666666666666', 'participant@iitb.ac.in', 'Kiran Patel', 'Indian Institute of Technology Bombay', 'Electrical Engineering', 'Research Fellow', 'PARTICIPANT', '57391820491', '0000-0003-8192-3049', true),
('77777777-7777-7777-7777-777777777777', 'chair.session@nus.edu.sg', 'Prof. Sofia Chen', 'National University of Singapore', 'Institute for Artificial Intelligence', 'Chair Professor', 'SESSION_CHAIR', '56829103948', '0000-0003-1928-3011', true),
('88888888-8888-8888-8888-888888888888', 'trao@cmu.edu', 'Tanya Rao', 'Carnegie Mellon University', 'CyLab Security and Privacy Institute', 'Senior Researcher', 'AUTHOR', '57182930491', '0000-0002-3918-4019', true),
('99999999-9999-9999-9999-999999999991', 'vrao@iitm.ac.in', 'Dr. Vikramaditya Rao', 'Indian Institute of Technology Madras', 'Computer Science and Engineering', 'Associate Professor', 'REVIEWER', '57291029384', '0000-0002-8192-3049', true),
('99999999-9999-9999-9999-999999999992', 'loconnor@anu.edu.au', 'Dr. Liam O''Connor', 'Australian National University', 'School of Computing', 'Senior Lecturer', 'REVIEWER', '56391029482', '0000-0001-9283-4018', true),
('99999999-9999-9999-9999-999999999993', 'falmansoor@kaust.edu.sa', 'Dr. Fatima Al-Mansoor', 'King Abdullah University of Science and Technology', 'Applied Mathematics & Computational Science', 'Principal Scientist', 'REVIEWER', '57482910392', '0000-0003-9182-4019', true),
('99999999-9999-9999-9999-999999999901', 'athorne@vignan.ac.in', 'Dr. Aris Thorne', 'Vignan''s Foundation for Science, Technology & Research', 'Department of Computer Science & Engineering', 'Associate Professor', 'REVIEWER', '57193240112', '0000-0002-4910-3819', true),
('99999999-9999-9999-9999-999999999904', 'sato@mech.u-tokyo.ac.jp', 'Dr. Kenji Sato', 'University of Tokyo', 'Department of Mechano-Informatics', 'Associate Professor', 'REVIEWER', '56481920194', '0000-0002-8819-2041', true),
('99999999-9999-9999-9999-999999999905', 'ajoshi@vignan.ac.in', 'Dr. Ananya Joshi', 'Vignan''s Foundation for Science, Technology & Research', 'Department of Computer Science', 'Assistant Professor', 'REVIEWER', '57210948291', '0000-0003-8821-4902', true),
('99999999-9999-9999-9999-999999999906', 'lmeyer@tum.de', 'Prof. Lucas Meyer', 'Technical University of Munich', 'Department of Electrical & Computer Engineering', 'Professor', 'REVIEWER', '56102938471', '0000-0001-9283-7461', true),
('99999999-9999-9999-9999-999999999907', 'pvenkatesh@cmu.edu', 'Dr. Priya Venkatesh', 'Carnegie Mellon University', 'Department of Computer Science', 'Associate Professor', 'REVIEWER', '57291840192', '0000-0002-7104-9810', true),
('99999999-9999-9999-9999-999999999910', 'mrossi@polimi.it', 'Dr. Mateo Rossi', 'Politecnico di Milano', 'Dipartimento di Elettronica, Informazione e Bioingegneria', 'Assistant Professor', 'REVIEWER', '56291038491', '0000-0003-4918-2049', true),
('99999999-9999-9999-9999-999999999912', 'gsilva@usp.br', 'Dr. Gabriel Silva', 'University of São Paulo', 'Department of Computer Science', 'Assistant Professor', 'REVIEWER', '56391820491', '0000-0003-9182-3041', true),
('99999999-9999-9999-9999-999999999913', 'cdubost@sorbonne-universite.fr', 'Dr. Claire Dubost', 'Sorbonne Université', 'Département Informatique', 'Maitre de Conferences', 'REVIEWER', '57193849102', '0000-0002-8192-3019', true),
('99999999-9999-9999-9999-999999999914', 'wzhang@tsinghua.edu.cn', 'Dr. Wei Zhang', 'Tsinghua University', 'Department of Computer Science & Technology', 'Associate Professor', 'REVIEWER', '56491029381', '0000-0001-9182-4910', true),
('99999999-9999-9999-9999-999999999915', 'enesterova@uwaterloo.ca', 'Dr. Elena Nesterova', 'University of Waterloo', 'School of Computer Science', 'Associate Professor', 'REVIEWER', '57194810283', '0000-0002-3849-1029', true),
('99999999-9999-9999-9999-999999999918', 'talhassan@illinois.edu', 'Dr. Tariq Al-Hassan', 'University of Illinois Urbana-Champaign', 'Department of Electrical & Computer Engineering', 'Associate Professor', 'REVIEWER', '57281903912', '0000-0003-9182-1029', true)
ON CONFLICT (email) DO NOTHING;

-- 2. CONFERENCES (1 master conference)
INSERT INTO conferences (id, name, acronym, theme, description, institution, venue, mode, website_url, submission_format, max_pages, review_model, acceptance_policy, status)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'International Conference on Agentic AI & Autonomous Systems',
    'AGENTIC-AI-2026',
    'Architectures, Collaboration, and Governance of Autonomous AI Agents',
    'The premier academic conference bringing together researchers, faculty, and industry pioneers to present groundbreaking advances in agentic AI, LLM reasoning architectures, and verifiable multi-agent coordination.',
    'Vignan''s Foundation for Science, Technology & Research',
    'Main University Auditorium & CSE Complex, Vignan Deemed to be University, Vadlamudi, AP, India',
    'HYBRID',
    'https://vignan.ac.in/agentic-ai-2026',
    'IEEE Double Column PDF',
    8,
    'DOUBLE_BLIND',
    'MIN_2_ACCEPT_NO_REJECT',
    'ACTIVE'
) ON CONFLICT (acronym) DO NOTHING;

-- 3. CONFERENCE DATES (1 record)
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
) ON CONFLICT (id) DO NOTHING;

-- 4. TRACKS (4 tracks with valid hexadecimal UUIDs)
INSERT INTO tracks (id, conference_id, name, code, description, chair_id)
VALUES 
('c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Autonomous Agents & Multi-Agent Coordination', 'TRACK-1', 'Decentralized consensus, multi-agent reinforcement learning, auction theory, game-theoretic agent governance.', '11111111-1111-1111-1111-111111111111'),
('c2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Deep Learning & Foundation Reasoning Models', 'TRACK-2', 'Chain-of-thought, reasoning models, self-reflection, neuro-symbolic reasoning, and RAG architectures.', '11111111-1111-1111-1111-111111111111'),
('c3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Trustworthy AI, Alignment & Cybersecurity', 'TRACK-3', 'Agent sandboxing, prompt-injection defense, differential privacy, certified safety boundaries.', '22222222-2222-2222-2222-222222222222'),
('c4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Edge AI, Robotics & Physical Autonomous Systems', 'TRACK-4', 'Embodied navigation, quadruped manipulation, TinyML microcontrollers, visual SLAM.', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- 5. TOPICS (16 academic topics matching db.ts)
INSERT INTO topics (id, track_id, name)
VALUES 
-- Track 1 Topics
('d1111111-0001-0000-0000-000000000001', 'c1111111-1111-1111-1111-111111111111', 'Multi-Agent Reinforcement Learning'),
('d1111111-0002-0000-0000-000000000002', 'c1111111-1111-1111-1111-111111111111', 'Decentralized Consensus'),
('d1111111-0003-0000-0000-000000000003', 'c1111111-1111-1111-1111-111111111111', 'Swarm Intelligence'),
('d1111111-0004-0000-0000-000000000004', 'c1111111-1111-1111-1111-111111111111', 'Agent Auctions'),
-- Track 2 Topics
('d2222222-0001-0000-0000-000000000001', 'c2222222-2222-2222-2222-222222222222', 'LLM Reasoning'),
('d2222222-0002-0000-0000-000000000002', 'c2222222-2222-2222-2222-222222222222', 'Chain of Thought'),
('d2222222-0003-0000-0000-000000000003', 'c2222222-2222-2222-2222-222222222222', 'Neuro-Symbolic AI'),
('d2222222-0004-0000-0000-000000000004', 'c2222222-2222-2222-2222-222222222222', 'RAG & Memory Architectures'),
-- Track 3 Topics
('d3333333-0001-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333333', 'Agent Sandboxing'),
('d3333333-0002-0000-0000-000000000002', 'c3333333-3333-3333-3333-333333333333', 'Prompt Defense'),
('d3333333-0003-0000-0000-000000000003', 'c3333333-3333-3333-3333-333333333333', 'Adversarial Robustness'),
('d3333333-0004-0000-0000-000000000004', 'c3333333-3333-3333-3333-333333333333', 'Zero-Trust AI'),
-- Track 4 Topics
('d4444444-0001-0000-0000-000000000001', 'c4444444-4444-4444-4444-444444444444', 'Embodied AI'),
('d4444444-0002-0000-0000-000000000002', 'c4444444-4444-4444-4444-444444444444', 'Visual SLAM'),
('d4444444-0003-0000-0000-000000000003', 'c4444444-4444-4444-4444-444444444444', 'Sim-to-Real Transfer'),
('d4444444-0004-0000-0000-000000000004', 'c4444444-4444-4444-4444-444444444444', 'TinyML & Edge Acceleration')
ON CONFLICT (id) DO NOTHING;

-- 6. REVIEWERS (4 faculty peer reviewers linked to users table)
INSERT INTO reviewers (id, user_id, agent17_id, h_index, i10_index, citation_count, max_workload, current_workload, is_available)
VALUES 
('e0000000-0000-0000-0000-000000000003', '99999999-9999-9999-9999-999999999991', 'FAC-A17-003', 32, 54, 4820, 5, 1, true),
('e0000000-0000-0000-0000-000000000009', '99999999-9999-9999-9999-999999999992', 'FAC-A17-009', 28, 42, 3210, 5, 1, true),
('e0000000-0000-0000-0000-000000000011', '99999999-9999-9999-9999-999999999993', 'FAC-A17-011', 25, 38, 2890, 5, 1, true),
('e0000000-0000-0000-0000-000000000008', '55555555-5555-5555-5555-555555555555', 'FAC-A17-008', 36, 61, 5640, 5, 1, true),
('e0000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999901', 'FAC-A17-001', 28, 46, 3420, 5, 2, true),
('e0000000-0000-0000-0000-000000000004', '99999999-9999-9999-9999-999999999904', 'FAC-A17-004', 25, 39, 2840, 4, 2, true),
('e0000000-0000-0000-0000-000000000005', '99999999-9999-9999-9999-999999999905', 'FAC-A17-005', 22, 35, 2190, 5, 1, true),
('e0000000-0000-0000-0000-000000000006', '99999999-9999-9999-9999-999999999906', 'FAC-A17-006', 37, 74, 6410, 4, 2, true),
('e0000000-0000-0000-0000-000000000007', '99999999-9999-9999-9999-999999999907', 'FAC-A17-007', 26, 41, 2980, 5, 1, true),
('e0000000-0000-0000-0000-000000000010', '99999999-9999-9999-9999-999999999910', 'FAC-A17-010', 29, 48, 3790, 5, 1, true),
('e0000000-0000-0000-0000-000000000012', '99999999-9999-9999-9999-999999999912', 'FAC-A17-012', 27, 44, 3120, 5, 1, true),
('e0000000-0000-0000-0000-000000000013', '99999999-9999-9999-9999-999999999913', 'FAC-A17-013', 30, 51, 3950, 4, 2, true),
('e0000000-0000-0000-0000-000000000014', '99999999-9999-9999-9999-999999999914', 'FAC-A17-014', 38, 79, 7120, 5, 3, true),
('e0000000-0000-0000-0000-000000000015', '99999999-9999-9999-9999-999999999915', 'FAC-A17-015', 25, 43, 2890, 4, 1, true),
('e0000000-0000-0000-0000-000000000018', '99999999-9999-9999-9999-999999999918', 'FAC-A17-018', 28, 47, 3510, 4, 2, true)
ON CONFLICT (id) DO NOTHING;

-- 7. SUBMISSIONS (5 academic manuscripts matching db.ts)
INSERT INTO submissions (id, paper_number, conference_id, track_id, title, abstract, keywords, primary_author_id, status, page_count, file_path, similarity_score, similarity_status)
VALUES 
(
    'ea101101-0000-0000-0000-000000000101',
    101,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'c1111111-1111-1111-1111-111111111111',
    'Decentralized Swarm Coordination for Autonomous Microgrid Power Optimization',
    'We present a resilient multi-agent reinforcement learning framework for autonomous power dispatch across distributed microgrids. Using decentralized consensus protocols and localized bidding, our agents achieve 99.4% grid stability during simulated line failures without central coordination.',
    ARRAY['autonomous agents', 'multi-agent reinforcement learning', 'microgrid', 'decentralized consensus', 'smart grid'],
    '33333333-3333-3333-3333-333333333333',
    'UNDER_REVIEW',
    8,
    '/uploads/papers/paper_101_final.pdf',
    4.20,
    'PASSED'
),
(
    'ea102102-0000-0000-0000-000000000102',
    102,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'c2222222-2222-2222-2222-222222222222',
    'Verifiable Chain-of-Thought Reasoning in Multi-Agent Diagnostic Systems',
    'Complex multi-step reasoning in clinical and financial domains requires verifiable proof chains. We introduce a neuro-symbolic audit pipeline that couples LLM token generation with formal logic engines, producing auditable deduction trees that eliminate 98.2% of hallucinated steps.',
    ARRAY['llm', 'chain of thought', 'reasoning', 'neuro-symbolic', 'verification trees', 'hallucination mitigation'],
    '44444444-4444-4444-4444-444444444444',
    'SUBMITTED',
    7,
    '/uploads/papers/paper_102_manuscript.pdf',
    6.80,
    'PASSED'
),
(
    'ea103103-0000-0000-0000-000000000103',
    103,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'c3333333-3333-3333-3333-333333333333',
    'Jailbreak Resistant Guardrails and Sandboxing for Autonomous Agent Tool Execution',
    'When autonomous LLM agents execute bash or Python commands, prompt injection attacks can bypass perimeter defenses. We formulate a formal sandboxing boundary with taint-tracked system calls, preventing unauthorized file or network leakage even under sophisticated jailbreak payloads.',
    ARRAY['cybersecurity', 'sandboxing', 'prompt injection', 'jailbreak defense', 'agent guardrails', 'zero-trust'],
    '88888888-8888-8888-8888-888888888888',
    'ACCEPTED',
    8,
    '/uploads/papers/paper_103_camera_ready.pdf',
    3.50,
    'PASSED'
),
(
    'ea104104-0000-0000-0000-000000000104',
    104,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'c4444444-4444-4444-4444-444444444444',
    'Real-Time Edge Visual SLAM for Autonomous Quadruped Robotic Inspection',
    'Deploying quadrupeds in disaster environments requires high-frequency visual SLAM under strict energy budgets. We introduce a sub-milliwatt feature extraction pipeline implemented on RISC-V edge processors, maintaining 60 FPS trajectory tracking with 1.8cm average drift over 1km traverses.',
    ARRAY['robotics', 'visual slam', 'edge ai', 'tinyml', 'embodied ai', 'sim to real'],
    '44444444-4444-4444-4444-444444444444',
    'SUBMITTED',
    8,
    '/uploads/papers/paper_104_edge_slam.pdf',
    5.10,
    'PASSED'
),
(
    'ea105105-0000-0000-0000-000000000105',
    105,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'c2222222-2222-2222-2222-222222222222',
    'Divergent Review Demonstration: Speculative Execution in High-Churn Byzantine Networks',
    'We present a speculative state replication model designed for high-frequency trading agents operating across Byzantine network nodes. The system trades off worst-case abort latency for 4.2x higher throughput under benign network segments.',
    ARRAY['distributed systems', 'byzantine consensus', 'speculative execution', 'state replication', 'fault tolerance'],
    '33333333-3333-3333-3333-333333333333',
    'UNDER_REVIEW',
    8,
    '/uploads/papers/paper_105_speculative.pdf',
    8.90,
    'PASSED'
)
ON CONFLICT (id) DO NOTHING;

-- 8. SUBMISSION AUTHORS (9 authors linked to papers)
INSERT INTO submission_authors (id, submission_id, name, email, institution, department, country, is_corresponding, author_order)
VALUES 
-- Paper 101 Authors
('eb000001-0000-0000-0000-000000000001', 'ea101101-0000-0000-0000-000000000101', 'Prof. Elena Rostova', 'author1@mit.edu', 'Massachusetts Institute of Technology', 'CSAIL', 'USA', true, 1),
('eb000001-0000-0000-0000-000000000002', 'ea101101-0000-0000-0000-000000000101', 'Dr. Kenji Sato', 'sato@mech.u-tokyo.ac.jp', 'University of Tokyo', 'Mechano-Informatics', 'Japan', false, 2),
-- Paper 102 Authors
('eb000001-0000-0000-0000-000000000003', 'ea102102-0000-0000-0000-000000000102', 'Alex Vance', 'author2@stanford.edu', 'Stanford University', 'Computer Science', 'USA', true, 1),
('eb000001-0000-0000-0000-000000000004', 'ea102102-0000-0000-0000-000000000102', 'Dr. Devlin Smith', 'dsmith@stanford.edu', 'Stanford University', 'Computer Science', 'USA', false, 2),
-- Paper 103 Author
('eb000001-0000-0000-0000-000000000005', 'ea103103-0000-0000-0000-000000000103', 'Tanya Rao', 'trao@cmu.edu', 'Carnegie Mellon University', 'CyLab', 'USA', true, 1),
-- Paper 104 Authors
('eb000001-0000-0000-0000-000000000006', 'ea104104-0000-0000-0000-000000000104', 'Rajesh Varma', 'rvarma@vignan.ac.in', 'Vignan''s Foundation for Science, Technology & Research', 'Computer Science and Engineering', 'India', true, 1),
('eb000001-0000-0000-0000-000000000007', 'ea104104-0000-0000-0000-000000000104', 'Dr. Aris Thorne', 'athorne@vignan.ac.in', 'Vignan''s Foundation for Science, Technology & Research', 'Computer Science and Engineering', 'India', false, 2),
-- Paper 105 Author
('eb000001-0000-0000-0000-000000000008', 'ea105105-0000-0000-0000-000000000105', 'Gabriel Silva', 'gsilva@usp.br', 'University of São Paulo', 'Computer Science', 'Brazil', true, 1)
ON CONFLICT (id) DO NOTHING;

-- 9. REVIEWER ASSIGNMENTS (4 assignments matching db.ts)
INSERT INTO reviewer_assignments (id, submission_id, reviewer_id, assigned_by, match_score, status, due_date, assigned_at)
VALUES 
('ec000001-0000-0000-0000-000000000001', 'ea103103-0000-0000-0000-000000000103', 'e0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 94.50, 'COMPLETED', '2026-11-10', '2026-08-26 10:00:00+00'),
('ec000001-0000-0000-0000-000000000002', 'ea103103-0000-0000-0000-000000000103', 'e0000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 88.00, 'COMPLETED', '2026-11-10', '2026-08-26 10:00:00+00'),
('ec000001-0000-0000-0000-000000000003', 'ea105105-0000-0000-0000-000000000105', 'e0000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 86.00, 'COMPLETED', '2026-11-10', '2026-08-29 10:00:00+00'),
('ec000001-0000-0000-0000-000000000004', 'ea105105-0000-0000-0000-000000000105', 'e0000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 79.50, 'COMPLETED', '2026-11-10', '2026-08-29 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 10. REVIEWS (4 reviews with intentional Paper 105 divergence: score 9 vs score 3)
INSERT INTO reviews (id, assignment_id, submission_id, reviewer_id, overall_score, confidence, soundness_score, originality_score, presentation_score, recommendation, strengths, weaknesses, comments_to_author, confidential_comments_to_chair, submitted_at)
VALUES 
(
    'ed000001-0000-0000-0000-000000000001',
    'ec000001-0000-0000-0000-000000000001',
    'ea103103-0000-0000-0000-000000000103',
    'e0000000-0000-0000-0000-000000000003',
    9,
    5,
    5,
    5,
    4,
    'ACCEPT',
    'Rigorous mathematical proof for the containment boundaries. The experimental evaluation on 1,500 real jailbreak prompts is thorough and convincing.',
    'Minor typo in Eq. 4 index bounds. Page limit is maxed out.',
    'Excellent work. Highly relevant to agent security and sandboxing.',
    'Strong candidate for best paper consideration.',
    '2026-08-30 15:30:00+00'
),
(
    'ed000001-0000-0000-0000-000000000002',
    'ec000001-0000-0000-0000-000000000002',
    'ea103103-0000-0000-0000-000000000103',
    'e0000000-0000-0000-0000-000000000009',
    8,
    4,
    4,
    4,
    5,
    'ACCEPT',
    'Practical defense mechanism with negligible runtime overhead (<1.4%). Clean presentation.',
    'Could contrast more directly with Seccomp-BPF filters.',
    'Well formulated contribution. Please expand the related works on BPF.',
    NULL,
    '2026-08-31 09:15:00+00'
),
(
    'ed000001-0000-0000-0000-000000000003',
    'ec000001-0000-0000-0000-000000000003',
    'ea105105-0000-0000-0000-000000000105',
    'e0000000-0000-0000-0000-000000000011',
    9,
    5,
    5,
    5,
    4,
    'ACCEPT',
    'Groundbreaking throughput numbers for speculative state replication in high-churn environments. Clear benchmark comparisons.',
    'Assumes bounded network delay during rollback phases.',
    'Inspiring architecture for high-frequency trading networks.',
    'Clear accept. Highly original.',
    '2026-09-02 11:00:00+00'
),
(
    'ed000001-0000-0000-0000-000000000004',
    'ec000001-0000-0000-0000-000000000004',
    'ea105105-0000-0000-0000-000000000105',
    'e0000000-0000-0000-0000-000000000008',
    3,
    5,
    2,
    3,
    3,
    'REJECT',
    'Interesting empirical speedups in ideal scenarios.',
    'The safety invariants are broken when Byzantine nodes collude during speculative phases. The paper glosses over total eclipse attacks.',
    'The theoretical model does not guarantee liveness when adversarial nodes partition the cluster.',
    'Fatal flaw in Theorem 2 liveness claim. Reject unless major revisions add proofs.',
    '2026-09-03 14:40:00+00'
)
ON CONFLICT (id) DO NOTHING;

-- 11. DECISIONS (1 chair decision for Paper 103)
INSERT INTO decisions (id, submission_id, ai_recommendation, ai_reasoning, divergence_flag, final_decision, decided_by, decision_letter, decided_at, notification_sent)
VALUES 
(
    'ee000001-0000-0000-0000-000000000001',
    'ea103103-0000-0000-0000-000000000103',
    'ACCEPT',
    'Reviewers unanimous in praise (Scores 9 and 8). High confidence ratings (5, 4). Robust experimental validation with 0 COI flags.',
    false,
    'ACCEPT',
    '11111111-1111-1111-1111-111111111111',
    'Dear Tanya Rao,\n\nWe are pleased to inform you that your paper #103 titled "Jailbreak Resistant Guardrails and Sandboxing for Autonomous Agent Tool Execution" has been ACCEPTED for presentation at AGENTIC-AI-2026.\n\nPlease address minor feedback in the camera-ready version due December 10, 2026.\n\nBest regards,\nConference Chairs, Vignan University',
    '2026-09-04 10:00:00+00',
    true
)
ON CONFLICT (id) DO NOTHING;

-- 12. REGISTRATIONS (2 delegate registrations)
INSERT INTO registrations (id, conference_id, user_id, submission_id, category, fee_amount, currency, status, created_at)
VALUES 
('ef000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', 'ea103103-0000-0000-0000-000000000103', 'AUTHOR', 12000.00, 'INR', 'CONFIRMED', '2026-09-05 09:00:00+00'),
('ef000001-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', NULL, 'STUDENT', 3500.00, 'INR', 'CONFIRMED', '2026-09-06 11:20:00+00')
ON CONFLICT (id) DO NOTHING;

-- 13. PAYMENTS (2 sandbox payment transactions)
INSERT INTO payments (id, registration_id, amount, currency, payment_mode, gateway_order_id, gateway_payment_id, status, receipt_url, created_at, verified_at)
VALUES 
('fa000001-0000-0000-0000-000000000001', 'ef000001-0000-0000-0000-000000000001', 12000.00, 'INR', 'SANDBOX', 'ORDER-892101-441', 'PAY-SANDBOX-89210101', 'SUCCESS', '/receipts/RCPT-892101.pdf', '2026-09-05 09:05:00+00', '2026-09-05 09:05:02+00'),
('fa000001-0000-0000-0000-000000000002', 'ef000001-0000-0000-0000-000000000002', 3500.00, 'INR', 'SANDBOX', 'ORDER-901284-712', 'PAY-SANDBOX-90128402', 'SUCCESS', '/receipts/RCPT-901284.pdf', '2026-09-06 11:25:00+00', '2026-09-06 11:25:02+00')
ON CONFLICT (id) DO NOTHING;

-- 14. SESSIONS (6 conference programme sessions across 3 dates in IST)
INSERT INTO sessions (id, conference_id, track_id, title, room, session_date, start_time, end_time, created_at)
VALUES 
('fb000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1111111-1111-1111-1111-111111111111', 'Session 1: Autonomous Agents - Autonomous Swarms & Microgrid Coordination', 'Main Auditorium (Hall A)', '2026-09-12', '09:30:00', '11:00:00', '2026-09-07 10:00:00+00'),
('fb000001-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c2222222-2222-2222-2222-222222222222', 'Session 2: Deep Learning - Chain-of-Thought Reasoning & Diagnostic Trees', 'Seminar Hall B (CSE Block)', '2026-09-12', '11:30:00', '13:00:00', '2026-09-07 10:00:00+00'),
('fb000001-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c3333333-3333-3333-3333-333333333333', 'Session 3: Trustworthy AI, Alignment - Agent Sandboxing & Guardrails', 'Colloquium Room C (AI Research Center)', '2026-09-15', '09:30:00', '11:00:00', '2026-09-07 10:00:00+00'),
('fb000001-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c4444444-4444-4444-4444-444444444444', 'Session 4: Edge AI, Robotics - Quadruped SLAM & Physical Autonomous Systems', 'Main Auditorium (Hall A)', '2026-09-15', '14:00:00', '15:30:00', '2026-09-07 10:00:00+00'),
('fb000001-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c2222222-2222-2222-2222-222222222222', 'Session 5: Deep Learning - Speculative Execution & Byzantine Consensus', 'Seminar Hall B (CSE Block)', '2026-09-16', '09:30:00', '11:00:00', '2026-09-07 10:00:00+00'),
('fb000001-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1111111-1111-1111-1111-111111111111', 'Session 6: Autonomous Agents - Multi-Agent Consensus & Collaboration Protocols', 'Main Auditorium (Hall A)', '2026-09-16', '11:30:00', '13:00:00', '2026-09-07 10:00:00+00')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  track_id = EXCLUDED.track_id,
  room = EXCLUDED.room,
  session_date = EXCLUDED.session_date,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time;

-- 15. SESSION CHAIRS (Linking sessions to chair users)
INSERT INTO session_chairs (id, session_id, user_id)
VALUES 
('fc000001-0000-0000-0000-000000000001', 'fb000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
('fc000001-0000-0000-0000-000000000002', 'fb000001-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777'),
('fc000001-0000-0000-0000-000000000003', 'fb000001-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555'),
('fc000001-0000-0000-0000-000000000004', 'fb000001-0000-0000-0000-000000000004', '99999999-9999-9999-9999-999999999993'),
('fc000001-0000-0000-0000-000000000005', 'fb000001-0000-0000-0000-000000000005', '99999999-9999-9999-9999-999999999992'),
('fc000001-0000-0000-0000-000000000006', 'fb000001-0000-0000-0000-000000000006', '99999999-9999-9999-9999-999999999901')
ON CONFLICT (id) DO UPDATE SET
  session_id = EXCLUDED.session_id,
  user_id = EXCLUDED.user_id;

-- 16. SESSION PAPERS (Papers presented in timetable slots)
INSERT INTO session_papers (id, session_id, submission_id, presentation_order, start_time, end_time)
VALUES 
('fd000001-0000-0000-0000-000000000001', 'fb000001-0000-0000-0000-000000000001', 'ea101101-0000-0000-0000-000000000101', 1, '09:30:00', '09:55:00'),
('fd000001-0000-0000-0000-000000000002', 'fb000001-0000-0000-0000-000000000002', 'ea102102-0000-0000-0000-000000000102', 1, '11:30:00', '11:55:00'),
('fd000001-0000-0000-0000-000000000003', 'fb000001-0000-0000-0000-000000000003', 'ea103103-0000-0000-0000-000000000103', 1, '09:30:00', '09:55:00'),
('fd000001-0000-0000-0000-000000000004', 'fb000001-0000-0000-0000-000000000004', 'ea104104-0000-0000-0000-000000000104', 1, '14:00:00', '14:25:00'),
('fd000001-0000-0000-0000-000000000005', 'fb000001-0000-0000-0000-000000000005', 'ea105105-0000-0000-0000-000000000105', 1, '09:30:00', '09:55:00'),
('fd000001-0000-0000-0000-000000000006', 'fb000001-0000-0000-0000-000000000006', 'ea106106-0000-0000-0000-000000000106', 1, '11:30:00', '11:55:00')
ON CONFLICT (id) DO UPDATE SET
  session_id = EXCLUDED.session_id,
  submission_id = EXCLUDED.submission_id,
  presentation_order = EXCLUDED.presentation_order,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time;

-- 17. CERTIFICATES (2 verified credentials with cryptographic hashes)
INSERT INTO certificates (id, certificate_number, conference_id, recipient_name, recipient_email, role, paper_title, verification_hash, issue_date, pdf_url)
VALUES 
(
    'fe000001-0000-0000-0000-000000000001',
    'VIGNAN-CONF2026-CERT-88492',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Tanya Rao',
    'trao@cmu.edu',
    'PRESENTER',
    'Jailbreak Resistant Guardrails and Sandboxing for Autonomous Agent Tool Execution',
    'e8f39a1b0728c4d5e9f1a2b3c4d5e6f7a8b9c0d1',
    '2027-01-20',
    '/certificates/VIGNAN-CONF2026-CERT-88492/verify'
),
(
    'fe000001-0000-0000-0000-000000000002',
    'VIGNAN-CONF2026-CERT-88493',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Dr. Vikramaditya Rao',
    'vrao@iitm.ac.in',
    'REVIEWER',
    NULL,
    'b1a2c3d4e5f678901234567890abcdef12345678',
    '2027-01-20',
    '/certificates/VIGNAN-CONF2026-CERT-88493/verify'
)
ON CONFLICT (certificate_number) DO NOTHING;

-- 18. PROCEEDINGS (1 compiled volume with Table of Contents)
INSERT INTO proceedings (id, conference_id, title, isbn, total_papers, total_pages, table_of_contents, compiled_at)
VALUES 
(
    'ff000001-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Proceedings of the International Conference on Agentic AI & Autonomous Systems (AGENTIC-AI-2026)',
    'ISBN pending',
    1,
    8,
    '[{"track_name": "Trustworthy AI, Alignment & Cybersecurity", "papers": [{"paper_number": 103, "title": "Jailbreak Resistant Guardrails and Sandboxing for Autonomous Agent Tool Execution", "authors": "Tanya Rao", "page_range": "pp. 1-8"}]}]'::jsonb,
    '2026-09-08 12:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

