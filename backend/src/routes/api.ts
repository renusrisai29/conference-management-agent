import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { Router, Request, Response, NextFunction } from 'express';
import { getRepository } from '../database/repositoryFactory';
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
import { automationService, getIstTimestamp } from '../services/automationService';
import { Submission, Review, ReviewerAssignment, User } from '../types';

export const apiRouter = Router();

const asyncHandler = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => (req: Request, res: Response, next: NextFunction) => {
  try {
    Promise.resolve(handler(req, res, next)).catch(next);
  } catch (error) {
    next(error);
  }
};

const wrapRouterMethods = () => {
  const methods = ['get', 'post', 'patch', 'delete'] as const;

  for (const method of methods) {
    const originalMethod = (apiRouter as any)[method].bind(apiRouter);
    (apiRouter as any)[method] = (...args: any[]) => {
      const handler = args[args.length - 1];
      if (typeof handler === 'function') {
        args[args.length - 1] = asyncHandler(handler as any);
      }
      return originalMethod(...args);
    };
  }
};

wrapRouterMethods();

// ============================================================
// 1. CONFERENCES & CFP
// ============================================================
apiRouter.get('/conferences', async (req: Request, res: Response) => {
  const repo = getRepository();
  const conferences = await repo.getConferences();
  res.json(conferences);
});

apiRouter.get('/conferences/:id', async (req: Request, res: Response) => {
  const repo = getRepository();
  const conf = await repo.getConferenceById(req.params.id);
  if (!conf) return res.status(404).json({ error: 'Conference not found' });
  const tracks = await repo.getTracks(conf.id);
  res.json({ ...conf, tracks });
});

apiRouter.patch('/conferences/:id', async (req: Request, res: Response) => {
  try {
    const userRole = (req.headers['x-user-role'] as string) || 'CHAIR';
    if (userRole && !['ADMIN', 'CHAIR', 'ORGANIZER'].includes(userRole.toUpperCase())) {
      return res.status(403).json({
        error: 'Forbidden: Only administrators, general chairs, or conference organizers are authorized to configure conference parameters.'
      });
    }
    const repo = getRepository();
    const conf = await repo.updateConference(req.params.id, req.body);
    try {
      await automationService.automateCfpDistribution();
      await automationService.automateOutputs();
    } catch (e: any) {
      console.warn('[Automation hook error on conference update]:', e.message);
    }
    res.json({ success: true, conference: conf });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Conference not found' });
  }
});

apiRouter.get('/conferences/:id/cfp', async (req: Request, res: Response) => {
  try {
    const cfp = await automationService.getCfp(req.params.id);
    res.json({ success: true, ...cfp });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get CFP' });
  }
});

apiRouter.post('/conferences/:id/cfp/generate', async (req: Request, res: Response) => {
  try {
    const theme = req.body?.theme;
    const result = await automationService.generateAndSaveCfp(req.params.id, theme, true);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate CFP' });
  }
});

apiRouter.post('/conferences/:id/cfp/distribute', async (req: Request, res: Response) => {
  try {
    const result = await automationService.distributeCfp(req.params.id, true);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to distribute CFP' });
  }
});

// ============================================================
// 2. SUBMISSIONS & SIMILARITY
// ============================================================
apiRouter.get('/submissions', async (req: Request, res: Response) => {
  const repo = getRepository();
  const submissions = await repo.getSubmissions();
  res.json(submissions);
});

apiRouter.get('/submissions/template', (req: Request, res: Response) => {
  const candidatePaths = [
    path.join(__dirname, '../assets/IEEE_Official_Paper_Template.pdf'),
    path.join(__dirname, '../../frontend/public/IEEE_Official_Paper_Template.pdf'),
    path.join(process.cwd(), 'backend/src/assets/IEEE_Official_Paper_Template.pdf'),
    path.join(process.cwd(), 'frontend/public/IEEE_Official_Paper_Template.pdf'),
    'C:/Users/Renuk/.gemini/antigravity/brain/21d31f91-357c-413c-8900-1e715ebdb864/.user_uploaded/media_1789267747292.pdf'
  ];
  const templatePath = candidatePaths.find(p => fs.existsSync(p));
  if (!templatePath) {
    return res.status(404).json({ error: 'Official paper template not found' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="IEEE_Official_Paper_Template.pdf"');
  return res.sendFile(path.resolve(templatePath));
});

apiRouter.get('/submissions/:id', async (req: Request, res: Response) => {
  const repo = getRepository();
  const sub = await repo.getSubmissionById(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  res.json(sub);
});

apiRouter.get(['/submissions/:id/manuscript', '/submissions/:id/pdf'], async (req: Request, res: Response) => {
  const repo = getRepository();
  let sub = await repo.getSubmissionById(req.params.id);
  if (!sub) {
    const allSubs = await repo.getSubmissions();
    sub = allSubs.find(s => s.id === req.params.id || String(s.paper_number) === req.params.id) || null;
  }
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const fileName = sub.file_name || `paper_${sub.paper_number}.pdf`;
  const candidatePaths = [
    path.join(process.cwd(), 'uploads/papers', fileName),
    path.join(process.cwd(), 'backend/uploads/papers', fileName),
    path.join(process.cwd(), 'frontend/public/uploads/papers', fileName),
    path.join(__dirname, '../../uploads/papers', fileName),
    path.join(__dirname, '../uploads/papers', fileName),
    path.join(__dirname, '../../../frontend/public/uploads/papers', fileName)
  ];

  const filePath = candidatePaths.find(p => fs.existsSync(p));
  if (!filePath) {
    return res.status(404).json({ error: `Manuscript PDF (${fileName}) not found for Paper #${sub.paper_number}` });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  return res.sendFile(path.resolve(filePath));
});

apiRouter.post('/submissions', async (req: Request, res: Response) => {
  const { title, abstract, track_id, keywords, authors, page_count, file_name, file_path } = req.body;

  if (!title || !abstract || !authors || authors.length === 0) {
    return res.status(400).json({ error: 'Title, abstract, and at least one author are required.' });
  }

  const repo = getRepository();
  const allSubs = await repo.getSubmissions();
  const nextNumber = allSubs.length > 0 ? Math.max(...allSubs.map(s => s.paper_number)) + 1 : 101;
  const tracks = await repo.getTracks();
  const track = tracks.find(t => t.id === track_id) || tracks[0];
  const conf = await repo.getConferenceById();

  const parsedKeywords = Array.isArray(keywords)
    ? keywords
    : (typeof keywords === 'string' ? keywords.split(',').map((k: string) => k.trim()) : []);

  const newSub: Partial<Submission> = {
    id: `sub-${nextNumber}`,
    paper_number: nextNumber,
    conference_id: conf ? conf.id : 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    track_id: track ? track.id : track_id,
    track_name: track ? track.name : 'General Research Track',
    title,
    abstract,
    keywords: parsedKeywords,
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
    file_name: file_name || (file_path ? file_path.split('/').pop() : `paper_${nextNumber}.pdf`),
    file_path: file_name ? (file_name.startsWith('/uploads/') ? file_name : `/uploads/papers/${file_name}`) : (file_path || `/uploads/papers/paper_${nextNumber}.pdf`),
    similarity_score: 0,
    similarity_status: 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Run initial similarity check
  const sim = await similarityService.checkSimilarity(newSub as Submission, allSubs);
  newSub.similarity_score = sim.similarity_score;
  newSub.similarity_status = sim.status;

  const created = await repo.createSubmission(newSub);

  // Trigger automated reviewer assignment & CFP check
  try {
    const assignResult = await automationService.autoAssignReviewersForPaper(created);
    if (assignResult && assignResult.assignedCount > 0) {
      created.status = 'UNDER_REVIEW';
    }
  } catch (e: any) {
    console.warn('[Automation hook error on submission]:', e.message);
  }

  res.status(201).json({ success: true, submission: created });
});

apiRouter.delete('/submissions/:id', async (req: Request, res: Response) => {
  try {
    const repo = getRepository();
    const sub = await repo.getSubmissionById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    const userRole = (req.headers['x-user-role'] as string) || (req.query.role as string);
    const userEmail = (req.headers['x-user-email'] as string) || (req.query.email as string);

    // Permission check: Chair and Admin can delete any paper.
    // Participants and Authors can only delete their own submissions.
    if (userRole && userRole !== 'CHAIR' && userRole !== 'ADMIN') {
      const isOwner = sub.authors.some(a => a.email.toLowerCase() === userEmail?.toLowerCase());
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own submissions.' });
      }
    }

    const success = await repo.deleteSubmission(sub.id);
    res.json({ success, message: `Submission #${sub.paper_number} deleted successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete submission' });
  }
});

apiRouter.post('/submissions/:id/validate', async (req: Request, res: Response) => {
  const repo = getRepository();
  const sub = await repo.getSubmissionById(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const result = await agentTools.submissionValidationTool.execute({ paper_number: sub.paper_number });

  // If paper passes validation, trigger automated reviewer matching if needed
  if (result.status === 'VALID') {
    try {
      await automationService.autoAssignReviewersForPaper(sub);
    } catch (e: any) {
      console.warn('[Automation hook error on validate]:', e.message);
    }
  }

  res.json(result);
});

apiRouter.post('/submissions/:id/similarity', async (req: Request, res: Response) => {
  const repo = getRepository();
  const sub = await repo.getSubmissionById(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const result = await similarityService.checkSimilarity(sub);
  await repo.updateSubmission(sub.id, {
    similarity_score: result.similarity_score,
    similarity_status: result.status
  });
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
  const repo = getRepository();
  const sub = await repo.getSubmissionById(submission_id);

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
  const repo = getRepository();
  const sub = await repo.getSubmissionById(submission_id);
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

apiRouter.get('/reviewer-assignments', async (req: Request, res: Response) => {
  const repo = getRepository();
  const assignments = await repo.getReviewerAssignments();
  res.json(assignments);
});

apiRouter.post('/reviewer-assignments', async (req: Request, res: Response) => {
  const { submission_id, reviewer_id, reviewer_name, reviewer_institution, match_score } = req.body;
  const repo = getRepository();

  const sub = await repo.getSubmissionById(submission_id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  // Conflict of Interest enforcement: strictly prevent conflicted reviewers from being assigned
  const provider = getAgent17Provider();
  const reviewer = await provider.getResearcherById(reviewer_id);
  if (reviewer) {
    const coi = coiService.detectConflicts(sub, reviewer);
    if (coi.has_conflict) {
      return res.status(400).json({
        error: `Assignment blocked: Active Conflict of Interest detected (${coi.reasons.join(', ')}). Conflicted reviewers cannot be assigned.`,
        has_conflict: true,
        reasons: coi.reasons
      });
    }
  }

  const assignments = await repo.getReviewerAssignments();
  const existing = assignments.find(
    a => a.submission_id === submission_id && a.reviewer_id === reviewer_id
  );
  if (existing) {
    return res.status(400).json({ error: 'Reviewer is already assigned to this submission.' });
  }

  const istNow = getIstTimestamp();
  const assignment = {
    id: `asgn-${Date.now().toString().slice(-5)}`,
    submission_id,
    reviewer_id,
    reviewer_name,
    reviewer_institution,
    match_score: match_score || 85.0,
    status: 'ASSIGNED' as const,
    due_date: '2026-11-10',
    assigned_at: istNow,
    assignment_source: 'MANUAL' as const,
    match_details: {
      assignment_source: 'MANUAL' as const,
      trigger_time_ist: istNow,
      matching_outcome: 'Manual chair assignment',
      selected_reviewers: [reviewer_name],
      conflict_exclusions: [],
      status_label: `Manual chair assignment at ${istNow}`
    }
  };

  const created = await repo.createReviewerAssignment(assignment);

  automationService.logAudit({
    action_type: 'MANUAL_REVIEWER_ASSIGNMENT',
    target_id: sub?.id || submission_id,
    target_title: `Paper #${sub?.paper_number || 'N/A'}: ${sub?.title || 'Unknown Title'}`,
    status: 'SUCCESS',
    message: `Manual chair assignment: ${reviewer_name} (${reviewer_institution}) assigned to Paper #${sub?.paper_number || 'N/A'} at ${istNow}.`,
    details: {
      assignment_source: 'MANUAL',
      reviewer_name,
      trigger_time_ist: istNow
    }
  });

  // Update submission status to UNDER_REVIEW
  if (sub && sub.status === 'SUBMITTED') {
    await repo.updateSubmission(sub.id, { status: 'UNDER_REVIEW' });
  }

  res.status(201).json({ success: true, assignment: created });
});

apiRouter.post('/reviewer-assignments/:id/remind', async (req: Request, res: Response) => {
  const { id } = req.params;
  const repo = getRepository();
  const assignments = await repo.getReviewerAssignments();
  const assignment = assignments.find(a => a.id === id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const sub = await repo.getSubmissionById(assignment.submission_id);

  const emailResult = await emailService.sendEmail({
    recipientEmail: `${assignment.reviewer_id.toLowerCase()}@faculty.vignan.edu`,
    recipientName: assignment.reviewer_name,
    subject: `[URGENT REMINDER] Review Deadline Approaching for Paper #${sub?.paper_number || ''}`,
    body: `Dear ${assignment.reviewer_name},\n\nThis is a friendly reminder from the AGENTIC-AI-2026 Program Committee regarding your pending review for manuscript #${sub?.paper_number}: "${sub?.title}".\n\nThe review deadline is ${assignment.due_date}. Please complete your evaluation in the reviewer portal at your earliest convenience.\n\nBest regards,\nConference Secretariat`,
    category: 'REMINDER'
  });

  res.json({
    success: true,
    message: `Review reminder sent to ${assignment.reviewer_name}`,
    delivery_status: emailResult.status,
    message_id: emailResult.messageId,
    assignment_id: id
  });
});

apiRouter.post('/reviewer-assignments/:id/reassign', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { new_reviewer_id, new_reviewer_name, new_reviewer_institution } = req.body;
  const repo = getRepository();

  const assignments = await repo.getReviewerAssignments();
  const oldAssignment = assignments.find(a => a.id === id);
  if (!oldAssignment) return res.status(404).json({ error: 'Original assignment not found' });

  const sub = await repo.getSubmissionById(oldAssignment.submission_id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  // Validate new reviewer and strictly preserve COI rules
  const provider = getAgent17Provider();
  const newReviewer = await provider.getResearcherById(new_reviewer_id);
  if (!newReviewer) return res.status(404).json({ error: 'New reviewer not found' });

  const coi = coiService.detectConflicts(sub, newReviewer);
  if (coi.has_conflict) {
    return res.status(400).json({
      error: `Reassignment blocked: Active Conflict of Interest detected (${coi.reasons.join(', ')}). Conflicted reviewers cannot be assigned under COI rules.`,
      has_conflict: true,
      reasons: coi.reasons
    });
  }

  // Mark old assignment as DECLINED / DEFAULTED
  await repo.updateReviewerAssignment(oldAssignment.id, {
    status: 'DECLINED'
  });

  // Create new assignment
  const newAssignment = {
    id: `asgn-${Date.now().toString().slice(-5)}`,
    submission_id: sub.id,
    reviewer_id: newReviewer.researcher_id,
    reviewer_name: new_reviewer_name || newReviewer.name,
    reviewer_institution: new_reviewer_institution || newReviewer.institution,
    match_score: 88.0,
    status: 'ASSIGNED' as const,
    due_date: '2026-11-20',
    assigned_at: new Date().toISOString()
  };

  const created = await repo.createReviewerAssignment(newAssignment);

  // Send invitation simulation to new reviewer
  await emailService.sendEmail({
    recipientEmail: `${newReviewer.researcher_id.toLowerCase()}@faculty.vignan.edu`,
    recipientName: newReviewer.name,
    subject: `[Review Request] Reassigned Paper #${sub.paper_number}: "${sub.title}"`,
    body: `Dear ${newReviewer.name},\n\nYou have been reassigned as a peer reviewer for manuscript #${sub.paper_number} ("${sub.title}"). Due date: ${newAssignment.due_date}.`,
    category: 'REVIEW_INVITE'
  });

  res.status(201).json({
    success: true,
    message: `Paper #${sub.paper_number} successfully reassigned from ${oldAssignment.reviewer_name} to ${newReviewer.name}. COI rules strictly preserved.`,
    old_assignment_id: oldAssignment.id,
    new_assignment: created
  });
});

apiRouter.delete('/reviewer-assignments/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const repo = getRepository();
  const deleted = await repo.deleteReviewerAssignment(id);
  res.json({ success: deleted });
});

// ============================================================
// 3B. REVIEWER PORTAL & REVIEW WORKSPACE
// ============================================================

// Helper: Normalize reviewer name for matching
const normalizeReviewerName = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Helper: Resolve reviewer user from institutional email, Agent 17 account ID, or UUID
const resolveReviewerUser = async (identifier: string, users: User[]): Promise<User | null> => {
  const clean = (identifier || '').trim().toLowerCase();
  if (!clean) return null;
  const idPrefix = clean.replace(/@.*$/, '');

  let user = users.find(u =>
    u.email.toLowerCase() === clean ||
    u.id.toLowerCase() === clean
  );

  if (!user) {
    const provider = getAgent17Provider();
    const researchers = await provider.getResearchers();
    const matched = researchers.find(r =>
      r.researcher_id.toLowerCase() === clean ||
      r.researcher_id.toLowerCase() === idPrefix
    );
    if (matched) {
      user = users.find(u =>
        u.scopus_id === matched.scopus_author_id ||
        normalizeReviewerName(u.full_name) === normalizeReviewerName(matched.name)
      );
    }
  }

  return user || null;
};

// Reviewer Accounts List: Returns all existing approved users with REVIEWER role
apiRouter.get('/reviewer/accounts', async (req: Request, res: Response) => {
  const repo = getRepository();
  const allUsers = await repo.getUsers();
  const reviewers = allUsers
    .filter(u => u.role === 'REVIEWER' && u.is_active !== false)
    .map(u => {
      const cleanParts = u.full_name
        .split(' ')
        .filter((p: string) => !['Dr.', 'Prof.', 'Mr.', 'Ms.', 'PhD'].includes(p));
      const inits = cleanParts.length >= 2
        ? (cleanParts[0][0] + cleanParts[cleanParts.length - 1][0]).toUpperCase()
        : u.full_name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();

      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        institution: u.institution,
        department: u.department || '',
        designation: u.designation || '',
        role: u.role,
        scopus_id: u.scopus_id || '',
        orcid_id: u.orcid_id || '',
        initials: inits || 'RV'
      };
    });

  res.json({
    success: true,
    total: reviewers.length,
    reviewers
  });
});

// Reviewer Login endpoint: Validates credentials and enforces REVIEWER role with Scopus ID demo authentication
apiRouter.post('/reviewer/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !String(email).trim()) {
    return res.status(400).json({ error: 'Reviewer institutional email address is required.' });
  }

  if (!password || !String(password).trim()) {
    return res.status(400).json({ error: 'Password is required. (Demo credential: Scopus ID).' });
  }

  const repo = getRepository();
  const users = await repo.getUsers();
  const user = await resolveReviewerUser(String(email), users);

  if (!user) {
    return res.status(404).json({
      error: 'Reviewer account not found. Please verify your email address.'
    });
  }

  if (user.role !== 'REVIEWER') {
    return res.status(403).json({
      error: `Forbidden: Access restricted to authorized peer reviewers only. Your current role is '${user.role}'. Authors, participants, and session chairs cannot enter the Reviewer Workspace.`
    });
  }

  // Demo credential authentication: Validate against reviewer's own existing Scopus ID
  const expectedScopusId = (user.scopus_id || '').trim();
  const enteredPassword = String(password).trim();

  if (!expectedScopusId || enteredPassword !== expectedScopusId) {
    return res.status(401).json({
      error: 'Authentication failed: Invalid email or password. Please check your credentials and try again.'
    });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      institution: user.institution,
      department: user.department || '',
      designation: user.designation || '',
      role: user.role,
      scopus_id: user.scopus_id,
      orcid_id: user.orcid_id,
      is_active: user.is_active
    }
  });
});

// Reviewer Profile endpoint: Verifies REVIEWER role from headers and returns profile
apiRouter.get('/reviewer/profile', async (req: Request, res: Response) => {
  const userRole = (req.headers['x-user-role'] as string) || (req.query.role as string) || '';
  const userEmail = (req.headers['x-user-email'] as string) || (req.query.email as string) || '';

  if (userRole.toUpperCase() !== 'REVIEWER') {
    return res.status(403).json({
      error: 'Forbidden: Access restricted to authorized peer reviewers only.'
    });
  }

  const repo = getRepository();
  const users = await repo.getUsers();
  const user = await resolveReviewerUser(userEmail, users);

  if (!user || user.role !== 'REVIEWER') {
    return res.status(404).json({ error: 'Reviewer profile not found.' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      institution: user.institution,
      department: user.department || '',
      designation: user.designation || '',
      role: user.role,
      scopus_id: user.scopus_id,
      orcid_id: user.orcid_id,
      is_active: user.is_active
    }
  });
});

// Assigned-papers workspace: Returns ONLY that reviewer's active assigned papers
apiRouter.get('/reviewer/assignments', async (req: Request, res: Response) => {
  const userRole = (req.headers['x-user-role'] as string) || (req.query.role as string) || '';
  const userEmail = (req.headers['x-user-email'] as string) || (req.query.email as string) || '';

  if (userRole.toUpperCase() !== 'REVIEWER') {
    return res.status(403).json({
      error: 'Forbidden: Access restricted to authorized peer reviewers only.'
    });
  }

  const repo = getRepository();
  const users = await repo.getUsers();
  const user = await resolveReviewerUser(userEmail, users);

  if (!user || user.role !== 'REVIEWER') {
    return res.status(403).json({
      error: 'Forbidden: Valid reviewer identity could not be verified from provided credentials.'
    });
  }

  const allAssignments = await repo.getReviewerAssignments();
  const allSubs = await repo.getSubmissions();
  const conf = await repo.getConferenceById();
  const allReviews = await repo.getReviews();

  const isDoubleBlind = (conf?.review_model || 'DOUBLE_BLIND') === 'DOUBLE_BLIND';

  // Filter assignments strictly belonging to this authenticated reviewer
  const reviewerNorm = normalizeReviewerName(user.full_name);
  const myAssignments = allAssignments.filter(a => {
    if (a.reviewer_id === user.id) return true;
    if (normalizeReviewerName(a.reviewer_name) === reviewerNorm) return true;
    return false;
  });

  const workspaceItems = myAssignments.map(a => {
    const sub = allSubs.find(s => s.id === a.submission_id || String(s.paper_number) === a.submission_id);

    // Compute status
    let displayStatus: 'Assigned' | 'In Progress' | 'Submitted' | 'Overdue' | 'Reassigned' = 'Assigned';
    const isPastDue = new Date(a.due_date) < new Date();

    if (a.status === 'COMPLETED') {
      displayStatus = 'Submitted';
    } else if (a.status === 'DECLINED') {
      displayStatus = 'Reassigned';
    } else if (isPastDue) {
      displayStatus = 'Overdue';
    } else if (a.status === 'IN_PROGRESS' || Boolean(a.match_details?.draft_review)) {
      displayStatus = 'In Progress';
    } else {
      displayStatus = 'Assigned';
    }

    // Confidentiality & Double-blind: NEVER expose author names, affiliations, or emails in double blind mode
    const sanitizedPaper = sub ? {
      id: sub.id,
      paper_number: sub.paper_number,
      title: sub.title,
      track_name: sub.track_name || 'General Research Track',
      abstract: sub.abstract,
      keywords: sub.keywords || [],
      page_count: sub.page_count,
      status: sub.status,
      // Strictly redact authors in double-blind mode
      authors: isDoubleBlind
        ? []
        : (sub.authors || []).map(ath => ({ name: ath.name, institution: ath.institution }))
    } : null;

    // Review isolation: Only return the reviewer's own review or saved draft
    // NEVER expose other reviewers' reviews, scores, or identities
    const existingFinalReview = allReviews.find(r =>
      r.assignment_id === a.id ||
      (r.submission_id === a.submission_id && (
        normalizeReviewerName(r.reviewer_name) === reviewerNorm ||
        r.reviewer_id === user.id ||
        r.reviewer_id === a.reviewer_id
      ))
    );

    const draftReview = a.match_details?.draft_review || null;

    const myReview = existingFinalReview ? {
      id: existingFinalReview.id,
      overall_score: existingFinalReview.overall_score,
      confidence: existingFinalReview.confidence,
      soundness_score: existingFinalReview.soundness_score,
      originality_score: existingFinalReview.originality_score,
      presentation_score: existingFinalReview.presentation_score,
      recommendation: existingFinalReview.recommendation,
      strengths: existingFinalReview.strengths,
      weaknesses: existingFinalReview.weaknesses,
      comments_to_author: existingFinalReview.comments_to_author,
      confidential_comments_to_chair: existingFinalReview.confidential_comments_to_chair || '',
      submitted_at: existingFinalReview.submitted_at,
      is_submitted: true,
      is_locked: true
    } : (draftReview ? {
      ...draftReview,
      is_submitted: false,
      is_locked: false
    } : null);

    return {
      assignment_id: a.id,
      submission_id: a.submission_id,
      due_date: a.due_date,
      assigned_at: a.assigned_at,
      match_score: a.match_score,
      status: displayStatus,
      raw_status: a.status,
      is_locked: Boolean(existingFinalReview),
      paper: sanitizedPaper,
      review: myReview,
      review_model: conf?.review_model || 'DOUBLE_BLIND'
    };
  });

  res.json({
    success: true,
    reviewer: {
      name: user.full_name,
      institution: user.institution,
      department: user.department || '',
      email: user.email
    },
    total_assigned: workspaceItems.length,
    assignments: workspaceItems
  });
});

// Secure Manuscript Access for Reviewer: Enforces assignment permission check
apiRouter.get('/reviewer/papers/:submissionId/manuscript', async (req: Request, res: Response) => {
  const userRole = (req.headers['x-user-role'] as string) || (req.query.role as string) || '';
  const userEmail = (req.headers['x-user-email'] as string) || (req.query.email as string) || '';

  if (userRole.toUpperCase() !== 'REVIEWER') {
    return res.status(403).json({
      error: 'Forbidden: Access restricted to authorized peer reviewers only.'
    });
  }

  const repo = getRepository();
  const users = await repo.getUsers();
  const user = users.find(u => u.email.toLowerCase() === userEmail.toLowerCase() && u.role === 'REVIEWER');

  if (!user) {
    return res.status(403).json({ error: 'Forbidden: Invalid reviewer credentials.' });
  }

  // Find the requested submission
  let sub = await repo.getSubmissionById(req.params.submissionId);
  if (!sub) {
    const allSubs = await repo.getSubmissions();
    sub = allSubs.find(s => s.id === req.params.submissionId || String(s.paper_number) === req.params.submissionId) || null;
  }
  if (!sub) return res.status(404).json({ error: 'Submission not found.' });

  // STRICT ACCESS CHECK: Ensure paper is assigned to THIS reviewer
  const allAssignments = await repo.getReviewerAssignments();
  const reviewerNorm = normalizeReviewerName(user.full_name);
  const isAssignedToReviewer = allAssignments.some(a =>
    (a.submission_id === sub!.id || a.submission_id === req.params.submissionId) &&
    (a.reviewer_id === user.id || normalizeReviewerName(a.reviewer_name) === reviewerNorm)
  );

  if (!isAssignedToReviewer) {
    return res.status(403).json({
      error: `Forbidden: Paper #${sub.paper_number} is not assigned to you. Access denied.`
    });
  }

  // Locate PDF file
  const fileName = sub.file_name || `paper_${sub.paper_number}.pdf`;
  const candidatePaths = [
    path.join(process.cwd(), 'uploads/papers', fileName),
    path.join(process.cwd(), 'backend/uploads/papers', fileName),
    path.join(process.cwd(), 'frontend/public/uploads/papers', fileName),
    path.join(__dirname, '../../uploads/papers', fileName),
    path.join(__dirname, '../uploads/papers', fileName),
    path.join(__dirname, '../../../frontend/public/uploads/papers', fileName)
  ];

  const filePath = candidatePaths.find(p => fs.existsSync(p));
  if (!filePath) {
    return res.status(404).json({
      error: `Manuscript PDF (${fileName}) not found for Paper #${sub.paper_number}`
    });
  }

  const conf = await repo.getConferenceById();
  const isDoubleBlind = (conf?.review_model || 'DOUBLE_BLIND') === 'DOUBLE_BLIND';

  res.setHeader('Content-Type', 'application/pdf');
  // In double-blind mode, provide an anonymized download filename without author metadata
  const blindName = isDoubleBlind ? `manuscript_paper_${sub.paper_number}_blind.pdf` : fileName;
  res.setHeader('Content-Disposition', `inline; filename="${blindName}"`);
  return res.sendFile(path.resolve(filePath));
});

// Review Submission & Draft Saving: Allows draft save or finalized submission
apiRouter.post('/reviewer/assignments/:assignmentId/review', async (req: Request, res: Response) => {
  const userRole = (req.headers['x-user-role'] as string) || (req.query.role as string) || '';
  const userEmail = (req.headers['x-user-email'] as string) || (req.query.email as string) || '';

  if (userRole.toUpperCase() !== 'REVIEWER') {
    return res.status(403).json({
      error: 'Forbidden: Access restricted to authorized peer reviewers only.'
    });
  }

  const repo = getRepository();
  const users = await repo.getUsers();
  const user = users.find(u => u.email.toLowerCase() === userEmail.toLowerCase() && u.role === 'REVIEWER');

  if (!user) {
    return res.status(403).json({ error: 'Forbidden: Invalid reviewer credentials.' });
  }

  const allAssignments = await repo.getReviewerAssignments();
  const assignment = allAssignments.find(a => a.id === req.params.assignmentId);

  if (!assignment) {
    return res.status(404).json({ error: 'Review assignment not found.' });
  }

  // STRICT ACCESS CHECK: Ensure assignment belongs to authenticated reviewer
  const reviewerNorm = normalizeReviewerName(user.full_name);
  if (assignment.reviewer_id !== user.id && normalizeReviewerName(assignment.reviewer_name) !== reviewerNorm) {
    return res.status(403).json({
      error: 'Forbidden: You do not have permission to submit reviews for another reviewer\'s assignment.'
    });
  }

  // Lock check: If assignment already completed/submitted, editing is locked
  if (assignment.status === 'COMPLETED') {
    return res.status(403).json({
      error: 'Locked: This review has already been finalized and submitted. Editing is locked unless reopened by a conference chair.'
    });
  }

  const {
    overall_score, confidence, soundness_score, originality_score, presentation_score,
    recommendation, strengths, weaknesses, comments_to_author, confidential_comments_to_chair,
    is_draft
  } = req.body;

  // DRAFT WORKFLOW: Save draft and mark assignment In Progress
  if (is_draft === true) {
    const draftPayload = {
      overall_score: Number(overall_score) || 7,
      confidence: Number(confidence) || 4,
      soundness_score: Number(soundness_score) || 4,
      originality_score: Number(originality_score) || 4,
      presentation_score: Number(presentation_score) || 4,
      recommendation: recommendation || 'ACCEPT',
      strengths: strengths || '',
      weaknesses: weaknesses || '',
      comments_to_author: comments_to_author || '',
      confidential_comments_to_chair: confidential_comments_to_chair || '',
      saved_at: new Date().toISOString()
    };

    const matchDetails = {
      ...(assignment.match_details || {}),
      draft_review: draftPayload
    };

    await repo.updateReviewerAssignment(assignment.id, {
      status: 'IN_PROGRESS',
      match_details: matchDetails
    });

    return res.json({
      success: true,
      message: 'Review draft saved successfully. Assignment marked as In Progress.',
      status: 'In Progress',
      draft: draftPayload
    });
  }

  // FINAL SUBMISSION WORKFLOW: Validate required fields
  const scoreNum = Number(overall_score);
  if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 10) {
    return res.status(400).json({ error: 'Validation failed: Overall score must be an integer between 1 and 10.' });
  }

  const validRecommendations = ['ACCEPT', 'MINOR_REVISION', 'MAJOR_REVISION', 'REJECT'];
  if (!validRecommendations.includes(recommendation)) {
    return res.status(400).json({ error: `Validation failed: Recommendation must be one of: ${validRecommendations.join(', ')}.` });
  }

  if (!strengths || String(strengths).trim().length < 5) {
    return res.status(400).json({ error: 'Validation failed: Strengths field is required (minimum 5 characters).' });
  }

  if (!weaknesses || String(weaknesses).trim().length < 5) {
    return res.status(400).json({ error: 'Validation failed: Weaknesses field is required (minimum 5 characters).' });
  }

  if (!comments_to_author || String(comments_to_author).trim().length < 5) {
    return res.status(400).json({ error: 'Validation failed: Comments to author are required (minimum 5 characters).' });
  }

  // Persist finalized review in reviews table
  const newReview: Partial<Review> = {
    id: `rev-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
    assignment_id: assignment.id,
    submission_id: assignment.submission_id,
    reviewer_id: assignment.reviewer_id,
    reviewer_name: user.full_name,
    overall_score: scoreNum,
    confidence: Number(confidence) || 4,
    soundness_score: Number(soundness_score) || 4,
    originality_score: Number(originality_score) || 4,
    presentation_score: Number(presentation_score) || 4,
    recommendation,
    strengths: String(strengths).trim(),
    weaknesses: String(weaknesses).trim(),
    comments_to_author: String(comments_to_author).trim(),
    confidential_comments_to_chair: confidential_comments_to_chair ? String(confidential_comments_to_chair).trim() : '',
    submitted_at: new Date().toISOString()
  };

  const createdReview = await repo.createReview(newReview);

  // Update assignment status to COMPLETED and clean up draft
  const updatedMatchDetails = { ...(assignment.match_details || {}) };
  delete updatedMatchDetails.draft_review;
  updatedMatchDetails.final_review_id = createdReview.id;
  updatedMatchDetails.finalized_at = new Date().toISOString();

  await repo.updateReviewerAssignment(assignment.id, {
    status: 'COMPLETED',
    match_details: updatedMatchDetails
  });

  // Automatically update review dashboard, decision recommendations, and automation outputs
  try {
    await automationService.automateDecisionSupport();
    await automationService.automateOutputs();
  } catch (e: any) {
    console.warn('[Automation hook error on reviewer workspace submit]:', e.message);
  }

  // Log to audit trail
  const istNow = getIstTimestamp();
  const sub = await repo.getSubmissionById(assignment.submission_id);
  automationService.logAudit({
    action_type: 'ESCALATION',
    target_id: assignment.submission_id,
    target_title: `Paper #${sub?.paper_number || ''}: ${sub?.title || ''}`,
    status: 'SUCCESS',
    message: `Paper #${sub?.paper_number || assignment.submission_id} review submitted by reviewer ${user.full_name} at ${istNow} with score ${scoreNum}/10 (${recommendation}).`
  });

  res.status(201).json({
    success: true,
    message: 'Final review submitted successfully and locked from further editing.',
    status: 'Submitted',
    review: createdReview
  });
});

// Reopen Review endpoint: Allows authorized chairs/admins to unlock a finalized review
apiRouter.post('/reviewer/assignments/:assignmentId/reopen', async (req: Request, res: Response) => {
  const userRole = (req.headers['x-user-role'] as string) || (req.query.role as string) || '';
  if (!['CHAIR', 'ADMIN', 'ORGANIZER'].includes(userRole.toUpperCase())) {
    return res.status(403).json({
      error: 'Forbidden: Only authorized chairs or administrators can reopen finalized reviews.'
    });
  }

  const repo = getRepository();
  const assignment = (await repo.getReviewerAssignments()).find(a => a.id === req.params.assignmentId);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });

  await repo.updateReviewerAssignment(assignment.id, { status: 'IN_PROGRESS' });
  res.json({ success: true, message: 'Review assignment unlocked and reopened for reviewer modifications.' });
});

// ============================================================
// 4. REVIEWS & DIVERGENCE DETECTION
// ============================================================
apiRouter.get('/reviews', async (req: Request, res: Response) => {
  const { submission_id } = req.query;
  const repo = getRepository();
  const reviews = await repo.getReviews(submission_id as string | undefined);
  res.json(reviews);
});

apiRouter.post('/reviews', async (req: Request, res: Response) => {
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

  const repo = getRepository();
  const created = await repo.createReview(review);

  // Trigger automated decision support & outputs
  try {
    await automationService.automateDecisionSupport();
    await automationService.automateOutputs();
  } catch (e: any) {
    console.warn('[Automation hook error on review submission]:', e.message);
  }

  res.status(201).json({ success: true, review: created });
});

apiRouter.get('/reviews/divergent', async (req: Request, res: Response) => {
  const repo = getRepository();
  const result = await repo.getDivergentReviews();
  res.json(result);
});

// ============================================================
// 5. DECISION SUPPORT & CHAIR DECISION
// ============================================================
apiRouter.get('/decisions/recommendations-summary', async (req: Request, res: Response) => {
  const repo = getRepository();
  const subs = await repo.getSubmissions();
  const allReviews = await repo.getReviews();
  const allDecisions = await repo.getDecisions();

  const summary = subs.map(sub => {
    const subReviews = allReviews.filter(r => r.submission_id === sub.id);
    const existingDecision = allDecisions.find(d => d.submission_id === sub.id);
    const scores = subReviews.map(r => r.overall_score);
    const avgScore = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : null;
    const isDivergent = scores.length >= 2 && (Math.max(...scores) - Math.min(...scores) >= 4);

    let recommendation: 'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT' | 'PENDING_REVIEWS' = 'PENDING_REVIEWS';
    let reasoning = 'Awaiting completed peer evaluations.';

    if (subReviews.length > 0) {
      if (isDivergent) {
        recommendation = 'MAJOR_REVISION';
        reasoning = `Divergent reviewer scores (${scores.join(', ')}). Score delta: ${Math.max(...scores) - Math.min(...scores)} points. Requires chair arbitration.`;
      } else if (avgScore !== null && avgScore >= 7.5) {
        recommendation = 'ACCEPT';
        reasoning = `Consensus accept across ${subReviews.length} reviews. Average score: ${avgScore}/10.`;
      } else if (avgScore !== null && avgScore >= 5.5) {
        recommendation = 'MINOR_REVISION';
        reasoning = `Borderline acceptance with minor revisions. Average score: ${avgScore}/10.`;
      } else {
        recommendation = 'REJECT';
        reasoning = `Score below threshold. Average score: ${avgScore}/10.`;
      }
    }

    return {
      submission_id: sub.id,
      paper_number: sub.paper_number,
      title: sub.title,
      track_name: sub.track_name,
      total_reviews: subReviews.length,
      average_score: avgScore,
      divergence_flag: isDivergent,
      ai_recommendation: recommendation,
      ai_reasoning: reasoning,
      final_decision: existingDecision ? existingDecision.final_decision : null,
      decided_by: existingDecision ? existingDecision.decided_by : null,
      decided_at: existingDecision ? existingDecision.decided_at : null
    };
  });

  res.json(summary);
});

apiRouter.post('/decisions/recommend', async (req: Request, res: Response) => {
  const { submission_id } = req.body;
  const repo = getRepository();
  const sub = await repo.getSubmissionById(submission_id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const result = await agentTools.decisionSupportTool.execute({ paper_number: sub.paper_number });
  res.json(result);
});

apiRouter.get('/decisions', async (req: Request, res: Response) => {
  const repo = getRepository();
  const decisions = await repo.getDecisions();
  res.json(decisions);
});

apiRouter.post('/decisions', async (req: Request, res: Response) => {
  const { submission_id, final_decision, decision_letter, decided_by } = req.body;
  const repo = getRepository();
  const sub = await repo.getSubmissionById(submission_id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  // Gather completed peer reviews to compile consolidated author feedback (confidentiality-preserved)
  const allReviews = await repo.getReviews();
  const paperReviews = allReviews.filter(r => r.submission_id === sub.id);

  // Consolidated reviewer comments: Strip reviewer names/affiliations and chair-only confidential notes
  const consolidatedFeedback = paperReviews.map((rev, idx) => {
    return `Reviewer ${idx + 1}:
- Overall Score: ${rev.overall_score}/10
- Recommendation: ${rev.recommendation || 'Evaluated'}
- Author Comments: ${rev.comments_to_author || 'No specific comments provided.'}`;
  }).join('\n\n');

  const isRevisionOrAccept = final_decision === 'ACCEPT' || final_decision === 'MINOR_REVISION' || final_decision === 'MAJOR_REVISION';
  const fullLetter = decision_letter || `Dear Author,\n\nWe are writing to communicate the formal review decision regarding your submission #${sub.paper_number} entitled "${sub.title}".\n\nFormal Decision: ${final_decision}\n\nConsolidated Reviewer Feedback:\n${consolidatedFeedback || 'No reviewer feedback recorded.'}\n\n${isRevisionOrAccept ? 'Action Required: Please prepare and upload your camera-ready manuscript conforming to the IEEE/ACM double-column format (strictly <= 8 pages) before the camera-ready deadline.' : ''}\n\nSincerely,\n${decided_by || 'Program Chairs'}`;

  const decision = {
    id: `dec-${Date.now().toString().slice(-5)}`,
    submission_id: sub.id,
    ai_recommendation: final_decision,
    ai_reasoning: 'Confirmed by Conference Chair after reviewing peer scores.',
    divergence_flag: false,
    final_decision,
    decided_by: decided_by || 'Dr. Radhika Sharma (General Chair)',
    decision_letter: fullLetter,
    decided_at: new Date().toISOString(),
    notification_sent: true
  };

  const created = await repo.createDecision(decision);

  // Update submission status
  if (final_decision === 'ACCEPT') {
    await repo.updateSubmission(sub.id, { status: 'ACCEPTED' });
  } else if (final_decision === 'REJECT') {
    await repo.updateSubmission(sub.id, { status: 'REJECTED' });
  } else {
    await repo.updateSubmission(sub.id, { status: 'REVISION_REQUIRED' });
  }

  // Dispatch author decision email
  const primaryAuthor = sub.authors?.[0];
  const recipientEmail = primaryAuthor?.email || 'author@university.edu';
  await emailService.sendEmail({
    recipientEmail,
    recipientName: primaryAuthor?.name || 'Primary Author',
    subject: `[Conference Decision] Submission #${sub.paper_number}: ${final_decision}`,
    body: fullLetter,
    category: 'DECISION'
  });

  // Log final decision communication in audit ledger
  automationService.logAudit({
    action_type: 'FINAL_DECISION_COMMUNICATION',
    target_id: sub.id,
    target_title: `Paper #${sub.paper_number}: ${sub.title}`,
    status: 'SUCCESS',
    message: `Final conference decision (${final_decision}) communicated to author ${primaryAuthor?.name || 'Author'} (${recipientEmail}) by ${decided_by || 'Program Chair'}.`,
    details: { decision: final_decision, author: recipientEmail }
  });

  // Automatically update certificates & outputs
  try {
    await automationService.automateCertificates();
    await automationService.automateOutputs();
  } catch (e: any) {
    console.warn('[Automation hook error on decision finalization]:', e.message);
  }

  res.status(201).json({ success: true, decision: created });
});

// Confidential author-safe decision and reviewer feedback lookup
apiRouter.get('/submissions/:id/author-decision', async (req: Request, res: Response) => {
  const repo = getRepository();
  const sub = await repo.getSubmissionById(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const decisions = await repo.getDecisions();
  const decision = decisions.find(d => d.submission_id === sub.id) || null;

  const allReviews = await repo.getReviews();
  const paperReviews = allReviews.filter(r => r.submission_id === sub.id);

  // Confidentiality: Anonymize reviewer identities and exclude chair-only confidential comments
  const sanitizedReviews = paperReviews.map((r, index) => ({
    reviewer_label: `Reviewer ${index + 1}`,
    score: r.overall_score,
    recommendation: r.recommendation,
    comments_to_author: r.comments_to_author || '',
    strengths: r.strengths || '',
    weaknesses: r.weaknesses || '',
    submitted_at: r.submitted_at
  }));

  const cameraReadyList = await repo.getCameraReadySubmissions(sub.id);
  const isDecisionAcceptedOrRevise = decision?.final_decision === 'ACCEPT' || decision?.final_decision === 'MINOR_REVISION' || decision?.final_decision === 'MAJOR_REVISION';

  res.json({
    submission_id: sub.id,
    paper_number: sub.paper_number,
    title: sub.title,
    status: sub.status,
    decision,
    reviews: sanitizedReviews,
    camera_ready_submitted: cameraReadyList.length > 0,
    camera_ready_details: cameraReadyList[0] || null,
    can_submit_camera_ready: (sub.status === 'ACCEPTED' || sub.status === 'REVISION_REQUIRED' || isDecisionAcceptedOrRevise)
  });
});

// Submit camera-ready manuscript
apiRouter.post('/submissions/:id/camera-ready', async (req: Request, res: Response) => {
  const { file_url, page_count, confirmed_metadata } = req.body;
  const repo = getRepository();
  const sub = await repo.getSubmissionById(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const decisions = await repo.getDecisions();
  const decision = decisions.find(d => d.submission_id === sub.id);
  const isEligible = sub.status === 'ACCEPTED' || sub.status === 'REVISION_REQUIRED' || sub.status === 'CAMERA_READY' || decision?.final_decision === 'ACCEPT' || decision?.final_decision === 'MINOR_REVISION' || decision?.final_decision === 'MAJOR_REVISION';

  if (!isEligible) {
    return res.status(400).json({ error: 'Camera-ready versions can only be submitted for papers that have been accepted or require revision.' });
  }

  // Format validation: must be PDF
  const normalizedUrl = (file_url || '').trim().toLowerCase();
  if (!normalizedUrl.endsWith('.pdf')) {
    return res.status(400).json({ error: 'Camera-ready submission must be a PDF document (.pdf format required).' });
  }

  // Page limit validation
  const pages = Number(page_count) || 8;
  const conf = await repo.getConferenceById();
  const maxAllowedPages = conf?.max_pages || 8;
  if (pages > maxAllowedPages) {
    return res.status(400).json({ error: `Camera-ready submission exceeds maximum allowed page count (${maxAllowedPages} pages). Uploaded manuscript has ${pages} pages.` });
  }

  // Metadata confirmation validation
  if (!confirmed_metadata) {
    return res.status(400).json({ error: 'Author must confirm that title, author names, affiliations, and copyright clearance are verified.' });
  }

  const cameraReady = await repo.createCameraReadySubmission({
    submission_id: sub.id,
    file_url: file_url || '/uploads/camera_ready.pdf',
    page_count: pages,
    confirmed_metadata: true,
    submitted_at: new Date().toISOString()
  });

  const updatedSub = await repo.updateSubmission(sub.id, {
    status: 'CAMERA_READY' as any,
    page_count: pages
  });

  // Dispatch confirmation email
  const primaryAuthor = sub.authors?.[0];
  const recipientEmail = primaryAuthor?.email || 'author@university.edu';
  await emailService.sendEmail({
    recipientEmail,
    recipientName: primaryAuthor?.name || 'Author',
    subject: `[Camera-Ready Received] Submission #${sub.paper_number}: ${sub.title}`,
    body: `Dear Author,\n\nYour camera-ready manuscript for paper #${sub.paper_number} ("${sub.title}") has been received and verified for conference proceedings publication.\n\nPages: ${pages}\nFile: ${file_url}\nConfirmed At: ${cameraReady.submitted_at}\n\nThank you,\nConference Organizing Committee`,
    category: 'SUBMISSION'
  });

  // Trigger automated output updates (proceedings compilation & scheduling check)
  try {
    await automationService.automateOutputs();
  } catch (e: any) {
    console.warn('[Automation hook error on camera ready]:', e.message);
  }

  res.status(201).json({
    success: true,
    message: 'Camera-ready submission successfully received and validated.',
    camera_ready: cameraReady,
    submission: updatedSub
  });
});

// Get camera-ready submissions (for chairs/admins)
apiRouter.get('/camera-ready-submissions', async (req: Request, res: Response) => {
  const repo = getRepository();
  const crSubmissions = await repo.getCameraReadySubmissions();
  const submissions = await repo.getSubmissions();

  const enriched = crSubmissions.map(crs => {
    const paper = submissions.find(s => s.id === crs.submission_id);
    return {
      ...crs,
      paper_number: paper?.paper_number,
      title: paper?.title || 'Unknown Title',
      track_name: paper?.track_name,
      primary_author: paper?.authors?.[0]?.name || 'Author',
      author_email: paper?.authors?.[0]?.email || 'author@univ.edu',
      status: paper?.status || 'CAMERA_READY'
    };
  });

  res.json(enriched);
});

// ============================================================
// 6. REGISTRATIONS & PAYMENTS (SANDBOX)
// ============================================================
apiRouter.get('/registration-fees', async (req: Request, res: Response) => {
  const feeRules = [
    { category: 'STUDENT', label: 'Student (Undergraduate/Postgraduate)', early_bird_amount: 2500, regular_amount: 3500, currency: 'INR' },
    { category: 'RESEARCH_SCHOLAR', label: 'Research Scholar / PhD Candidate', early_bird_amount: 3500, regular_amount: 4500, currency: 'INR' },
    { category: 'FACULTY', label: 'Faculty / Academician', early_bird_amount: 4500, regular_amount: 6000, currency: 'INR' },
    { category: 'INDUSTRY', label: 'Industry Delegate / Corporate', early_bird_amount: 7000, regular_amount: 9000, currency: 'INR' },
    { category: 'AUTHOR', label: 'Conference Author (Presenter)', early_bird_amount: 5000, regular_amount: 6500, currency: 'INR' },
    { category: 'LISTENER', label: 'Listener / Attendee (Non-presenting)', early_bird_amount: 1500, regular_amount: 2500, currency: 'INR' }
  ];
  res.json({ is_early_bird_active: true, fee_rules: feeRules });
});

apiRouter.get('/registrations', async (req: Request, res: Response) => {
  const repo = getRepository();
  const registrations = await repo.getRegistrations();
  res.json(registrations);
});

apiRouter.post('/registrations', async (req: Request, res: Response) => {
  const { user_name, user_email, category, fee_amount, submission_id, paper_title, is_early_bird } = req.body;
  const repo = getRepository();
  const conf = await repo.getConferenceById();

  const reg = {
    id: `reg-${Date.now().toString().slice(-5)}`,
    conference_id: conf ? conf.id : 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    user_id: `u-${Date.now().toString().slice(-4)}`,
    user_name: user_name || 'Academic Delegate',
    user_email: user_email || 'delegate@university.edu',
    submission_id,
    paper_title,
    category: category || 'PARTICIPANT',
    is_early_bird: Boolean(is_early_bird),
    fee_amount: Number(fee_amount) || 4000,
    currency: 'INR',
    status: 'PENDING' as const,
    payment_status: 'PENDING' as const,
    created_at: new Date().toISOString()
  };

  const created = await repo.createRegistration(reg);
  res.status(201).json({ success: true, registration: created });
});

apiRouter.get('/payments', async (req: Request, res: Response) => {
  const repo = getRepository();
  const payments = await repo.getPayments();
  const registrations = await repo.getRegistrations();

  const enriched = payments.map(p => {
    const reg = registrations.find(r => r.id === p.registration_id);
    return {
      ...p,
      registration: reg || null,
      delegate_name: reg?.user_name || (p.status === 'UNMATCHED' ? 'Direct Bank Wire (Unmatched)' : 'Academic Delegate'),
      delegate_email: reg?.user_email || (p.status === 'UNMATCHED' ? 'remittance@bank.ac.in' : 'delegate@university.edu'),
      paper_title: reg?.paper_title,
      category: reg?.category
    };
  });

  res.json(enriched);
});

apiRouter.post('/payments/create', async (req: Request, res: Response) => {
  const { registration_id, amount, currency } = req.body;
  try {
    const order = await paymentService.createOrder(registration_id, Number(amount), currency || 'INR');
    const repo = getRepository();
    const created = await repo.createPayment({
      registration_id,
      order_id: order.order_id,
      amount: Number(amount) || 4000,
      currency: currency || 'INR',
      status: 'PENDING'
    });
    res.json({ ...order, payment: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/payments/wire-remittance', async (req: Request, res: Response) => {
  const { amount, currency, order_id } = req.body;
  const repo = getRepository();
  const paymentRecord = await repo.createPayment({
    registration_id: 'unmatched',
    order_id: order_id || `WIRE-REMIT-${Date.now().toString().slice(-6)}`,
    amount: Number(amount) || 5000,
    currency: currency || 'INR',
    status: 'UNMATCHED',
    receipt_url: `/receipts/WIRE-${Date.now().toString().slice(-4)}.pdf`
  });
  res.status(201).json({ success: true, payment: paymentRecord });
});

apiRouter.post('/payments/sandbox-pay', async (req: Request, res: Response) => {
  const { registration_id, order_id, card_number, cardholder_name, amount } = req.body;
  try {
    const result = await paymentService.processSandboxPayment(order_id, card_number, cardholder_name);
    const repo = getRepository();

    const allPayments = await repo.getPayments();
    const existing = allPayments.find(p => p.order_id === order_id);

    let paymentRecord;
    if (existing) {
      paymentRecord = await repo.updatePayment(existing.id, {
        payment_id: result.payment_id,
        status: 'SUCCESS',
        receipt_url: `/receipts/${result.receipt_id}.pdf`,
        verified_at: new Date().toISOString()
      });
    } else {
      paymentRecord = await repo.createPayment({
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
      });
    }

    // Update registration
    if (registration_id) {
      await repo.updateRegistration(registration_id, {
        status: 'CONFIRMED',
        payment_status: 'SUCCESS'
      });

      // Automatically issue participant certificate upon payment confirmation
      try {
        await automationService.automateCertificates();
      } catch (e: any) {
        console.warn('[Automation hook error on payment]:', e.message);
      }
    }

    res.json({ ...result, payment: paymentRecord });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/payments/:id/reconcile', async (req: Request, res: Response) => {
  const { registration_id, notes } = req.body;
  const userRole = (req.headers['x-user-role'] as string) || 'CHAIR';
  if (userRole && !['ADMIN', 'CHAIR', 'ORGANIZER'].includes(userRole.toUpperCase())) {
    return res.status(403).json({ error: 'Forbidden: Only chairs and administrators are authorized to reconcile payments.' });
  }

  const repo = getRepository();
  const payments = await repo.getPayments();
  const payment = payments.find(p => p.id === req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment record not found' });

  const targetRegId = registration_id || payment.registration_id;

  const updatedPayment = await repo.updatePayment(payment.id, {
    status: 'SUCCESS',
    registration_id: targetRegId,
    reconciled_by: 'Finance Committee Chair',
    verified_at: new Date().toISOString(),
    receipt_url: payment.receipt_url || `/receipts/RCPT-RECON-${Date.now().toString().slice(-4)}.pdf`
  });

  let updatedReg = null;
  if (targetRegId && targetRegId !== 'unmatched') {
    try {
      updatedReg = await repo.updateRegistration(targetRegId, {
        status: 'CONFIRMED',
        payment_status: 'SUCCESS'
      });

      // Automatically issue participant certificate upon reconciliation
      try {
        await automationService.automateCertificates();
      } catch (e: any) {
        console.warn('[Automation hook error on payment reconciliation]:', e.message);
      }
    } catch (e: any) {
      console.warn('Could not update matched registration:', e.message);
    }
  }

  res.json({
    success: true,
    message: 'Payment successfully reconciled and confirmed.',
    payment: updatedPayment,
    registration: updatedReg
  });
});

// ============================================================
// 7. PROGRAMME SCHEDULER
// ============================================================
apiRouter.get('/schedule', async (req: Request, res: Response) => {
  const repo = getRepository();
  const sessions = await repo.getSessions();
  const enriched = sessions.map(s => ({
    ...s,
    status: schedulerService.computeSessionStatus(s)
  }));
  res.json(enriched);
});

apiRouter.post('/schedule/generate', async (req: Request, res: Response) => {
  const repo = getRepository();
  const conf = await repo.getConferenceById();
  const sessions = await schedulerService.generateProgramme({
    conferenceId: conf?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  });
  const enriched = sessions.map(s => ({
    ...s,
    status: schedulerService.computeSessionStatus(s)
  }));
  res.json({ success: true, count: enriched.length, sessions: enriched });
});

// ============================================================
// 8. CERTIFICATES & PROCEEDINGS
// ============================================================
apiRouter.get('/certificates', async (req: Request, res: Response) => {
  const repo = getRepository();
  const certificates = await repo.getCertificates();
  res.json(certificates);
});

apiRouter.post('/certificates/generate', async (req: Request, res: Response) => {
  const { recipient_name, recipient_email, role, paper_title } = req.body;
  const cert = await certificateService.generateCertificate({
    recipientName: recipient_name,
    recipientEmail: recipient_email,
    role,
    paperTitle: paper_title
  });
  res.status(201).json({ success: true, certificate: cert });
});

apiRouter.post('/certificates/batch-generate', async (req: Request, res: Response) => {
  const repo = getRepository();
  const existingCerts = await repo.getCertificates();
  const existingKeys = new Set(
    existingCerts.map(c => `${c.recipient_email.toLowerCase()}_${c.role}_${(c.paper_title || '').toLowerCase()}`)
  );

  const issued = [];

  // 1. Authors & Presenters of accepted papers
  const papers = await repo.getSubmissions();
  const eligiblePapers = papers.filter(p => p.status === 'ACCEPTED' || p.status === 'CAMERA_READY');
  for (const paper of eligiblePapers) {
    for (const author of paper.authors || []) {
      const authorKey = `${author.email.toLowerCase()}_AUTHOR_${paper.title.toLowerCase()}`;
      if (!existingKeys.has(authorKey)) {
        const cert = await certificateService.generateCertificate({
          recipientName: author.name,
          recipientEmail: author.email,
          role: 'AUTHOR',
          paperTitle: paper.title
        });
        existingKeys.add(authorKey);
        issued.push(cert);
      }
    }

    // Primary author as Presenter
    const presenter = paper.authors?.[0];
    if (presenter) {
      const presKey = `${presenter.email.toLowerCase()}_PRESENTER_${paper.title.toLowerCase()}`;
      if (!existingKeys.has(presKey)) {
        const cert = await certificateService.generateCertificate({
          recipientName: presenter.name,
          recipientEmail: presenter.email,
          role: 'PRESENTER',
          paperTitle: paper.title
        });
        existingKeys.add(presKey);
        issued.push(cert);
      }
    }
  }

  // 2. Active Reviewers
  const reviews = await repo.getReviews();
  const reviewerEmails = new Set(reviews.map(r => r.reviewer_name));
  for (const reviewerName of reviewerEmails) {
    const revEmail = `${reviewerName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@university.edu`;
    const revKey = `${revEmail}_REVIEWER_`;
    if (!existingKeys.has(revKey)) {
      const cert = await certificateService.generateCertificate({
        recipientName: reviewerName,
        recipientEmail: revEmail,
        role: 'REVIEWER'
      });
      existingKeys.add(revKey);
      issued.push(cert);
    }
  }

  // 3. Session Chairs
  const sessions = await repo.getSessions();
  for (const sess of sessions) {
    if (sess.session_chair?.name) {
      const chairName = sess.session_chair.name;
      const chairEmail = `${chairName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@university.edu`;
      const chairKey = `${chairEmail}_SESSION_CHAIR_${sess.title.toLowerCase()}`;
      if (!existingKeys.has(chairKey)) {
        const cert = await certificateService.generateCertificate({
          recipientName: chairName,
          recipientEmail: chairEmail,
          role: 'SESSION_CHAIR',
          paperTitle: `Session: ${sess.title}`
        });
        existingKeys.add(chairKey);
        issued.push(cert);
      }
    }
  }

  // 4. Confirmed Registered Participants
  const registrations = await repo.getRegistrations();
  const confirmedRegs = registrations.filter(r => r.status === 'CONFIRMED');
  for (const reg of confirmedRegs) {
    const regKey = `${reg.user_email.toLowerCase()}_PARTICIPANT_`;
    if (!existingKeys.has(regKey)) {
      const cert = await certificateService.generateCertificate({
        recipientName: reg.user_name,
        recipientEmail: reg.user_email,
        role: 'PARTICIPANT',
        paperTitle: reg.paper_title
      });
      existingKeys.add(regKey);
      issued.push(cert);
    }
  }

  res.status(201).json({
    success: true,
    count: issued.length,
    message: `Successfully issued ${issued.length} certificates across authors, presenters, reviewers, session chairs, and participants.`,
    certificates: issued
  });
});

apiRouter.get('/certificates/:id/verify', async (req: Request, res: Response) => {
  const certNumber = req.params.id;
  const result = await certificateService.verifyCertificate(certNumber);
  res.json(result);
});

apiRouter.get('/certificates/:id/pdf', async (req: Request, res: Response) => {
  const repo = getRepository();
  const cert = await repo.getCertificateByNumber(req.params.id);
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

apiRouter.get('/proceedings', async (req: Request, res: Response) => {
  const repo = getRepository();
  const proceedings = await repo.getProceedings();
  res.json(proceedings || null);
});

apiRouter.post('/proceedings/generate', async (req: Request, res: Response) => {
  const { isbn } = req.body;
  const repo = getRepository();
  const conf = await repo.getConferenceById();
  const proceedings = await proceedingsService.compileProceedings(conf?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', isbn);
  res.json({ success: true, proceedings });
});

// ============================================================
// 9. EVENT ARCHIVE & ACADEMIC PRESERVATION
// ============================================================
apiRouter.get('/archive', async (req: Request, res: Response) => {
  const repo = getRepository();
  const archives = await repo.getEventArchives();
  res.json(archives);
});

apiRouter.post('/archive/create', async (req: Request, res: Response) => {
  const userRole = (req.headers['x-user-role'] as string) || 'CHAIR';
  if (userRole && !['ADMIN', 'CHAIR', 'ORGANIZER'].includes(userRole.toUpperCase())) {
    return res.status(403).json({ error: 'Forbidden: Only conference chairs and organizers can create immutable event archives.' });
  }

  const repo = getRepository();
  const conf = await repo.getConferenceById();
  const tracks = await repo.getTracks();
  const submissions = await repo.getSubmissions();
  const reviews = await repo.getReviews();
  const decisions = await repo.getDecisions();
  const sessions = await repo.getSessions();
  const registrations = await repo.getRegistrations();
  const payments = await repo.getPayments();
  const certificates = await repo.getCertificates();
  const proceedings = await repo.getProceedings();

  const snapshotData = {
    conference: conf,
    tracks,
    submissions,
    reviews,
    decisions,
    sessions,
    registrations,
    payments,
    certificates,
    proceedings
  };

  const snapshotString = JSON.stringify(snapshotData);
  const checksum = crypto.createHash('sha256').update(snapshotString).digest('hex');

  const archiveRecord = {
    id: `arch-${Date.now().toString().slice(-6)}`,
    conference_id: conf?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    archive_title: `Full Event Archive: ${conf?.name || 'AGENTIC-AI-2026'}`,
    academic_year: '2026-2027',
    archived_at: new Date().toISOString(),
    archived_by: req.body.archived_by || 'Dr. Radhika Sharma (General Chair)',
    checksum,
    summary: {
      total_papers: submissions.length,
      total_reviews: reviews.length,
      total_decisions: decisions.length,
      total_sessions: sessions.length,
      total_registrations: registrations.length,
      total_certificates: certificates.length,
      isbn: proceedings?.isbn || 'ISBN pending'
    },
    event_data: snapshotData
  };

  const saved = await repo.saveEventArchive(archiveRecord);
  res.status(201).json({ success: true, archive: saved });
});

apiRouter.get('/archive/:id/download', async (req: Request, res: Response) => {
  const repo = getRepository();
  const archive = await repo.getEventArchiveById(req.params.id);
  if (!archive) return res.status(404).json({ error: 'Archive record not found' });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="conference_archive_${archive.id}.json"`);
  res.send(JSON.stringify(archive, null, 2));
});

// ============================================================
// 10. ATTENDEE & DELEGATE FEEDBACK ANALYSIS
// ============================================================
apiRouter.post('/feedback', async (req: Request, res: Response) => {
  const {
    user_name, user_email, role, overall_rating,
    session_quality_rating, organization_rating, venue_platform_rating,
    highlights, suggestions
  } = req.body;

  if (!overall_rating || Number(overall_rating) < 1 || Number(overall_rating) > 5) {
    return res.status(400).json({ error: 'Overall rating between 1 and 5 is required.' });
  }

  const repo = getRepository();
  const conf = await repo.getConferenceById();

  const feedback = await repo.createFeedback({
    conference_id: conf?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    user_name: user_name || 'Academic Delegate',
    user_email: user_email || 'delegate@university.edu',
    role: role || 'PARTICIPANT',
    overall_rating: Number(overall_rating),
    session_quality_rating: Number(session_quality_rating) || Number(overall_rating),
    organization_rating: Number(organization_rating) || Number(overall_rating),
    venue_platform_rating: Number(venue_platform_rating) || Number(overall_rating),
    highlights,
    suggestions
  });

  res.status(201).json({ success: true, feedback });
});

apiRouter.get('/feedback', async (req: Request, res: Response) => {
  const repo = getRepository();
  const feedbacks = await repo.getFeedbacks();
  res.json(feedbacks);
});

apiRouter.get('/feedback/summary', async (req: Request, res: Response) => {
  const repo = getRepository();
  const summary = await repo.getFeedbackSummary();
  res.json(summary);
});

// ============================================================
// 11. ANALYTICS & INTEGRATION STATUS
// ============================================================
apiRouter.get('/analytics/conference/:id', async (req: Request, res: Response) => {
  const repo = getRepository();
  const analytics = await repo.getAnalytics(req.params.id);
  try {
    const fbSummary = await repo.getFeedbackSummary(req.params.id);
    if (fbSummary && fbSummary.total_responses > 0) {
      analytics.feedback_avg_rating = fbSummary.average_overall;
    }
  } catch (e) {}
  res.json(analytics);
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

// ============================================================
// 12. AUTONOMOUS AGENT ORCHESTRATION & AUDIT OUTPUTS
// ============================================================
apiRouter.post('/agent/run-automation', async (req: Request, res: Response) => {
  const result = await automationService.runAutomationCycle();
  res.json({ success: true, ...result });
});

apiRouter.get('/agent/status', (req: Request, res: Response) => {
  res.json(automationService.getStatus());
});

apiRouter.get('/audit-logs', async (req: Request, res: Response) => {
  const userRole = (req.headers['x-user-role'] as string) || (req.query.role as string) || 'CHAIR';
  if (userRole && !['ADMIN', 'CHAIR', 'ORGANIZER'].includes(userRole.toUpperCase())) {
    return res.status(403).json({ error: 'Forbidden: Only authorized conference chairs and administrators may view system audit logs.' });
  }
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const logs = automationService.getAuditLogs(limit);
  res.json(logs);
});

apiRouter.get('/reviewer-assignments/sheet', async (req: Request, res: Response) => {
  const sheet = await automationService.getReviewerAssignmentSheet(req.query.conference_id as string | undefined);
  res.json({
    conference_id: req.query.conference_id || 'default',
    generated_at: new Date().toISOString(),
    total_assignments: sheet.length,
    sheet
  });
});

apiRouter.get('/reports/post-event', async (req: Request, res: Response) => {
  const report = await automationService.generatePostEventReport(req.query.conference_id as string | undefined);
  res.json(report);
});

apiRouter.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled API error:', err);
  res.status(err?.statusCode || 500).json({
    error: err?.message || 'Internal Server Error'
  });
});
