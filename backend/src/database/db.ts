import { v4 as uuidv4 } from 'uuid';
import {
  User, Conference, Track, Submission, ReviewerAssignment,
  Review, ReviewReminder, Decision, Registration, PaymentRecord,
  SessionSchedule, CertificateRecord, ProceedingsRecord, ConferenceAnalytics
} from '../types';

export class ConferenceDatabase {
  public users: User[] = [];
  public conferences: Conference[] = [];
  public tracks: Track[] = [];
  public submissions: Submission[] = [];
  public assignments: ReviewerAssignment[] = [];
  public reviews: Review[] = [];
  public reminders: ReviewReminder[] = [];
  public decisions: Decision[] = [];
  public registrations: Registration[] = [];
  public payments: PaymentRecord[] = [];
  public sessions: SessionSchedule[] = [];
  public certificates: CertificateRecord[] = [];
  public proceedings: ProceedingsRecord[] = [];
  public auditLogs: any[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Users
    this.users = [
      {
        id: 'u-chair-01',
        email: 'chair@vignan.ac.in',
        full_name: 'Dr. Radhika Sharma',
        institution: "Vignan's Foundation for Science, Technology & Research",
        department: 'Computer Science and Engineering',
        designation: 'Professor & General Chair',
        role: 'CHAIR',
        orcid_id: '0000-0002-1825-0097',
        scopus_id: '57193821000',
        is_active: true,
        created_at: '2026-08-01T09:00:00Z'
      },
      {
        id: 'u-org-02',
        email: 'organizer@vignan.ac.in',
        full_name: 'Dr. Suresh Kumar',
        institution: "Vignan's Foundation for Science, Technology & Research",
        department: 'Information Technology',
        designation: 'Associate Professor & Organizing Chair',
        role: 'ORGANIZER',
        orcid_id: '0000-0003-2941-1102',
        scopus_id: '57201948201',
        is_active: true,
        created_at: '2026-08-01T09:00:00Z'
      },
      {
        id: 'u-auth-03',
        email: 'author1@mit.edu',
        full_name: 'Prof. Elena Rostova',
        institution: 'Massachusetts Institute of Technology',
        department: 'CSAIL',
        designation: 'Principal Investigator',
        role: 'AUTHOR',
        orcid_id: '0000-0001-4921-7782',
        scopus_id: '56481029481',
        is_active: true,
        created_at: '2026-08-05T10:30:00Z'
      },
      {
        id: 'u-auth-04',
        email: 'author2@stanford.edu',
        full_name: 'Alex Vance',
        institution: 'Stanford University',
        department: 'Computer Science',
        designation: 'PhD Candidate',
        role: 'AUTHOR',
        orcid_id: '0000-0002-9981-4019',
        scopus_id: '57294810293',
        is_active: true,
        created_at: '2026-08-10T14:15:00Z'
      },
      {
        id: 'u-rev-05',
        email: 'reviewer1@oxford.ac.uk',
        full_name: 'Dr. Marcus Holloway',
        institution: 'University of Oxford',
        department: 'Department of Computer Science',
        designation: 'Reader in Machine Learning',
        role: 'REVIEWER',
        orcid_id: '0000-0001-8392-1920',
        scopus_id: '57102938471',
        is_active: true,
        created_at: '2026-08-11T11:00:00Z'
      },
      {
        id: 'u-part-06',
        email: 'participant@iitb.ac.in',
        full_name: 'Kiran Patel',
        institution: 'Indian Institute of Technology Bombay',
        department: 'Electrical Engineering',
        designation: 'Research Fellow',
        role: 'PARTICIPANT',
        orcid_id: '0000-0003-8192-3049',
        scopus_id: '57391820491',
        is_active: true,
        created_at: '2026-08-15T16:20:00Z'
      },
      {
        id: 'u-sess-07',
        email: 'chair.session@nus.edu.sg',
        full_name: 'Prof. Sofia Chen',
        institution: 'National University of Singapore',
        department: 'Institute for Artificial Intelligence',
        designation: 'Chair Professor',
        role: 'SESSION_CHAIR',
        orcid_id: '0000-0003-1928-3011',
        scopus_id: '56829103948',
        is_active: true,
        created_at: '2026-08-16T12:00:00Z'
      }
    ];

    // 2. Conference
    const confId = 'conf-aiai-2026';
    this.conferences = [
      {
        id: confId,
        name: 'International Conference on Agentic AI & Autonomous Systems',
        acronym: 'AGENTIC-AI-2026',
        theme: 'Architectures, Multi-Agent Collaboration, and Verification of Autonomous Systems',
        description: 'The premier academic conference showcasing advancements in autonomous agent architectures, multi-agent reinforcement learning, formal verification, and safe embodied AI.',
        institution: "Vignan's Foundation for Science, Technology & Research",
        venue: "Main University Auditorium & CSE Complex, Vignan Deemed to be University, Vadlamudi, AP, India",
        mode: 'HYBRID',
        website_url: 'https://vignan.ac.in/agentic-ai-2026',
        submission_format: 'IEEE Double Column PDF',
        max_pages: 8,
        review_model: 'DOUBLE_BLIND',
        acceptance_policy: 'MIN_2_ACCEPT_NO_REJECT',
        isbn: 'ISBN pending',
        status: 'ACTIVE',
        dates: {
          id: 'dates-01',
          conference_id: confId,
          cfp_open_date: '2026-08-01',
          submission_deadline: '2026-10-15',
          review_deadline: '2026-11-10',
          notification_date: '2026-11-25',
          camera_ready_deadline: '2026-12-10',
          registration_deadline: '2026-12-20',
          conference_start_date: '2027-01-18',
          conference_end_date: '2027-01-20'
        }
      }
    ];

    // 3. Tracks
    this.tracks = [
      {
        id: 'trk-01',
        conference_id: confId,
        name: 'Autonomous Agents & Multi-Agent Coordination',
        code: 'TRACK-1',
        description: 'Decentralized consensus, multi-agent reinforcement learning, auction theory, game-theoretic agent governance.',
        topics: ['Multi-Agent Reinforcement Learning', 'Decentralized Consensus', 'Swarm Intelligence', 'Agent Auctions']
      },
      {
        id: 'trk-02',
        conference_id: confId,
        name: 'Deep Learning & Foundation Reasoning Models',
        code: 'TRACK-2',
        description: 'Chain-of-thought, reasoning models, self-reflection, neuro-symbolic reasoning, and RAG architectures.',
        topics: ['LLM Reasoning', 'Chain of Thought', 'Neuro-Symbolic AI', 'RAG & Memory Architectures']
      },
      {
        id: 'trk-03',
        conference_id: confId,
        name: 'Trustworthy AI, Alignment & Cybersecurity',
        code: 'TRACK-3',
        description: 'Agent sandboxing, prompt-injection defense, differential privacy, certified safety boundaries.',
        topics: ['Agent Sandboxing', 'Prompt Defense', 'Adversarial Robustness', 'Zero-Trust AI']
      },
      {
        id: 'trk-04',
        conference_id: confId,
        name: 'Edge AI, Robotics & Embodied Intelligence',
        code: 'TRACK-4',
        description: 'Embodied navigation, quadruped manipulation, TinyML microcontrollers, visual SLAM.',
        topics: ['Embodied AI', 'Visual SLAM', 'Sim-to-Real Transfer', 'TinyML & Edge Acceleration']
      }
    ];

    // 4. Submissions
    this.submissions = [
      {
        id: 'sub-101',
        paper_number: 101,
        conference_id: confId,
        track_id: 'trk-01',
        track_name: 'Autonomous Agents & Multi-Agent Coordination',
        title: 'Decentralized Swarm Coordination for Autonomous Microgrid Power Optimization',
        abstract: 'We present a resilient multi-agent reinforcement learning framework for autonomous power dispatch across distributed microgrids. Using decentralized consensus protocols and localized bidding, our agents achieve 99.4% grid stability during simulated line failures without central coordination.',
        keywords: ['autonomous agents', 'multi-agent reinforcement learning', 'microgrid', 'decentralized consensus', 'smart grid'],
        primary_author_id: 'u-auth-03',
        authors: [
          {
            id: 'a1',
            name: 'Prof. Elena Rostova',
            email: 'author1@mit.edu',
            institution: 'Massachusetts Institute of Technology',
            department: 'CSAIL',
            country: 'USA',
            is_corresponding: true,
            author_order: 1
          },
          {
            id: 'a2',
            name: 'Dr. Kenji Sato',
            email: 'sato@mech.u-tokyo.ac.jp',
            institution: 'University of Tokyo',
            department: 'Mechano-Informatics',
            country: 'Japan',
            is_corresponding: false,
            author_order: 2
          }
        ],
        status: 'UNDER_REVIEW',
        page_count: 8,
        file_path: '/uploads/papers/paper_101_final.pdf',
        similarity_score: 4.2,
        similarity_status: 'PASSED',
        created_at: '2026-08-20T10:00:00Z',
        updated_at: '2026-08-20T10:00:00Z'
      },
      {
        id: 'sub-102',
        paper_number: 102,
        conference_id: confId,
        track_id: 'trk-02',
        track_name: 'Deep Learning & Foundation Reasoning Models',
        title: 'Verifiable Chain-of-Thought Reasoning in Multi-Agent Diagnostic Systems',
        abstract: 'Complex multi-step reasoning in clinical and financial domains requires verifiable proof chains. We introduce a neuro-symbolic audit pipeline that couples LLM token generation with formal logic engines, producing auditable deduction trees that eliminate 98.2% of hallucinated steps.',
        keywords: ['llm', 'chain of thought', 'reasoning', 'neuro-symbolic', 'verification trees', 'hallucination mitigation'],
        primary_author_id: 'u-auth-04',
        authors: [
          {
            id: 'a3',
            name: 'Alex Vance',
            email: 'author2@stanford.edu',
            institution: 'Stanford University',
            department: 'Computer Science',
            country: 'USA',
            is_corresponding: true,
            author_order: 1
          },
          {
            id: 'a4',
            name: 'Dr. Devlin Smith',
            email: 'dsmith@stanford.edu',
            institution: 'Stanford University',
            department: 'Computer Science',
            country: 'USA',
            is_corresponding: false,
            author_order: 2
          }
        ],
        status: 'SUBMITTED',
        page_count: 7,
        file_path: '/uploads/papers/paper_102_manuscript.pdf',
        similarity_score: 6.8,
        similarity_status: 'PASSED',
        created_at: '2026-08-22T14:30:00Z',
        updated_at: '2026-08-22T14:30:00Z'
      },
      {
        id: 'sub-103',
        paper_number: 103,
        conference_id: confId,
        track_id: 'trk-03',
        track_name: 'Trustworthy AI, Alignment & Cybersecurity',
        title: 'Jailbreak Resistant Guardrails and Sandboxing for Autonomous Agent Tool Execution',
        abstract: 'When autonomous LLM agents execute bash or Python commands, prompt injection attacks can bypass perimeter defenses. We formulate a formal sandboxing boundary with taint-tracked system calls, preventing unauthorized file or network leakage even under sophisticated jailbreak payloads.',
        keywords: ['cybersecurity', 'sandboxing', 'prompt injection', 'jailbreak defense', 'agent guardrails', 'zero-trust'],
        primary_author_id: 'u-auth-03',
        authors: [
          {
            id: 'a5',
            name: 'Tanya Rao',
            email: 'trao@cmu.edu',
            institution: 'Carnegie Mellon University',
            department: 'CyLab',
            country: 'USA',
            is_corresponding: true,
            author_order: 1
          }
        ],
        status: 'ACCEPTED',
        page_count: 8,
        file_path: '/uploads/papers/paper_103_camera_ready.pdf',
        similarity_score: 3.5,
        similarity_status: 'PASSED',
        created_at: '2026-08-15T08:00:00Z',
        updated_at: '2026-09-01T11:00:00Z'
      },
      {
        id: 'sub-104',
        paper_number: 104,
        conference_id: confId,
        track_id: 'trk-04',
        track_name: 'Edge AI, Robotics & Embodied Intelligence',
        title: 'Real-Time Edge Visual SLAM for Autonomous Quadruped Robotic Inspection',
        abstract: 'Deploying quadrupeds in disaster environments requires high-frequency visual SLAM under strict energy budgets. We introduce a sub-milliwatt feature extraction pipeline implemented on RISC-V edge processors, maintaining 60 FPS trajectory tracking with 1.8cm average drift over 1km traverses.',
        keywords: ['robotics', 'visual slam', 'edge ai', 'tinyml', 'embodied ai', 'sim to real'],
        primary_author_id: 'u-auth-04',
        authors: [
          {
            id: 'a6',
            name: 'Rajesh Varma',
            email: 'rvarma@vignan.ac.in',
            institution: "Vignan's Foundation for Science, Technology & Research",
            department: 'Computer Science and Engineering',
            country: 'India',
            is_corresponding: true,
            author_order: 1
          },
          {
            id: 'a7',
            name: 'Dr. Aris Thorne',
            email: 'athorne@vignan.ac.in',
            institution: "Vignan's Foundation for Science, Technology & Research",
            department: 'Computer Science and Engineering',
            country: 'India',
            is_corresponding: false,
            author_order: 2
          }
        ],
        status: 'SUBMITTED',
        page_count: 8,
        file_path: '/uploads/papers/paper_104_edge_slam.pdf',
        similarity_score: 5.1,
        similarity_status: 'PASSED',
        created_at: '2026-08-25T16:00:00Z',
        updated_at: '2026-08-25T16:00:00Z'
      },
      {
        id: 'sub-105',
        paper_number: 105,
        conference_id: confId,
        track_id: 'trk-02',
        track_name: 'Deep Learning & Foundation Reasoning Models',
        title: 'Divergent Review Demonstration: Speculative Execution in High-Churn Byzantine Networks',
        abstract: 'We present a speculative state replication model designed for high-frequency trading agents operating across Byzantine network nodes. The system trades off worst-case abort latency for 4.2x higher throughput under benign network segments.',
        keywords: ['distributed systems', 'byzantine consensus', 'speculative execution', 'state replication', 'fault tolerance'],
        primary_author_id: 'u-auth-03',
        authors: [
          {
            id: 'a8',
            name: 'Gabriel Silva',
            email: 'gsilva@usp.br',
            institution: 'University of São Paulo',
            department: 'Computer Science',
            country: 'Brazil',
            is_corresponding: true,
            author_order: 1
          }
        ],
        status: 'UNDER_REVIEW',
        page_count: 8,
        file_path: '/uploads/papers/paper_105_speculative.pdf',
        similarity_score: 8.9,
        similarity_status: 'PASSED',
        created_at: '2026-08-28T09:00:00Z',
        updated_at: '2026-08-28T09:00:00Z'
      }
    ];

    // 5. Reviewer Assignments
    this.assignments = [
      {
        id: 'asgn-01',
        submission_id: 'sub-103',
        reviewer_id: 'FAC-A17-003',
        reviewer_name: 'Dr. Vikramaditya Rao',
        reviewer_institution: 'Indian Institute of Technology Madras',
        match_score: 94.5,
        status: 'COMPLETED',
        due_date: '2026-11-10',
        assigned_at: '2026-08-26T10:00:00Z'
      },
      {
        id: 'asgn-02',
        submission_id: 'sub-103',
        reviewer_id: 'FAC-A17-009',
        reviewer_name: 'Dr. Liam O’Connor',
        reviewer_institution: 'Australian National University',
        match_score: 88.0,
        status: 'COMPLETED',
        due_date: '2026-11-10',
        assigned_at: '2026-08-26T10:00:00Z'
      },
      // Divergent reviews for Paper 105
      {
        id: 'asgn-03',
        submission_id: 'sub-105',
        reviewer_id: 'FAC-A17-011',
        reviewer_name: 'Dr. Fatima Al-Mansoor',
        reviewer_institution: 'King Abdullah University of Science and Technology',
        match_score: 86.0,
        status: 'COMPLETED',
        due_date: '2026-11-10',
        assigned_at: '2026-08-29T10:00:00Z'
      },
      {
        id: 'asgn-04',
        submission_id: 'sub-105',
        reviewer_id: 'FAC-A17-008',
        reviewer_name: 'Dr. Marcus Holloway',
        reviewer_institution: 'University of Oxford',
        match_score: 79.5,
        status: 'COMPLETED',
        due_date: '2026-11-10',
        assigned_at: '2026-08-29T10:00:00Z'
      }
    ];

    // 6. Reviews (including intentional divergent reviews for Paper 105!)
    this.reviews = [
      {
        id: 'rev-01',
        assignment_id: 'asgn-01',
        submission_id: 'sub-103',
        reviewer_id: 'FAC-A17-003',
        reviewer_name: 'Dr. Vikramaditya Rao',
        overall_score: 9,
        confidence: 5,
        soundness_score: 5,
        originality_score: 5,
        presentation_score: 4,
        recommendation: 'ACCEPT',
        strengths: 'Rigorous mathematical proof for the containment boundaries. The experimental evaluation on 1,500 real jailbreak prompts is thorough and convincing.',
        weaknesses: 'Minor typo in Eq. 4 index bounds. Page limit is maxed out.',
        comments_to_author: 'Excellent work. Highly relevant to agent security and sandboxing.',
        confidential_comments_to_chair: 'Strong candidate for best paper consideration.',
        submitted_at: '2026-08-30T15:30:00Z'
      },
      {
        id: 'rev-02',
        assignment_id: 'asgn-02',
        submission_id: 'sub-103',
        reviewer_id: 'FAC-A17-009',
        reviewer_name: 'Dr. Liam O’Connor',
        overall_score: 8,
        confidence: 4,
        soundness_score: 4,
        originality_score: 4,
        presentation_score: 5,
        recommendation: 'ACCEPT',
        strengths: 'Practical defense mechanism with negligible runtime overhead (<1.4%). Clean presentation.',
        weaknesses: 'Could contrast more directly with Seccomp-BPF filters.',
        comments_to_author: 'Well formulated contribution. Please expand the related works on BPF.',
        submitted_at: '2026-08-31T09:15:00Z'
      },
      // Paper 105: Divergent Review 1 (Strong Accept)
      {
        id: 'rev-03',
        assignment_id: 'asgn-03',
        submission_id: 'sub-105',
        reviewer_id: 'FAC-A17-011',
        reviewer_name: 'Dr. Fatima Al-Mansoor',
        overall_score: 9,
        confidence: 5,
        soundness_score: 5,
        originality_score: 5,
        presentation_score: 4,
        recommendation: 'ACCEPT',
        strengths: 'Groundbreaking throughput numbers for speculative state replication in high-churn environments. Clear benchmark comparisons.',
        weaknesses: 'Assumes bounded network delay during rollback phases.',
        comments_to_author: 'Inspiring architecture for high-frequency trading networks.',
        confidential_comments_to_chair: 'Clear accept. Highly original.',
        submitted_at: '2026-09-02T11:00:00Z'
      },
      // Paper 105: Divergent Review 2 (Strong Reject - creates Divergence Flag!)
      {
        id: 'rev-04',
        assignment_id: 'asgn-04',
        submission_id: 'sub-105',
        reviewer_id: 'FAC-A17-008',
        reviewer_name: 'Dr. Marcus Holloway',
        overall_score: 3,
        confidence: 5,
        soundness_score: 2,
        originality_score: 3,
        presentation_score: 3,
        recommendation: 'REJECT',
        strengths: 'Interesting empirical speedups in ideal scenarios.',
        weaknesses: 'The safety invariants are broken when Byzantine nodes collude during speculative phases. The paper glosses over total eclipse attacks.',
        comments_to_author: 'The theoretical model does not guarantee liveness when adversarial nodes partition the cluster.',
        confidential_comments_to_chair: 'Fatal flaw in Theorem 2 liveness claim. Reject unless major revisions add proofs.',
        submitted_at: '2026-09-03T14:40:00Z'
      }
    ];

    // 7. Decisions
    this.decisions = [
      {
        id: 'dec-01',
        submission_id: 'sub-103',
        ai_recommendation: 'ACCEPT',
        ai_reasoning: 'Reviewers unanimous in praise (Scores 9 and 8). High confidence ratings (5, 4). Robust experimental validation with 0 COI flags.',
        divergence_flag: false,
        final_decision: 'ACCEPT',
        decided_by: 'Dr. Radhika Sharma (General Chair)',
        decision_letter: 'Dear Tanya Rao,\n\nWe are pleased to inform you that your paper #103 titled "Jailbreak Resistant Guardrails and Sandboxing for Autonomous Agent Tool Execution" has been ACCEPTED for presentation at AGENTIC-AI-2026.\n\nPlease address minor feedback in the camera-ready version due December 10, 2026.\n\nBest regards,\nConference Chairs, Vignan University',
        decided_at: '2026-09-04T10:00:00Z',
        notification_sent: true
      }
    ];

    // 8. Registrations & Payments
    this.registrations = [
      {
        id: 'reg-01',
        conference_id: confId,
        user_id: 'u-auth-03',
        user_name: 'Prof. Elena Rostova',
        user_email: 'author1@mit.edu',
        submission_id: 'sub-103',
        paper_title: 'Jailbreak Resistant Guardrails and Sandboxing for Autonomous Agent Tool Execution',
        category: 'AUTHOR',
        fee_amount: 12000,
        currency: 'INR',
        status: 'CONFIRMED',
        payment_status: 'SUCCESS',
        created_at: '2026-09-05T09:00:00Z'
      },
      {
        id: 'reg-02',
        conference_id: confId,
        user_id: 'u-part-06',
        user_name: 'Kiran Patel',
        user_email: 'participant@iitb.ac.in',
        category: 'STUDENT',
        fee_amount: 3500,
        currency: 'INR',
        status: 'CONFIRMED',
        payment_status: 'SUCCESS',
        created_at: '2026-09-06T11:20:00Z'
      }
    ];

    this.payments = [
      {
        id: 'pay-01',
        registration_id: 'reg-01',
        order_id: 'ORDER-892101-441',
        payment_id: 'PAY-SANDBOX-89210101',
        amount: 12000,
        currency: 'INR',
        payment_mode: 'SANDBOX',
        status: 'SUCCESS',
        receipt_url: '/receipts/RCPT-892101.pdf',
        created_at: '2026-09-05T09:05:00Z',
        verified_at: '2026-09-05T09:05:02Z'
      },
      {
        id: 'pay-02',
        registration_id: 'reg-02',
        order_id: 'ORDER-901284-712',
        payment_id: 'PAY-SANDBOX-90128402',
        amount: 3500,
        currency: 'INR',
        payment_mode: 'SANDBOX',
        status: 'SUCCESS',
        receipt_url: '/receipts/RCPT-901284.pdf',
        created_at: '2026-09-06T11:25:00Z',
        verified_at: '2026-09-06T11:25:02Z'
      }
    ];

    // 9. Sessions & Programme
    this.sessions = [
      {
        id: 'sess-01',
        conference_id: confId,
        title: 'Session 1A: Autonomous Multi-Agent Architectures & Protocols',
        track_id: 'trk-01',
        track_name: 'Autonomous Agents & Multi-Agent Coordination',
        room: 'Main Auditorium (Hall A)',
        session_date: '2027-01-18',
        start_time: '10:00 AM',
        end_time: '11:30 AM',
        session_chair: {
          id: 'u-chair-01',
          name: 'Dr. Radhika Sharma',
          institution: "Vignan's Foundation for Science, Technology & Research"
        },
        papers: [
          {
            submission_id: 'sub-101',
            paper_number: 101,
            title: 'Decentralized Swarm Coordination for Autonomous Microgrid Power Optimization',
            presenter_name: 'Prof. Elena Rostova',
            start_time: '10:00 AM',
            end_time: '10:25 AM'
          }
        ]
      },
      {
        id: 'sess-02',
        conference_id: confId,
        title: 'Session 2B: Trustworthy Agent Guardrails & Formal Verification',
        track_id: 'trk-03',
        track_name: 'Trustworthy AI, Alignment & Cybersecurity',
        room: 'Seminar Hall B (CSE Block)',
        session_date: '2027-01-18',
        start_time: '11:45 AM',
        end_time: '01:15 PM',
        session_chair: {
          id: 'u-sess-07',
          name: 'Prof. Sofia Chen',
          institution: 'National University of Singapore'
        },
        papers: [
          {
            submission_id: 'sub-103',
            paper_number: 103,
            title: 'Jailbreak Resistant Guardrails and Sandboxing for Autonomous Agent Tool Execution',
            presenter_name: 'Tanya Rao',
            start_time: '11:45 AM',
            end_time: '12:10 PM'
          }
        ]
      }
    ];

    // 10. Certificates
    this.certificates = [
      {
        id: 'cert-01',
        certificate_number: 'VIGNAN-CONF2026-CERT-88492',
        conference_id: confId,
        conference_name: 'International Conference on Agentic AI & Autonomous Systems',
        recipient_name: 'Tanya Rao',
        recipient_email: 'trao@cmu.edu',
        role: 'PRESENTER',
        paper_title: 'Jailbreak Resistant Guardrails and Sandboxing for Autonomous Agent Tool Execution',
        verification_hash: 'e8f39a1b0728c4d5e9f1a2b3c4d5e6f7a8b9c0d1',
        issue_date: '2027-01-20',
        verification_url: '/certificates/VIGNAN-CONF2026-CERT-88492/verify'
      },
      {
        id: 'cert-02',
        certificate_number: 'VIGNAN-CONF2026-CERT-88493',
        conference_id: confId,
        conference_name: 'International Conference on Agentic AI & Autonomous Systems',
        recipient_name: 'Dr. Vikramaditya Rao',
        recipient_email: 'vrao@iitm.ac.in',
        role: 'REVIEWER',
        verification_hash: 'b1a2c3d4e5f678901234567890abcdef12345678',
        issue_date: '2027-01-20',
        verification_url: '/certificates/VIGNAN-CONF2026-CERT-88493/verify'
      }
    ];

    // 11. Proceedings
    this.proceedings = [
      {
        id: 'proc-01',
        conference_id: confId,
        title: 'Proceedings of the International Conference on Agentic AI & Autonomous Systems (AGENTIC-AI-2026)',
        theme: 'Architectures, Collaboration, and Governance of Autonomous AI Agents',
        isbn: 'ISBN pending',
        total_papers: 1,
        total_pages: 8,
        table_of_contents: [
          {
            track_name: 'Trustworthy AI, Alignment & Cybersecurity',
            papers: [
              {
                paper_number: 103,
                title: 'Jailbreak Resistant Guardrails and Sandboxing for Autonomous Agent Tool Execution',
                authors: 'Tanya Rao',
                page_range: 'pp. 1-8'
              }
            ]
          }
        ],
        compiled_at: '2026-09-08T12:00:00Z'
      }
    ];
  }

  // Analytics Computation
  public getAnalytics(conferenceId?: string): ConferenceAnalytics {
    const total = this.submissions.length;
    const accepted = this.submissions.filter(s => s.status === 'ACCEPTED').length;
    const rejected = this.submissions.filter(s => s.status === 'REJECTED').length;
    const revisions = this.submissions.filter(s => s.status === 'REVISION_REQUIRED').length;
    const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    const completedReviews = this.reviews.length;
    const pendingReviews = this.assignments.filter(a => a.status === 'ASSIGNED').length;
    const divergent = this.decisions.filter(d => d.divergence_flag).length +
      (this.reviews.some(r => r.submission_id === 'sub-105' && r.overall_score >= 8) &&
       this.reviews.some(r => r.submission_id === 'sub-105' && r.overall_score <= 4) ? 1 : 0);

    const totalRevenue = this.payments.filter(p => p.status === 'SUCCESS').reduce((acc, p) => acc + p.amount, 0);

    const trackCounts: { [key: string]: number } = {};
    for (const sub of this.submissions) {
      const trackName = sub.track_name || 'General';
      trackCounts[trackName] = (trackCounts[trackName] || 0) + 1;
    }

    return {
      total_submissions: total,
      accepted,
      rejected,
      revisions,
      acceptance_rate: rate,
      total_reviewers: 18, // from Agent 17 mock database
      reviews_completed: completedReviews,
      reviews_pending: pendingReviews,
      divergent_reviews_count: divergent,
      total_registrations: this.registrations.length,
      total_revenue: totalRevenue,
      total_sessions: this.sessions.length,
      certificates_issued: this.certificates.length,
      proceedings_status: this.proceedings.length > 0 ? 'COMPILED' : 'DRAFT',
      feedback_avg_rating: 4.8,
      submissions_by_track: Object.entries(trackCounts).map(([track, count]) => ({ track, count }))
    };
  }
}

export const db = new ConferenceDatabase();
