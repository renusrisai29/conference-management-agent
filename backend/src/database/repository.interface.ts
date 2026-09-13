import {
  User, Conference, Track, Submission, ReviewerAssignment,
  Review, ReviewReminder, Decision, Registration, PaymentRecord,
  SessionSchedule, CertificateRecord, ProceedingsRecord, ConferenceAnalytics,
  CameraReadySubmission, EventArchiveRecord, ConferenceFeedback, FeedbackSummary
} from '../types';

export interface IConferenceRepository {
  // Provider telemetry
  getProviderName(): string;

  // Conferences & Tracks
  getConferences(): Promise<Conference[]>;
  getConferenceById(id?: string): Promise<Conference | null>;
  updateConference(id: string, data: Partial<Conference>): Promise<Conference>;
  getTracks(conferenceId?: string): Promise<Track[]>;

  // Submissions
  // Submissions & Camera Ready
  getSubmissions(conferenceId?: string): Promise<Submission[]>;
  getSubmissionById(idOrNumber: string | number): Promise<Submission | null>;
  createSubmission(submission: Partial<Submission>): Promise<Submission>;
  updateSubmission(id: string, data: Partial<Submission>): Promise<Submission>;
  deleteSubmission(id: string): Promise<boolean>;
  createCameraReadySubmission(data: Partial<CameraReadySubmission>): Promise<CameraReadySubmission>;
  getCameraReadySubmissions(submissionId?: string): Promise<CameraReadySubmission[]>;

  // Reviewers, Assignments & Reviews
  getReviewerAssignments(conferenceId?: string): Promise<ReviewerAssignment[]>;
  createReviewerAssignment(assignment: Partial<ReviewerAssignment>): Promise<ReviewerAssignment>;
  updateReviewerAssignment(id: string, data: Partial<ReviewerAssignment>): Promise<ReviewerAssignment>;
  deleteReviewerAssignment(id: string): Promise<boolean>;
  getReviews(submissionId?: string): Promise<Review[]>;
  createReview(review: Partial<Review>): Promise<Review>;
  getDivergentReviews(conferenceId?: string): Promise<{ count: number; divergentSubmissions: any[] }>;

  // Decisions
  getDecisions(conferenceId?: string): Promise<Decision[]>;
  createDecision(decision: Partial<Decision>): Promise<Decision>;

  // Registrations & Payments
  getRegistrations(conferenceId?: string): Promise<Registration[]>;
  createRegistration(reg: Partial<Registration>): Promise<Registration>;
  updateRegistration(id: string, data: Partial<Registration>): Promise<Registration>;
  getPayments(conferenceId?: string): Promise<PaymentRecord[]>;
  createPayment(payment: Partial<PaymentRecord>): Promise<PaymentRecord>;
  updatePayment(id: string, data: Partial<PaymentRecord>): Promise<PaymentRecord>;

  // Sessions & Programme
  getSessions(conferenceId?: string): Promise<SessionSchedule[]>;
  saveSessions(conferenceId: string, sessions: SessionSchedule[]): Promise<SessionSchedule[]>;

  // Certificates & Proceedings
  getCertificates(conferenceId?: string): Promise<CertificateRecord[]>;
  getCertificateByNumber(certNumber: string): Promise<CertificateRecord | null>;
  createCertificate(cert: Partial<CertificateRecord>): Promise<CertificateRecord>;
  getProceedings(conferenceId?: string): Promise<ProceedingsRecord | null>;
  saveProceedings(proceedings: Partial<ProceedingsRecord>): Promise<ProceedingsRecord>;

  // Users & Analytics
  getUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | null>;
  getAnalytics(conferenceId?: string): Promise<ConferenceAnalytics>;

  // Event Archives & Feedback Analysis
  getEventArchives(conferenceId?: string): Promise<EventArchiveRecord[]>;
  getEventArchiveById(id: string): Promise<EventArchiveRecord | null>;
  saveEventArchive(archive: EventArchiveRecord): Promise<EventArchiveRecord>;
  getFeedbacks(conferenceId?: string): Promise<ConferenceFeedback[]>;
  createFeedback(feedback: Partial<ConferenceFeedback>): Promise<ConferenceFeedback>;
  getFeedbackSummary(conferenceId?: string): Promise<FeedbackSummary>;
}
