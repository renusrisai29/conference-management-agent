import {
  Conference, Submission, ReviewerMatchScore, ReviewerAssignment,
  Review, Decision, Registration, SessionSchedule, CertificateRecord,
  ProceedingsRecord, ConferenceAnalytics, AssistantChatMessage
} from '../types';

const API_BASE = '/api';

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
  updateConference: (id: string, data: Partial<Conference>) =>
    fetchJson<{ success: boolean; conference: Conference }>(`/conferences/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
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

  // Registrations & Payments
  getRegistrations: () => fetchJson<Registration[]>('/registrations'),
  createRegistration: (data: any) =>
    fetchJson<{ success: boolean; registration: Registration }>('/registrations', {
      method: 'POST',
      body: JSON.stringify(data)
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
  getProceedings: () => fetchJson<ProceedingsRecord | null>('/proceedings'),
  compileProceedings: (isbn?: string) =>
    fetchJson<{ success: boolean; proceedings: ProceedingsRecord }>('/proceedings/generate', {
      method: 'POST',
      body: JSON.stringify({ isbn })
    }),

  // Analytics & Integrations
  getAnalytics: (confId: string = 'conf-aiai-2026') =>
    fetchJson<ConferenceAnalytics>(`/analytics/conference/${confId}`),
  getIntegrationsStatus: () => fetchJson<any>('/integrations/status'),

  // AI Assistant Chat
  sendChatMessage: (message: string, history?: AssistantChatMessage[]) =>
    fetchJson<AssistantChatMessage>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history })
    })
};
