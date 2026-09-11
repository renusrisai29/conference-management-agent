export type Role = 'ADMIN' | 'CHAIR' | 'ORGANIZER' | 'REVIEWER' | 'AUTHOR' | 'PARTICIPANT' | 'SESSION_CHAIR';

export interface User {
  id: string;
  email: string;
  full_name: string;
  institution: string;
  department?: string;
  designation?: string;
  role: Role;
  orcid_id?: string;
  scopus_id?: string;
  is_active: boolean;
}

export interface Track {
  id: string;
  conference_id: string;
  name: string;
  code: string;
  description: string;
  topics: string[];
}

export interface ConferenceDates {
  id: string;
  conference_id: string;
  cfp_open_date: string;
  submission_deadline: string;
  review_deadline: string;
  notification_date: string;
  camera_ready_deadline: string;
  registration_deadline: string;
  conference_start_date: string;
  conference_end_date: string;
}

export interface Conference {
  id: string;
  name: string;
  acronym: string;
  theme: string;
  description: string;
  institution: string;
  venue: string;
  mode: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';
  website_url: string;
  submission_format: string;
  max_pages: number;
  review_model: 'SINGLE_BLIND' | 'DOUBLE_BLIND';
  acceptance_policy: string;
  isbn?: string;
  status: string;
  dates?: ConferenceDates;
  tracks?: Track[];
}

export interface SubmissionAuthor {
  id?: string;
  name: string;
  email: string;
  institution: string;
  department?: string;
  country?: string;
  is_corresponding?: boolean;
}

export interface Submission {
  id: string;
  paper_number: number;
  conference_id: string;
  track_id: string;
  track_name?: string;
  title: string;
  abstract: string;
  keywords: string[];
  primary_author_id: string;
  authors: SubmissionAuthor[];
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REVISION_REQUIRED' | 'REJECTED' | 'CAMERA_READY';
  page_count: number;
  file_path?: string;
  similarity_score: number;
  similarity_status: 'PENDING' | 'PASSED' | 'FLAGGED';
  created_at: string;
  updated_at: string;
}

export interface Agent17Publication {
  title: string;
  year: number;
  doi?: string;
  citations: number;
  venue: string;
  co_authors: string[];
  domain: string;
  keywords: string[];
}

export interface Agent17Researcher {
  researcher_id: string;
  name: string;
  department: string;
  institution: string;
  affiliation: string;
  scopus_author_id: string;
  orcid: string;
  expertise: string[];
  research_areas: string[];
  keywords: string[];
  h_index: number;
  i10_index: number;
  total_citations: number;
  current_workload: number;
  max_workload: number;
  is_available: boolean;
  co_authors: string[];
  publications: Agent17Publication[];
}

export interface ReviewerMatchScore {
  reviewer: Agent17Researcher;
  total_score: number;
  expertise_score: number;
  keyword_score: number;
  research_area_score: number;
  workload_score: number;
  suitability_score: number;
  coi_status: {
    has_conflict: boolean;
    reasons: string[];
  };
  recommendation: 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'BORDERLINE' | 'CONFLICT';
}

export interface ReviewerAssignment {
  id: string;
  submission_id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_institution: string;
  match_score: number;
  status: 'ASSIGNED' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED';
  due_date: string;
  assigned_at: string;
}

export interface Review {
  id: string;
  assignment_id: string;
  submission_id: string;
  reviewer_id: string;
  reviewer_name: string;
  overall_score: number;
  confidence: number;
  soundness_score: number;
  originality_score: number;
  presentation_score: number;
  recommendation: 'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT';
  strengths: string;
  weaknesses: string;
  comments_to_author: string;
  confidential_comments_to_chair?: string;
  submitted_at: string;
}

export interface Decision {
  id: string;
  submission_id: string;
  ai_recommendation: 'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT';
  ai_reasoning: string;
  divergence_flag: boolean;
  final_decision: 'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT';
  decided_by: string;
  decision_letter: string;
  decided_at: string;
  notification_sent: boolean;
}

export interface Registration {
  id: string;
  conference_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  submission_id?: string;
  paper_title?: string;
  category: 'STUDENT' | 'RESEARCH_SCHOLAR' | 'FACULTY' | 'INDUSTRY' | 'AUTHOR' | 'PARTICIPANT';
  fee_amount: number;
  currency: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  payment_status: 'PENDING' | 'SUCCESS' | 'FAILED';
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  registration_id: string;
  order_id: string;
  payment_id?: string;
  amount: number;
  currency: string;
  payment_mode: 'SANDBOX';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  receipt_url?: string;
  created_at: string;
  verified_at?: string;
}

export interface SessionSchedule {
  id: string;
  conference_id: string;
  title: string;
  track_id: string;
  track_name: string;
  room: string;
  session_date: string;
  start_time: string;
  end_time: string;
  session_chair: {
    id: string;
    name: string;
    institution: string;
  };
  papers: {
    submission_id: string;
    paper_number: number;
    title: string;
    presenter_name: string;
    start_time: string;
    end_time: string;
  }[];
}

export interface CertificateRecord {
  id: string;
  certificate_number: string;
  conference_id: string;
  conference_name: string;
  recipient_name: string;
  recipient_email: string;
  role: 'AUTHOR' | 'PRESENTER' | 'REVIEWER' | 'SESSION_CHAIR' | 'PARTICIPANT';
  paper_title?: string;
  verification_hash: string;
  issue_date: string;
  verification_url: string;
}

export interface ProceedingsRecord {
  id: string;
  conference_id: string;
  title: string;
  theme: string;
  isbn: string;
  total_papers: number;
  total_pages: number;
  table_of_contents: {
    track_name: string;
    papers: {
      paper_number: number;
      title: string;
      authors: string;
      page_range: string;
    }[];
  }[];
  compiled_at: string;
}

export interface ConferenceAnalytics {
  total_submissions: number;
  accepted: number;
  rejected: number;
  revisions: number;
  acceptance_rate: number;
  total_reviewers: number;
  reviews_completed: number;
  reviews_pending: number;
  divergent_reviews_count: number;
  total_registrations: number;
  total_revenue: number;
  total_sessions: number;
  certificates_issued: number;
  proceedings_status: string;
  feedback_avg_rating: number;
  submissions_by_track: { track: string; count: number }[];
}

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tool_invocations?: {
    tool_name: string;
    parameters: any;
    result: any;
    status: 'pending' | 'completed' | 'failed';
  }[];
  quick_actions?: string[];
}
