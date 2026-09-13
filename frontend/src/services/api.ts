import {
  Conference, Submission, ReviewerMatchScore, ReviewerAssignment,
  Review, Decision, Registration, SessionSchedule, CertificateRecord,
  ProceedingsRecord, ConferenceAnalytics, AssistantChatMessage,
  EventArchiveRecord, ConferenceFeedback, FeedbackSummary
} from '../types';

// Dynamic API base URL: reads optional public Vite variable VITE_API_BASE_URL with /api fallback
const rawEnvBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
export const API_BASE = (() => {
  if (!rawEnvBase) {
    return '/api';
  }
  // Strip trailing slashes
  let normalized = rawEnvBase.replace(/\/+$/, '');
  // Ensure the configured base URL includes /api
  if (!normalized.endsWith('/api')) {
    normalized = `${normalized}/api`;
  }
  return normalized;
})();

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `HTTP Error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Conference & CFP
  getConference: (id: string = 'conf-aiai-2026') => fetchJson<Conference>(`/conferences/${id}`),
  updateConference: (id: string, data: Partial<Conference>, userRole: string = 'CHAIR') =>
    fetchJson<{ success: boolean; conference: Conference }>(`/conferences/${id}`, {
      method: 'PATCH',
      headers: {
        'x-user-role': userRole
      },
      body: JSON.stringify(data)
    }),
  getCfp: (id: string) =>
    fetchJson<{ success: boolean; cfp_markdown: string; generated_with: string; generated_at: string; distributed: boolean; hash: string }>(`/conferences/${id}/cfp`),
  generateCfp: (id: string, theme?: string) =>
    fetchJson<{ generated_with: string; cfp_markdown: string }>(`/conferences/${id}/cfp/generate`, {
      method: 'POST',
      body: JSON.stringify({ theme })
    }),

  // Submissions
  getSubmissions: () => fetchJson<Submission[]>('/submissions'),
  getSubmission: (id: string) => fetchJson<Submission>(`/submissions/${id}`),
  createSubmission: (data: any) =>
    fetchJson<{ success: boolean; submission: Submission }>('/submissions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  validateSubmission: (id: string) =>
    fetchJson<any>(`/submissions/${id}/validate`, { method: 'POST' }),
  checkSimilarity: (id: string) =>
    fetchJson<any>(`/submissions/${id}/similarity`, { method: 'POST' }),
  deleteSubmission: (id: string, userEmail?: string, userRole?: string) =>
    fetchJson<{ success: boolean; message: string }>(`/submissions/${id}`, {
      method: 'DELETE',
      headers: {
        ...(userEmail ? { 'x-user-email': userEmail } : {}),
        ...(userRole ? { 'x-user-role': userRole } : {})
      }
    }),

  // Reviewers & Matching
  getFacultyResearchers: (domain?: string) =>
    fetchJson<{ provider: any; researchers: any[] }>(domain ? `/reviewers/faculty?domain=${encodeURIComponent(domain)}` : '/reviewers/faculty'),
  matchReviewers: (submission_id: string, weights?: any, filter_conflicts?: boolean) =>
    fetchJson<{
      submission_id: string;
      paper_number: number;
      title: string;
      provider_source: string;
      ranked_reviewers: ReviewerMatchScore[];
    }>('/reviewers/match', {
      method: 'POST',
      body: JSON.stringify({ submission_id, weights, filter_conflicts })
    }),
  checkCoi: (submission_id: string, reviewer_id?: string) =>
    fetchJson<any>('/reviewers/coi/check', {
      method: 'POST',
      body: JSON.stringify({ submission_id, reviewer_id })
    }),
  getReviewerAssignments: () => fetchJson<ReviewerAssignment[]>('/reviewer-assignments'),
  assignReviewer: (data: {
    submission_id: string;
    reviewer_id: string;
    reviewer_name: string;
    reviewer_institution: string;
    match_score: number;
  }) =>
    fetchJson<{ success: boolean; assignment: ReviewerAssignment }>('/reviewer-assignments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  sendReviewReminder: (assignment_id: string) =>
    fetchJson<{ success: boolean; message: string; delivery_status: string; assignment_id: string }>(
      `/reviewer-assignments/${assignment_id}/remind`,
      { method: 'POST' }
    ),
  reassignReviewer: (assignment_id: string, data: {
    new_reviewer_id: string;
    new_reviewer_name?: string;
    new_reviewer_institution?: string;
  }) =>
    fetchJson<{ success: boolean; message: string; new_assignment: ReviewerAssignment }>(
      `/reviewer-assignments/${assignment_id}/reassign`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    ),

  // Reviews
  getReviews: (submission_id?: string) =>
    fetchJson<Review[]>(submission_id ? `/reviews?submission_id=${submission_id}` : '/reviews'),
  submitReview: (data: any) =>
    fetchJson<{ success: boolean; review: Review }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getDivergentReviews: () =>
    fetchJson<{ count: number; divergentSubmissions: any[] }>('/reviews/divergent'),

  // Decisions
  getAiDecisionRecommendation: (submission_id: string) =>
    fetchJson<any>('/decisions/recommend', {
      method: 'POST',
      body: JSON.stringify({ submission_id })
    }),
  getRecommendationsSummary: () =>
    fetchJson<any[]>('/decisions/recommendations-summary'),
  getDecisions: () => fetchJson<Decision[]>('/decisions'),
  submitDecision: (data: {
    submission_id: string;
    final_decision: string;
    decision_letter?: string;
    decided_by?: string;
  }) =>
    fetchJson<{ success: boolean; decision: Decision }>('/decisions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getAuthorDecision: (submission_id: string) =>
    fetchJson<{
      submission_id: string;
      paper_number: number;
      title: string;
      status: string;
      decision: Decision | null;
      reviews: Array<{
        reviewer_label: string;
        score: number;
        recommendation: string;
        comments_to_author: string;
        strengths?: string;
        weaknesses?: string;
        submitted_at: string;
      }>;
      camera_ready_submitted: boolean;
      camera_ready_details: any;
      can_submit_camera_ready: boolean;
    }>(`/submissions/${submission_id}/author-decision`),
  submitCameraReady: (submission_id: string, data: { file_url: string; page_count: number; confirmed_metadata: boolean }) =>
    fetchJson<{ success: boolean; message: string; camera_ready: any; submission: any }>(`/submissions/${submission_id}/camera-ready`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getCameraReadySubmissions: () =>
    fetchJson<any[]>('/camera-ready-submissions'),

  // Registrations & Payments
  getRegistrationFees: () =>
    fetchJson<{
      is_early_bird_active: boolean;
      fee_rules: Array<{
        category: string;
        label: string;
        early_bird_amount: number;
        regular_amount: number;
        currency: string;
      }>;
    }>('/registration-fees'),
  getRegistrations: () => fetchJson<Registration[]>('/registrations'),
  createRegistration: (data: any) =>
    fetchJson<{ success: boolean; registration: Registration }>('/registrations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getPayments: () =>
    fetchJson<any[]>('/payments'),
  reconcilePayment: (payment_id: string, data?: { registration_id?: string; notes?: string }, userRole: string = 'CHAIR') =>
    fetchJson<{ success: boolean; message: string; payment: any; registration: any }>(`/payments/${payment_id}/reconcile`, {
      method: 'POST',
      headers: {
        'x-user-role': userRole
      },
      body: JSON.stringify(data || {})
    }),
  createPaymentOrder: (registration_id: string, amount: number) =>
    fetchJson<any>('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ registration_id, amount })
    }),
  submitSandboxPayment: (data: {
    registration_id: string;
    order_id: string;
    card_number: string;
    cardholder_name: string;
    amount: number;
  }) =>
    fetchJson<any>('/payments/sandbox-pay', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Programme
  getSchedule: () => fetchJson<SessionSchedule[]>('/schedule'),
  generateSchedule: () =>
    fetchJson<{ success: boolean; count: number; sessions: SessionSchedule[] }>('/schedule/generate', {
      method: 'POST'
    }),

  // Certificates & Proceedings
  getCertificates: () => fetchJson<CertificateRecord[]>('/certificates'),
  generateCertificate: (data: {
    recipient_name: string;
    recipient_email: string;
    role: string;
    paper_title?: string;
  }) =>
    fetchJson<{ success: boolean; certificate: CertificateRecord }>('/certificates/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  verifyCertificate: (certNumber: string) =>
    fetchJson<{ valid: boolean; certificate?: CertificateRecord; verification_message: string }>(
      `/certificates/${certNumber}/verify`
    ),
  batchGenerateCertificates: () =>
    fetchJson<{ success: boolean; count: number; message: string; certificates: CertificateRecord[] }>(
      '/certificates/batch-generate',
      { method: 'POST' }
    ),
  getProceedings: () => fetchJson<ProceedingsRecord | null>('/proceedings'),
  compileProceedings: (isbn?: string) =>
    fetchJson<{ success: boolean; proceedings: ProceedingsRecord }>('/proceedings/generate', {
      method: 'POST',
      body: JSON.stringify({ isbn })
    }),

  // Event Archives
  getEventArchives: () => fetchJson<EventArchiveRecord[]>('/archive'),
  createEventArchive: (data?: { archived_by?: string }, userRole: string = 'CHAIR') =>
    fetchJson<{ success: boolean; archive: EventArchiveRecord }>('/archive/create', {
      method: 'POST',
      headers: { 'x-user-role': userRole },
      body: JSON.stringify(data || {})
    }),

  // Feedback Analysis
  getFeedbacks: () => fetchJson<ConferenceFeedback[]>('/feedback'),
  submitFeedback: (data: Partial<ConferenceFeedback>) =>
    fetchJson<{ success: boolean; feedback: ConferenceFeedback }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getFeedbackSummary: () => fetchJson<FeedbackSummary>('/feedback/summary'),

  // Analytics & Integrations
  getAnalytics: (confId: string = 'conf-aiai-2026') =>
    fetchJson<ConferenceAnalytics>(`/analytics/conference/${confId}`),
  getIntegrationsStatus: () => fetchJson<any>('/integrations/status'),

  // AI Assistant Chat
  sendChatMessage: (message: string, history?: AssistantChatMessage[]) =>
    fetchJson<AssistantChatMessage>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history })
    }),

  // Autonomous Conference Agent & Outputs
  runAutomation: () =>
    fetchJson<any>('/agent/run-automation', { method: 'POST' }),
  getAgentStatus: () =>
    fetchJson<any>('/agent/status'),
  getAuditLogs: (role: string = 'CHAIR', limit: number = 100) =>
    fetchJson<any[]>(`/audit-logs?limit=${limit}`, {
      headers: { 'x-user-role': role }
    }),
  getReviewerAssignmentSheet: () =>
    fetchJson<{ conference_id: string; total_assignments: number; sheet: any[] }>('/reviewer-assignments/sheet'),
  getPostEventReport: () =>
    fetchJson<any>('/reports/post-event'),

  // Reviewer Workspace & Portal
  getReviewerAccounts: () =>
    fetchJson<{ success: boolean; total: number; reviewers: any[] }>('/reviewer/accounts'),
  reviewerLogin: (email: string, password?: string) =>
    fetchJson<{ success: boolean; user: any }>('/reviewer/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  getReviewerProfile: (email: string) =>
    fetchJson<{ success: boolean; user: any }>(`/reviewer/profile?email=${encodeURIComponent(email)}`, {
      headers: {
        'x-user-role': 'REVIEWER',
        'x-user-email': email
      }
    }),
  getReviewerWorkspaceAssignments: (email: string) =>
    fetchJson<{
      success: boolean;
      reviewer: { name: string; institution: string; department: string; email: string };
      total_assigned: number;
      assignments: any[];
    }>(`/reviewer/assignments?email=${encodeURIComponent(email)}`, {
      headers: {
        'x-user-role': 'REVIEWER',
        'x-user-email': email
      }
    }),
  submitReviewerWorkspaceReview: (assignmentId: string, data: any, email: string) =>
    fetchJson<{ success: boolean; message: string; status: string; review?: any; draft?: any }>(
      `/reviewer/assignments/${assignmentId}/review`,
      {
        method: 'POST',
        headers: {
          'x-user-role': 'REVIEWER',
          'x-user-email': email
        },
        body: JSON.stringify(data)
      }
    ),
  reopenReviewerAssignment: (assignmentId: string, userRole: string = 'CHAIR') =>
    fetchJson<{ success: boolean; message: string }>(`/reviewer/assignments/${assignmentId}/reopen`, {
      method: 'POST',
      headers: { 'x-user-role': userRole }
    }),
  getReviewerManuscriptUrl: (submissionId: string, email: string) =>
    `${API_BASE}/reviewer/papers/${submissionId}/manuscript?email=${encodeURIComponent(email)}&role=REVIEWER`
};
