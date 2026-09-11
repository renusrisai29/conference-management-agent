# Database Architecture & Supabase Schema

The Conference Management Agent uses a normalized PostgreSQL schema designed for Supabase.

## Table Architecture

| Table | Entity Purpose | Key Fields |
|---|---|---|
| `users` | All system participants & roles | `id`, `email`, `role`, `institution`, `scopus_id`, `orcid_id` |
| `conferences` | Conference master records | `id`, `name`, `acronym`, `institution`, `venue`, `review_model`, `isbn` |
| `conference_dates` | Milestone deadlines | `submission_deadline`, `review_deadline`, `conference_start_date` |
| `tracks` & `topics` | Academic groupings | `track_id`, `name`, `code`, `topics` |
| `submissions` | Manuscript metadata & scores | `paper_number`, `title`, `abstract`, `status`, `similarity_score` |
| `submission_authors` | Co-author information | `name`, `email`, `institution`, `is_corresponding` |
| `reviewers` | Faculty reviewer capacity | `user_id`, `agent17_id`, `h_index`, `max_workload`, `current_workload` |
| `conflicts_of_interest`| Flagged peer review conflicts | `submission_id`, `reviewer_id`, `conflict_type`, `details` |
| `reviewer_assignments`| Active paper-to-reviewer links| `match_score`, `status`, `due_date` |
| `reviews` | Structured evaluation rubrics | `overall_score`, `confidence`, `recommendation`, `strengths`, `weaknesses` |
| `decisions` | AI recommendations & Chair decisions| `ai_recommendation`, `divergence_flag`, `final_decision`, `letter` |
| `registrations` | Delegate registrations | `category`, `fee_amount`, `currency`, `payment_status` |
| `payments` | Sandbox transactions & receipts| `order_id`, `payment_id`, `amount`, `payment_mode`, `verified_at` |
| `sessions` | Conflict-free timetable slots | `room`, `session_date`, `start_time`, `session_chair_id` |
| `certificates` | Digital academic credentials | `certificate_number`, `verification_hash`, `recipient_name`, `role` |
| `proceedings` | Compiled volume & ISBN | `title`, `isbn`, `total_papers`, `table_of_contents` |
| `audit_logs` | Immutable audit trail | `action`, `actor_id`, `details`, `created_at` |

## Migration Files
- `database/migrations/001_initial_schema.sql`
- `database/seed/seed.sql`
