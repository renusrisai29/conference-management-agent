import { Router, Request, Response } from 'express';
import { db } from '../database/db';
import { matchingService, DEFAULT_WEIGHTS } from '../services/matchingService';
import { coiService } from '../services/coiService';
import { similarityService } from '../services/similarityService';
import { schedulerService } from '../services/schedulerService';
import { certificateService } from '../services/certificateService';
import { proceedingsService } from '../services/proceedingsService';
import { getAgent17Provider } from '../integrations/agent17';
import { groqService } from '../integrations/groq/groqService';
import { paymentService } from '../integrations/payment/paymentService';
import { emailService } from '../integrations/email/emailService';
import { supabaseService } from '../integrations/supabase/supabaseService';
import { boltAgent } from '../agents/boltAgent';
import { agentTools } from '../tools/agentTools';
import { Submission } from '../types';

export const apiRouter = Router();

// ============================================================
// 1. CONFERENCES & CFP
// ============================================================
apiRouter.get('/conferences', (req: Request, res: Response) => {
  res.json(db.conferences);
});

apiRouter.get('/conferences/:id', (req: Request, res: Response) => {
  const conf = db.conferences.find(c => c.id === req.params.id) || db.conferences[0];
  if (!conf) return res.status(404).json({ error: 'Conference not found' });
  res.json({ ...conf, tracks: db.tracks });
});

apiRouter.patch('/conferences/:id', (req: Request, res: Response) => {
  const conf = db.conferences.find(c => c.id === req.params.id) || db.conferences[0];
  if (!conf) return res.status(404).json({ error: 'Conference not found' });

  Object.assign(conf, req.body);
  res.json({ success: true, conference: conf });
});

apiRouter.post('/conferences/:id/cfp/generate', async (req: Request, res: Response) => {
  const result = await agentTools.cfpGeneratorTool.execute(req.body || {});
  res.json(result);
});

// ============================================================
// 2. SUBMISSIONS & SIMILARITY
// ============================================================
apiRouter.get('/submissions', (req: Request, res: Response) => {
  res.json(db.submissions);
});

apiRouter.get('/submissions/:id', (req: Request, res: Response) => {
  const sub = db.submissions.find(s => s.id === req.params.id || s.paper_number === Number(req.params.id));
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  res.json(sub);
});

apiRouter.post('/submissions', (req: Request, res: Response) => {
  const { title, abstract, track_id, keywords, authors, page_count } = req.body;

  if (!title || !abstract || !authors || authors.length === 0) {
    return res.status(400).json({ error: 'Title, abstract, and at least one author are required.' });
  }

  const nextNumber = db.submissions.length > 0 ? Math.max(...db.submissions.map(s => s.paper_number)) + 1 : 101;
  const track = db.tracks.find(t => t.id === track_id) || db.tracks[0];

  const newSub: Submission = {
    id: `sub-${nextNumber}`,
    paper_number: nextNumber,
    conference_id: db.conferences[0]?.id || 'conf-01',
    track_id: track.id,
    track_name: track.name,
    title,
    abstract,
    keywords: Array.isArray(keywords) ? keywords : keywords.split(',').map((k: string) => k.trim()),
    primary_author_id: 'u-auth-03',
    authors: authors.map((a: any, idx: number) => ({
      id: `a-${Date.now()}-${idx}`,
      name: a.name,
      email: a.email,
      institution: a.institution,
      department: a.department || '',
      country: a.country || 'India',
      is_corresponding: idx === 0,
      author_order: idx + 1
    })),
    status: 'SUBMITTED',
    page_count: page_count || 6,
    file_path: `/uploads/papers/paper_${nextNumber}.pdf`,
    similarity_score: 0,
    similarity_status: 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Run initial similarity check
  const sim = similarityService.checkSimilarity(newSub);
  newSub.similarity_score = sim.similarity_score;
  newSub.similarity_status = sim.status;

  db.submissions.push(newSub);
  res.status(201).json({ success: true, submission: newSub });
});

apiRouter.post('/submissions/:id/validate', async (req: Request, res: Response) => {
  const sub = db.submissions.find(s => s.id === req.params.id || s.paper_number === Number(req.params.id));
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const result = await agentTools.submissionValidationTool.execute({ paper_number: sub.paper_number });
  res.json(result);
});

apiRouter.post('/submissions/:id/similarity', async (req: Request, res: Response) => {
  const sub = db.submissions.find(s => s.id === req.params.id || s.paper_number === Number(req.params.id));
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const result = similarityService.checkSimilarity(sub);
  sub.similarity_score = result.similarity_score;
  sub.similarity_status = result.status;
  res.json(result);
});

// ============================================================
// 3. REVIEWERS, AGENT 17 & MATCHING
// ============================================================
apiRouter.get('/reviewers/faculty', async (req: Request, res: Response) => {
  const provider = getAgent17Provider();
  const domain = req.query.domain as string | undefined;
  const researchers = await provider.getResearchers(domain);
  const status = provider.getProviderStatus();
  res.json({ provider: status, researchers });
});

apiRouter.post('/reviewers/match', async (req: Request, res: Response) => {
  const { submission_id, weights, filter_conflicts } = req.body;
  const sub = db.submissions.find(s => s.id === submission_id || s.paper_number === Number(submission_id));

  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const ranked = await matchingService.matchReviewers(
    sub,
    weights || DEFAULT_WEIGHTS,
    Boolean(filter_conflicts)
  );

  res.json({
    submission_id: sub.id,
    paper_number: sub.paper_number,
    title: sub.title,
    provider_source: 'Agent 17 Mock Provider',
    ranked_reviewers: ranked
  });
});

apiRouter.post('/reviewers/coi/check', async (req: Request, res: Response) => {
  const { submission_id, reviewer_id } = req.body;
  const sub = db.submissions.find(s => s.id === submission_id || s.paper_number === Number(submission_id));
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const provider = getAgent17Provider();
  if (reviewer_id) {
    const reviewer = await provider.getResearcherById(reviewer_id);
    if (!reviewer) return res.status(404).json({ error: 'Reviewer not found' });
    const check = coiService.detectConflicts(sub, reviewer);
    return res.json({ reviewer: reviewer.name, ...check });
  }

  const researchers = await provider.getResearchers();
  const conflicts = researchers
    .map(r => ({ reviewer: r, ...coiService.detectConflicts(sub, r) }))
    .filter(c => c.has_conflict);

  res.json({ total_checked: researchers.length, conflicts_found: conflicts.length, conflicts });
});

apiRouter.get('/reviewer-assignments', (req: Request, res: Response) => {
  res.json(db.assignments);
});

apiRouter.post('/reviewer-assignments', (req: Request, res: Response) => {
  const { submission_id, reviewer_id, reviewer_name, reviewer_institution, match_score } = req.body;

  const existing = db.assignments.find(
    a => a.submission_id === submission_id && a.reviewer_id === reviewer_id
  );
  if (existing) {
    return res.status(400).json({ error: 'Reviewer is already assigned to this submission.' });
  }

  const assignment = {
    id: `asgn-${Date.now().toString().slice(-5)}`,
    submission_id,
    reviewer_id,
    reviewer_name,
    reviewer_institution,
    match_score: match_score || 85.0,
    status: 'ASSIGNED' as const,
    due_date: '2026-11-10',
    assigned_at: new Date().toISOString()
  };

  db.assignments.push(assignment);

  // Update submission status to UNDER_REVIEW
  const sub = db.submissions.find(s => s.id === submission_id);
  if (sub && sub.status === 'SUBMITTED') {
    sub.status = 'UNDER_REVIEW';
  }

  res.status(201).json({ success: true, assignment });
});

// ============================================================
// 4. REVIEWS & DIVERGENCE DETECTION
// ============================================================
apiRouter.get('/reviews', (req: Request, res: Response) => {
  const { submission_id } = req.query;
  if (submission_id) {
    return res.json(db.reviews.filter(r => r.submission_id === submission_id));
  }
  res.json(db.reviews);
});

apiRouter.post('/reviews', (req: Request, res: Response) => {
  const {
    assignment_id, submission_id, reviewer_id, reviewer_name,
    overall_score, confidence, soundness_score, originality_score,
    presentation_score, recommendation, strengths, weaknesses,
    comments_to_author, confidential_comments_to_chair
  } = req.body;

  const review = {
    id: `rev-${Date.now().toString().slice(-5)}`,
    assignment_id: assignment_id || 'asgn-new',
    submission_id,
    reviewer_id,
    reviewer_name,
    overall_score: Number(overall_score),
    confidence: Number(confidence) || 4,
    soundness_score: Number(soundness_score) || 4,
    originality_score: Number(originality_score) || 4,
    presentation_score: Number(presentation_score) || 4,
    recommendation,
    strengths,
    weaknesses,
    comments_to_author,
    confidential_comments_to_chair,
    submitted_at: new Date().toISOString()
  };

  db.reviews.push(review);

  // Update assignment
  const asgn = db.assignments.find(a => a.id === assignment_id);
  if (asgn) asgn.status = 'COMPLETED';

  res.status(201).json({ success: true, review });
});

apiRouter.get('/reviews/divergent', (req: Request, res: Response) => {
  // Find submissions with divergent scores (delta >= 4)
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

  res.json({ count: divergentSubmissions.length, divergentSubmissions });
});

// ============================================================
// 5. DECISION SUPPORT & CHAIR DECISION
// ============================================================
apiRouter.post('/decisions/recommend', async (req: Request, res: Response) => {
  const { submission_id } = req.body;
  const sub = db.submissions.find(s => s.id === submission_id || s.paper_number === Number(submission_id));
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const result = await agentTools.decisionSupportTool.execute({ paper_number: sub.paper_number });
  res.json(result);
});

apiRouter.get('/decisions', (req: Request, res: Response) => {
  res.json(db.decisions);
});

apiRouter.post('/decisions', (req: Request, res: Response) => {
  const { submission_id, final_decision, decision_letter, decided_by } = req.body;
  const sub = db.submissions.find(s => s.id === submission_id || s.paper_number === Number(submission_id));
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const decision = {
    id: `dec-${Date.now().toString().slice(-5)}`,
    submission_id: sub.id,
    ai_recommendation: final_decision,
    ai_reasoning: 'Confirmed by Conference Chair after reviewing peer scores.',
    divergence_flag: false,
    final_decision,
    decided_by: decided_by || 'Dr. Radhika Sharma (General Chair)',
    decision_letter: decision_letter || `Your paper #${sub.paper_number} has been ${final_decision}.`,
    decided_at: new Date().toISOString(),
    notification_sent: true
  };

  db.decisions.push(decision);

  // Update submission status
  if (final_decision === 'ACCEPT') sub.status = 'ACCEPTED';
  else if (final_decision === 'REJECT') sub.status = 'REJECTED';
  else sub.status = 'REVISION_REQUIRED';

  res.status(201).json({ success: true, decision });
});

// ============================================================
// 6. REGISTRATIONS & PAYMENTS (SANDBOX)
// ============================================================
apiRouter.get('/registrations', (req: Request, res: Response) => {
  res.json(db.registrations);
});

apiRouter.post('/registrations', (req: Request, res: Response) => {
  const { user_name, user_email, category, fee_amount, submission_id, paper_title } = req.body;

  const reg = {
    id: `reg-${Date.now().toString().slice(-5)}`,
    conference_id: db.conferences[0]?.id || 'conf-01',
    user_id: `u-${Date.now().toString().slice(-4)}`,
    user_name: user_name || 'Academic Delegate',
    user_email: user_email || 'delegate@university.edu',
    submission_id,
    paper_title,
    category: category || 'PARTICIPANT',
    fee_amount: Number(fee_amount) || 4000,
    currency: 'INR',
    status: 'PENDING' as const,
    payment_status: 'PENDING' as const,
    created_at: new Date().toISOString()
  };

  db.registrations.push(reg);
  res.status(201).json({ success: true, registration: reg });
});

apiRouter.post('/payments/create', async (req: Request, res: Response) => {
  const { registration_id, amount, currency } = req.body;
  try {
    const order = await paymentService.createOrder(registration_id, Number(amount), currency || 'INR');
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/payments/sandbox-pay', async (req: Request, res: Response) => {
  const { registration_id, order_id, card_number, cardholder_name, amount } = req.body;
  try {
    const result = await paymentService.processSandboxPayment(order_id, card_number, cardholder_name);

    const paymentRecord = {
      id: `pay-${Date.now().toString().slice(-5)}`,
      registration_id,
      order_id,
      payment_id: result.payment_id,
      amount: Number(amount) || 4000,
      currency: 'INR',
      payment_mode: 'SANDBOX' as const,
      status: 'SUCCESS' as const,
      receipt_url: `/receipts/${result.receipt_id}.pdf`,
      created_at: new Date().toISOString(),
      verified_at: new Date().toISOString()
    };

    db.payments.push(paymentRecord);

    // Update registration
    const reg = db.registrations.find(r => r.id === registration_id);
    if (reg) {
      reg.status = 'CONFIRMED';
      reg.payment_status = 'SUCCESS';
    }

    res.json({ ...result, payment: paymentRecord });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// 7. PROGRAMME SCHEDULER
// ============================================================
apiRouter.get('/schedule', (req: Request, res: Response) => {
  res.json(db.sessions);
});

apiRouter.post('/schedule/generate', (req: Request, res: Response) => {
  const sessions = schedulerService.generateProgramme({
    conferenceId: db.conferences[0]?.id || 'conf-01'
  });
  res.json({ success: true, count: sessions.length, sessions });
});

// ============================================================
// 8. CERTIFICATES & PROCEEDINGS
// ============================================================
apiRouter.get('/certificates', (req: Request, res: Response) => {
  res.json(db.certificates);
});

apiRouter.post('/certificates/generate', (req: Request, res: Response) => {
  const { recipient_name, recipient_email, role, paper_title } = req.body;
  const cert = certificateService.generateCertificate({
    recipientName: recipient_name,
    recipientEmail: recipient_email,
    role,
    paperTitle: paper_title
  });
  res.status(201).json({ success: true, certificate: cert });
});

apiRouter.get('/certificates/:id/verify', (req: Request, res: Response) => {
  const certNumber = req.params.id;
  const result = certificateService.verifyCertificate(certNumber);
  res.json(result);
});

apiRouter.get('/certificates/:id/pdf', async (req: Request, res: Response) => {
  const cert = db.certificates.find(c => c.certificate_number === req.params.id);
  if (!cert) return res.status(404).send('Certificate not found');

  try {
    const pdfBytes = await certificateService.createPdfDocument(cert);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${cert.certificate_number}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    res.status(500).send(`Failed to render certificate PDF: ${err.message}`);
  }
});

apiRouter.get('/proceedings', (req: Request, res: Response) => {
  res.json(db.proceedings[0] || null);
});

apiRouter.post('/proceedings/generate', (req: Request, res: Response) => {
  const { isbn } = req.body;
  const proceedings = proceedingsService.compileProceedings(db.conferences[0]?.id || 'conf-01', isbn);
  res.json({ success: true, proceedings });
});

// ============================================================
// 9. ANALYTICS & INTEGRATION STATUS
// ============================================================
apiRouter.get('/analytics/conference/:id', (req: Request, res: Response) => {
  res.json(db.getAnalytics(req.params.id));
});

apiRouter.get('/integrations/status', (req: Request, res: Response) => {
  const agent17 = getAgent17Provider();
  res.json({
    groq: groqService.getStatus(),
    supabase: supabaseService.getStatus(),
    email: emailService.getStatus(),
    payment: paymentService.getStatus(),
    agent17: agent17.getProviderStatus()
  });
});

// ============================================================
// 10. BOLT AI ASSISTANT CHAT
// ============================================================
apiRouter.post('/assistant/chat', async (req: Request, res: Response) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    const reply = await boltAgent.handleMessage(message, history || []);
    res.json(reply);
  } catch (err: any) {
    console.error('Bolt Agent Error:', err);
    res.status(500).json({
      id: `err-${Date.now()}`,
      role: 'assistant',
      content: `I encountered an internal error while processing your request: ${err.message}`,
      timestamp: new Date().toLocaleTimeString()
    });
  }
});
