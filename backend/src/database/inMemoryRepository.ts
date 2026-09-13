import { IConferenceRepository } from './repository.interface';
import { db } from './db';
import {
  User, Conference, Track, Submission, ReviewerAssignment,
  Review, Decision, Registration, PaymentRecord,
  SessionSchedule, CertificateRecord, ProceedingsRecord, ConferenceAnalytics,
  CameraReadySubmission, EventArchiveRecord, ConferenceFeedback, FeedbackSummary
} from '../types';

export class InMemoryRepository implements IConferenceRepository {
  private archives: EventArchiveRecord[] = [];
  private feedbacks: ConferenceFeedback[] = [
    {
      id: 'fb-001',
      conference_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      user_name: 'Dr. Ramesh Kumar',
      user_email: 'ramesh.k@iitm.ac.in',
      role: 'AUTHOR',
      overall_rating: 5,
      session_quality_rating: 5,
      organization_rating: 5,
      venue_platform_rating: 4,
      highlights: 'Excellent peer-review rigor and seamless presentation scheduling across tracks.',
      suggestions: 'Provide a mobile schedule app for on-site navigation.',
      submitted_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'fb-002',
      conference_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      user_name: 'Ananya Sharma',
      user_email: 'ananya.sharma@research.edu',
      role: 'PARTICIPANT',
      overall_rating: 5,
      session_quality_rating: 4,
      organization_rating: 5,
      venue_platform_rating: 5,
      highlights: 'The AI keynote and divergent review arbitration panel was world-class.',
      suggestions: 'More Q&A time after the robotics demonstration session.',
      submitted_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'fb-003',
      conference_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      user_name: 'Prof. Marcus Vance',
      user_email: 'marcus.v@cambridge.ac.uk',
      role: 'SESSION_CHAIR',
      overall_rating: 4,
      session_quality_rating: 5,
      organization_rating: 4,
      venue_platform_rating: 4,
      highlights: 'Conflict-free session schedule made chairing seamless without time clashes.',
      suggestions: 'Consider 30-minute buffer before keynote sessions.',
      submitted_at: new Date().toISOString()
    }
  ];

  public getProviderName(): string {
    return 'In-Memory Relational Store';
  }

  public async getConferences(): Promise<Conference[]> {
    return db.conferences;
  }

  public async getConferenceById(id?: string): Promise<Conference | null> {
    if (!id) return db.conferences[0] || null;
    return db.conferences.find(c => c.id === id || c.acronym === id) || db.conferences[0] || null;
  }

  public async updateConference(id: string, data: Partial<Conference>): Promise<Conference> {
    const conf = await this.getConferenceById(id);
    if (!conf) throw new Error(`Conference ${id} not found`);
    if (data.dates && conf.dates) {
      Object.assign(conf.dates, data.dates);
    }
    Object.assign(conf, data);
    return conf;
  }

  public async getTracks(conferenceId?: string): Promise<Track[]> {
    if (conferenceId) {
      return db.tracks.filter(t => t.conference_id === conferenceId);
    }
    return db.tracks;
  }

  public async getSubmissions(conferenceId?: string): Promise<Submission[]> {
    if (conferenceId) {
      return db.submissions.filter(s => s.conference_id === conferenceId);
    }
    return db.submissions;
  }

  public async getSubmissionById(idOrNumber: string | number): Promise<Submission | null> {
    const match = db.submissions.find(
      s => s.id === String(idOrNumber) || s.paper_number === Number(idOrNumber)
    );
    return match || null;
  }

  public async createSubmission(submission: Partial<Submission>): Promise<Submission> {
    const nextNumber = db.submissions.length > 0 ? Math.max(...db.submissions.map(s => s.paper_number)) + 1 : 101;
    const track = db.tracks.find(t => t.id === submission.track_id) || db.tracks[0];
    const primaryConf = db.conferences[0];

    const newSub: Submission = {
      id: submission.id || `sub-${nextNumber}`,
      paper_number: submission.paper_number || nextNumber,
      conference_id: submission.conference_id || primaryConf?.id || 'conf-01',
      track_id: track?.id || 'trk-01',
      track_name: track?.name || 'General Track',
      title: submission.title || 'Untitled Submission',
      abstract: submission.abstract || '',
      keywords: submission.keywords || [],
      primary_author_id: submission.primary_author_id || 'u-auth-03',
      authors: submission.authors || [],
      status: submission.status || 'SUBMITTED',
      page_count: submission.page_count || 6,
      file_name: submission.file_name || (submission.file_path ? submission.file_path.split('/').pop() : `paper_${nextNumber}.pdf`),
      file_path: submission.file_path || `/uploads/papers/paper_${nextNumber}.pdf`,
      similarity_score: submission.similarity_score || 0,
      similarity_status: submission.similarity_status || 'PENDING',
      created_at: submission.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.submissions.push(newSub);
    return newSub;
  }

  public async updateSubmission(id: string, data: Partial<Submission>): Promise<Submission> {
    const sub = await this.getSubmissionById(id);
    if (!sub) throw new Error(`Submission ${id} not found`);
    Object.assign(sub, data, { updated_at: new Date().toISOString() });
    return sub;
  }

  public async deleteSubmission(id: string): Promise<boolean> {
    const idx = db.submissions.findIndex(s => s.id === id || s.paper_number === Number(id));
    if (idx === -1) return false;
    db.submissions.splice(idx, 1);
    return true;
  }

  public async createCameraReadySubmission(data: Partial<CameraReadySubmission>): Promise<CameraReadySubmission> {
    const newRecord: CameraReadySubmission = {
      id: data.id || `crs-${Date.now().toString().slice(-5)}`,
      submission_id: data.submission_id!,
      file_url: data.file_url || '/uploads/camera_ready.pdf',
      page_count: Number(data.page_count) || 8,
      confirmed_metadata: Boolean(data.confirmed_metadata ?? true),
      submitted_at: data.submitted_at || new Date().toISOString()
    };
    db.cameraReadySubmissions.push(newRecord);
    return newRecord;
  }

  public async getCameraReadySubmissions(submissionId?: string): Promise<CameraReadySubmission[]> {
    if (submissionId) {
      return db.cameraReadySubmissions.filter(c => c.submission_id === submissionId);
    }
    return db.cameraReadySubmissions;
  }

  public async getReviewerAssignments(conferenceId?: string): Promise<ReviewerAssignment[]> {
    return db.assignments;
  }

  public async createReviewerAssignment(assignment: Partial<ReviewerAssignment>): Promise<ReviewerAssignment> {
    const source = assignment.assignment_source || (assignment.match_details?.assignment_source) || 'AUTOMATIC';
    const newAssignment: ReviewerAssignment = {
      id: assignment.id || `asgn-${Date.now().toString().slice(-5)}`,
      submission_id: assignment.submission_id!,
      reviewer_id: assignment.reviewer_id!,
      reviewer_name: assignment.reviewer_name || 'Academic Reviewer',
      reviewer_institution: assignment.reviewer_institution || 'University',
      match_score: assignment.match_score || 85.0,
      status: assignment.status || 'ASSIGNED',
      due_date: assignment.due_date || '2026-11-10',
      assigned_at: assignment.assigned_at || new Date().toISOString(),
      assignment_source: source,
      match_details: assignment.match_details || {
        assignment_source: source,
        trigger_time_ist: assignment.assigned_at || new Date().toISOString(),
        status_label: `${source === 'MANUAL' ? 'Manual chair assignment' : 'Automatically assigned by agent'} at ${assignment.assigned_at || new Date().toISOString()}`
      }
    };

    db.assignments.push(newAssignment);
    return newAssignment;
  }

  public async updateReviewerAssignment(id: string, data: Partial<ReviewerAssignment>): Promise<ReviewerAssignment> {
    const idx = db.assignments.findIndex(a => a.id === id);
    if (idx === -1) throw new Error(`Assignment ${id} not found`);
    db.assignments[idx] = { ...db.assignments[idx], ...data };
    return db.assignments[idx];
  }

  public async deleteReviewerAssignment(id: string): Promise<boolean> {
    const idx = db.assignments.findIndex(a => a.id === id);
    if (idx === -1) return false;
    db.assignments.splice(idx, 1);
    return true;
  }

  public async getReviews(submissionId?: string): Promise<Review[]> {
    if (submissionId) {
      return db.reviews.filter(r => r.submission_id === submissionId);
    }
    return db.reviews;
  }

  public async createReview(review: Partial<Review>): Promise<Review> {
    const newReview: Review = {
      id: review.id || `rev-${Date.now().toString().slice(-5)}`,
      assignment_id: review.assignment_id || 'asgn-new',
      submission_id: review.submission_id!,
      reviewer_id: review.reviewer_id!,
      reviewer_name: review.reviewer_name || 'Reviewer',
      overall_score: Number(review.overall_score) || 7,
      confidence: Number(review.confidence) || 4,
      soundness_score: Number(review.soundness_score) || 4,
      originality_score: Number(review.originality_score) || 4,
      presentation_score: Number(review.presentation_score) || 4,
      recommendation: review.recommendation || 'ACCEPT',
      strengths: review.strengths || '',
      weaknesses: review.weaknesses || '',
      comments_to_author: review.comments_to_author || '',
      confidential_comments_to_chair: review.confidential_comments_to_chair,
      submitted_at: review.submitted_at || new Date().toISOString()
    };

    db.reviews.push(newReview);
    return newReview;
  }

  public async getDivergentReviews(conferenceId?: string): Promise<{ count: number; divergentSubmissions: any[] }> {
    const submissionsWithReviews: { [subId: string]: number[] } = {};
    for (const r of db.reviews) {
      if (!submissionsWithReviews[r.submission_id]) submissionsWithReviews[r.submission_id] = [];
      submissionsWithReviews[r.submission_id].push(r.overall_score);
    }

    const divergentSubmissions = Object.entries(submissionsWithReviews)
      .filter(([_, scores]) => scores.length >= 2 && Math.max(...scores) - Math.min(...scores) >= 4)
      .map(([subId, scores]) => {
        const sub = db.submissions.find(s => s.id === subId);
        return {
          submission_id: subId,
          paper_number: sub?.paper_number,
          title: sub?.title,
          scores,
          delta: Math.max(...scores) - Math.min(...scores),
          reviews: db.reviews.filter(r => r.submission_id === subId)
        };
      });

    return { count: divergentSubmissions.length, divergentSubmissions };
  }

  public async getDecisions(conferenceId?: string): Promise<Decision[]> {
    return db.decisions;
  }

  public async createDecision(decision: Partial<Decision>): Promise<Decision> {
    const newDecision: Decision = {
      id: decision.id || `dec-${Date.now().toString().slice(-5)}`,
      submission_id: decision.submission_id!,
      ai_recommendation: decision.ai_recommendation || 'ACCEPT',
      ai_reasoning: decision.ai_reasoning || 'Confirmed by Conference Chair after reviewing peer scores.',
      divergence_flag: Boolean(decision.divergence_flag),
      final_decision: decision.final_decision || 'ACCEPT',
      decided_by: decision.decided_by || 'Dr. Radhika Sharma (General Chair)',
      decision_letter: decision.decision_letter || 'Your paper has been evaluated.',
      decided_at: decision.decided_at || new Date().toISOString(),
      notification_sent: Boolean(decision.notification_sent)
    };

    db.decisions.push(newDecision);
    return newDecision;
  }

  public async getRegistrations(conferenceId?: string): Promise<Registration[]> {
    return db.registrations;
  }

  public async createRegistration(reg: Partial<Registration>): Promise<Registration> {
    const primaryConf = db.conferences[0];
    const newReg: Registration = {
      id: reg.id || `reg-${Date.now().toString().slice(-5)}`,
      conference_id: reg.conference_id || primaryConf?.id || 'conf-01',
      user_id: reg.user_id || `u-${Date.now().toString().slice(-4)}`,
      user_name: reg.user_name || 'Academic Delegate',
      user_email: reg.user_email || 'delegate@university.edu',
      submission_id: reg.submission_id,
      paper_title: reg.paper_title,
      category: reg.category || 'PARTICIPANT',
      fee_amount: Number(reg.fee_amount) || 4000,
      currency: reg.currency || 'INR',
      status: reg.status || 'PENDING',
      payment_status: reg.payment_status || 'PENDING',
      created_at: reg.created_at || new Date().toISOString()
    };

    db.registrations.push(newReg);
    return newReg;
  }

  public async updateRegistration(id: string, data: Partial<Registration>): Promise<Registration> {
    const reg = db.registrations.find(r => r.id === id);
    if (!reg) throw new Error(`Registration ${id} not found`);
    Object.assign(reg, data);
    return reg;
  }

  public async getPayments(conferenceId?: string): Promise<PaymentRecord[]> {
    return db.payments;
  }

  public async createPayment(payment: Partial<PaymentRecord>): Promise<PaymentRecord> {
    const newPay: PaymentRecord = {
      id: payment.id || `pay-${Date.now().toString().slice(-5)}`,
      registration_id: payment.registration_id!,
      order_id: payment.order_id || `ORDER-${Date.now()}`,
      payment_id: payment.payment_id,
      amount: Number(payment.amount) || 4000,
      currency: payment.currency || 'INR',
      payment_mode: 'SANDBOX',
      status: payment.status || 'SUCCESS',
      receipt_url: payment.receipt_url,
      created_at: payment.created_at || new Date().toISOString(),
      verified_at: payment.verified_at || new Date().toISOString()
    };

    db.payments.push(newPay);
    return newPay;
  }

  public async updatePayment(id: string, data: Partial<PaymentRecord>): Promise<PaymentRecord> {
    const pay = db.payments.find(p => p.id === id);
    if (!pay) throw new Error(`Payment ${id} not found`);
    Object.assign(pay, data);
    return pay;
  }

  public async getSessions(conferenceId?: string): Promise<SessionSchedule[]> {
    return db.sessions;
  }

  public async saveSessions(conferenceId: string, sessions: SessionSchedule[]): Promise<SessionSchedule[]> {
    db.sessions = sessions;
    return db.sessions;
  }

  public async getCertificates(conferenceId?: string): Promise<CertificateRecord[]> {
    return db.certificates;
  }

  public async getCertificateByNumber(certNumber: string): Promise<CertificateRecord | null> {
    const cert = db.certificates.find(
      c => c.certificate_number.toLowerCase() === certNumber.toLowerCase().trim()
    );
    return cert || null;
  }

  public async createCertificate(cert: Partial<CertificateRecord>): Promise<CertificateRecord> {
    const record = cert as CertificateRecord;
    db.certificates.push(record);
    return record;
  }

  public async getProceedings(conferenceId?: string): Promise<ProceedingsRecord | null> {
    if (conferenceId) {
      return db.proceedings.find(p => p.conference_id === conferenceId) || db.proceedings[0] || null;
    }
    return db.proceedings[0] || null;
  }

  public async saveProceedings(proceedings: Partial<ProceedingsRecord>): Promise<ProceedingsRecord> {
    const record = proceedings as ProceedingsRecord;
    const existingIdx = db.proceedings.findIndex(p => p.conference_id === record.conference_id);
    if (existingIdx >= 0) {
      db.proceedings[existingIdx] = record;
    } else {
      db.proceedings.push(record);
    }
    return record;
  }

  public async getUsers(): Promise<User[]> {
    return db.users;
  }

  public async getUserById(id: string): Promise<User | null> {
    return db.users.find(u => u.id === id || u.email === id) || null;
  }

  public async getAnalytics(conferenceId?: string): Promise<ConferenceAnalytics> {
    return db.getAnalytics(conferenceId);
  }

  public async getEventArchives(conferenceId?: string): Promise<EventArchiveRecord[]> {
    if (conferenceId) {
      return this.archives.filter(a => a.conference_id === conferenceId);
    }
    return this.archives;
  }

  public async getEventArchiveById(id: string): Promise<EventArchiveRecord | null> {
    return this.archives.find(a => a.id === id) || null;
  }

  public async saveEventArchive(archive: EventArchiveRecord): Promise<EventArchiveRecord> {
    const existingIdx = this.archives.findIndex(a => a.id === archive.id);
    if (existingIdx >= 0) {
      this.archives[existingIdx] = archive;
    } else {
      this.archives.unshift(archive);
    }
    return archive;
  }

  public async getFeedbacks(conferenceId?: string): Promise<ConferenceFeedback[]> {
    if (conferenceId) {
      return this.feedbacks.filter(f => f.conference_id === conferenceId);
    }
    return this.feedbacks;
  }

  public async createFeedback(feedback: Partial<ConferenceFeedback>): Promise<ConferenceFeedback> {
    const record: ConferenceFeedback = {
      id: feedback.id || `fb-${Date.now().toString().slice(-5)}`,
      conference_id: feedback.conference_id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      user_name: feedback.user_name || 'Conference Delegate',
      user_email: feedback.user_email || 'delegate@university.edu',
      role: feedback.role || 'PARTICIPANT',
      overall_rating: Math.max(1, Math.min(5, Number(feedback.overall_rating) || 5)),
      session_quality_rating: Math.max(1, Math.min(5, Number(feedback.session_quality_rating) || 5)),
      organization_rating: Math.max(1, Math.min(5, Number(feedback.organization_rating) || 5)),
      venue_platform_rating: Math.max(1, Math.min(5, Number(feedback.venue_platform_rating) || 5)),
      highlights: feedback.highlights || '',
      suggestions: feedback.suggestions || '',
      submitted_at: feedback.submitted_at || new Date().toISOString()
    };
    this.feedbacks.unshift(record);
    return record;
  }

  public async getFeedbackSummary(conferenceId?: string): Promise<FeedbackSummary> {
    const list = await this.getFeedbacks(conferenceId);
    if (list.length === 0) {
      return {
        total_responses: 0,
        average_overall: 0,
        average_session_quality: 0,
        average_organization: 0,
        average_venue_platform: 0,
        satisfaction_percentage: 100,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        role_breakdown: {},
        recent_feedback: []
      };
    }

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => Number((sum(arr) / arr.length).toFixed(1));

    const dist: { [rating: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const roles: { [role: string]: number } = {};

    list.forEach(f => {
      const r = Math.round(f.overall_rating);
      dist[r] = (dist[r] || 0) + 1;
      roles[f.role] = (roles[f.role] || 0) + 1;
    });

    const favorable = list.filter(f => f.overall_rating >= 4).length;
    const satisfaction = Math.round((favorable / list.length) * 100);

    return {
      total_responses: list.length,
      average_overall: avg(list.map(f => f.overall_rating)),
      average_session_quality: avg(list.map(f => f.session_quality_rating)),
      average_organization: avg(list.map(f => f.organization_rating)),
      average_venue_platform: avg(list.map(f => f.venue_platform_rating)),
      satisfaction_percentage: satisfaction,
      rating_distribution: dist,
      role_breakdown: roles,
      recent_feedback: list.slice(0, 10)
    };
  }
}
