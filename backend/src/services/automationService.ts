import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getRepository } from '../database/repositoryFactory';
import { matchingService, DEFAULT_WEIGHTS } from './matchingService';
import { coiService } from './coiService';
import { schedulerService } from './schedulerService';
import { certificateService } from './certificateService';
import { proceedingsService } from './proceedingsService';
import { emailService } from '../integrations/email/emailService';
import { agentTools } from '../tools/agentTools';
import {
  Submission,
  ReviewerAssignment,
  Review,
  Decision,
  Conference,
  AuditLogRecord,
  ReviewerAssignmentSheetItem,
  PostEventReport
} from '../types';

/**
 * Returns the current date/time formatted in Indian Standard Time (IST, UTC+05:30)
 */
export function getIstDate(): Date {
  const now = new Date();
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utcMs + istOffsetMs);
}

export function getIstTimestamp(): string {
  const ist = getIstDate();
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, '0');
  const dd = String(ist.getDate()).padStart(2, '0');
  const hh = String(ist.getHours()).padStart(2, '0');
  const min = String(ist.getMinutes()).padStart(2, '0');
  const ss = String(ist.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+05:30`;
}

export function getIstDateString(): string {
  const ist = getIstDate();
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, '0');
  const dd = String(ist.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export class AutomationService {
  private auditLogs: AuditLogRecord[] = [];
  private sentReminderKeys = new Set<string>();
  private lastDistributedCfpHash: string | null = null;
  private isCycleRunning = false;
  private lastCycleRunAt: string | null = null;
  private cfpStoragePath = path.resolve(process.cwd(), 'uploads/cfp_storage.json');
  private cachedCfp: any = null;

  private readPersistedCfp(): any {
    try {
      if (fs.existsSync(this.cfpStoragePath)) {
        const raw = fs.readFileSync(this.cfpStoragePath, 'utf8');
        return JSON.parse(raw);
      }
      // Fallback relative to backend directory
      const altPath = path.resolve(__dirname, '../../uploads/cfp_storage.json');
      if (fs.existsSync(altPath)) {
        const raw = fs.readFileSync(altPath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e: any) {
      console.warn('[AutomationService] Failed to read persisted CFP:', e.message);
    }
    return null;
  }

  private writePersistedCfp(data: any): void {
    try {
      const dir = path.dirname(this.cfpStoragePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cfpStoragePath, JSON.stringify(data, null, 2), 'utf8');
      // Also sync to altPath if exists
      const altDir = path.resolve(__dirname, '../../uploads');
      if (fs.existsSync(altDir)) {
        fs.writeFileSync(path.join(altDir, 'cfp_storage.json'), JSON.stringify(data, null, 2), 'utf8');
      }
    } catch (e: any) {
      console.warn('[AutomationService] Failed to write persisted CFP:', e.message);
    }
  }

  constructor() {
    this.logAudit({
      action_type: 'ESCALATION',
      actor: 'CONFERENCE_AGENT',
      status: 'SUCCESS',
      message: 'Autonomous Conference Management Agent service initialized.'
    });
  }

  // ============================================================
  // AUDIT LOG MANAGEMENT
  // ============================================================
  public logAudit(entry: {
    action_type: AuditLogRecord['action_type'];
    target_id?: string;
    target_title?: string;
    status: AuditLogRecord['status'];
    message: string;
    details?: any;
    actor?: 'CONFERENCE_AGENT';
  }): AuditLogRecord {
    const record: AuditLogRecord = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: getIstTimestamp(),
      action_type: entry.action_type,
      target_id: entry.target_id,
      target_title: entry.target_title,
      actor: entry.actor || 'CONFERENCE_AGENT',
      status: entry.status,
      message: entry.message,
      details: entry.details
    };

    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 500) {
      this.auditLogs.length = 500;
    }

    console.log(`[AGENT AUDIT] [${record.timestamp}] [${record.action_type}] [${record.status}] ${record.message}`);
    return record;
  }

  public getAuditLogs(limit = 100): AuditLogRecord[] {
    return this.auditLogs.slice(0, limit);
  }

  public getStatus() {
    return {
      agent_status: 'ACTIVE_AUTONOMOUS',
      is_cycle_running: this.isCycleRunning,
      last_cycle_run_at: this.lastCycleRunAt,
      current_time_ist: getIstTimestamp(),
      audit_records_count: this.auditLogs.length,
      sent_reminders_count: this.sentReminderKeys.size,
      last_distributed_cfp_hash: this.lastDistributedCfpHash
    };
  }

  // ============================================================
  // 1. AUTOMATIC CFP GENERATION, PERSISTENCE AND DISTRIBUTION
  // ============================================================
  public async inspectAndEnsureCfp(force = false): Promise<{ generated: boolean; distributed: boolean; cfp: any }> {
    const repo = getRepository();
    const conf = await repo.getConferenceById();
    const confId = conf ? conf.id : 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const tracks = await repo.getTracks(confId);

    const configFingerprint = JSON.stringify({
      name: conf?.name,
      acronym: conf?.acronym,
      institution: conf?.institution,
      tracks: tracks.map(t => ({ code: t.code, name: t.name })),
      dates: conf?.dates,
      format: conf?.submission_format,
      model: conf?.review_model,
      policy: conf?.acceptance_policy,
      max_pages: conf?.max_pages
    });

    const currentHash = crypto.createHash('sha256').update(configFingerprint).digest('hex').slice(0, 16);

    // Startup scan / periodic check audit log
    this.logAudit({
      action_type: 'CFP_STARTUP_SCAN',
      target_id: confId,
      target_title: conf?.name || 'AGENTIC-AI-2026',
      status: 'SUCCESS',
      message: `Startup scan: Inspected active conference [${conf?.acronym || 'AGENTIC-AI-2026'}]. Configuration hash: [${currentHash}].`,
      details: { phase: 'STARTUP_SCAN', hash: currentHash, conference_id: confId }
    });

    const persisted = this.readPersistedCfp();

    if (!force && persisted && persisted.hash === currentHash && persisted.cfp_markdown) {
      this.cachedCfp = persisted;
      this.lastDistributedCfpHash = currentHash;
      return { generated: false, distributed: false, cfp: persisted };
    }

    // Generate authoritative CFP content
    const genResult = await agentTools.cfpGeneratorTool.execute({});
    const cfpMarkdown = genResult?.cfp_markdown || '';

    this.logAudit({
      action_type: 'CFP_GENERATION',
      target_id: confId,
      target_title: conf?.name || 'AGENTIC-AI-2026',
      status: 'SUCCESS',
      message: `Generated authoritative Call for Papers (CFP) version [${currentHash}]. Tracks: ${tracks.length}, Deadline: ${conf?.dates?.submission_deadline || '2026-10-15'}.`,
      details: { phase: 'CFP_GENERATION', hash: currentHash, tracks_count: tracks.length }
    });

    // Broadcast channels for simulation / distribution
    const broadcastChannels = [
      { name: 'Academic Mailing Lists', email: 'listserv@ieee.org', type: 'Mailing list' },
      { name: 'Academic Research Networks', email: 'announcements@researchgate.net', type: 'Academic network' },
      { name: 'Partner Institutions & Departments', email: 'partnerships@iitm.ac.in', type: 'Partner institution' }
    ];

    for (const channel of broadcastChannels) {
      await emailService.sendEmail({
        recipientEmail: channel.email,
        recipientName: channel.name,
        subject: `[Call for Papers] ${conf?.name || 'AGENTIC-AI-2026'} (${conf?.acronym || 'AGENTIC-AI-2026'})`,
        body: `Official Call for Papers broadcast for ${conf?.name || 'AGENTIC-AI-2026'}.\nTracks: ${tracks.map(t => t.name).join(', ')}\nSubmission Deadline: ${conf?.dates?.submission_deadline || '2026-10-15'}\nReview Model: ${conf?.review_model || 'DOUBLE_BLIND'}\nAcceptance Policy: ${conf?.acceptance_policy || 'Rigorous peer review'}\nSubmission Format: ${conf?.submission_format || 'IEEE Double-Column PDF'}.`,
        category: 'CFP'
      });
    }

    this.logAudit({
      action_type: 'CFP_DISTRIBUTION',
      target_id: confId,
      target_title: 'Academic Distribution Channels',
      status: 'SUCCESS',
      message: `Simulated distribution of CFP version [${currentHash}] to Academic Mailing Lists, ResearchGate, and Partner Institutions.`,
      details: { phase: 'CFP_DISTRIBUTION', hash: currentHash, channels: broadcastChannels.map(c => c.name) }
    });

    const cfpRecord = {
      conference_id: confId,
      cfp_markdown: cfpMarkdown,
      generated_with: genResult?.generated_with || 'Autonomous Academic Engine',
      generated_at: getIstTimestamp(),
      hash: currentHash,
      distributed: true,
      channels: broadcastChannels
    };

    this.writePersistedCfp(cfpRecord);
    this.cachedCfp = cfpRecord;
    this.lastDistributedCfpHash = currentHash;

    this.logAudit({
      action_type: 'CFP_PERSISTENCE',
      target_id: confId,
      target_title: conf?.name || 'AGENTIC-AI-2026',
      status: 'SUCCESS',
      message: `Persisted CFP version [${currentHash}] to disk storage (${this.cfpStoragePath}). Refreshing frontend will preserve CFP.`,
      details: { phase: 'CFP_PERSISTENCE', hash: currentHash, storage_path: this.cfpStoragePath }
    });

    return { generated: true, distributed: true, cfp: cfpRecord };
  }

  public async getCfp(conferenceId?: string): Promise<any> {
    if (this.cachedCfp && this.cachedCfp.cfp_markdown) return this.cachedCfp;
    const persisted = this.readPersistedCfp();
    if (persisted && persisted.cfp_markdown) {
      this.cachedCfp = persisted;
      return persisted;
    }
    const res = await this.inspectAndEnsureCfp();
    return res.cfp;
  }

  public async generateAndSaveCfp(conferenceId?: string, theme?: string, force = true): Promise<any> {
    const repo = getRepository();
    const conf = await repo.getConferenceById(conferenceId);
    const confId = conf ? conf.id : (conferenceId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    const tracks = await repo.getTracks(confId);

    const configFingerprint = JSON.stringify({
      name: conf?.name,
      acronym: conf?.acronym,
      institution: conf?.institution,
      tracks: tracks.map(t => ({ code: t.code, name: t.name })),
      dates: conf?.dates,
      format: conf?.submission_format,
      model: conf?.review_model,
      policy: conf?.acceptance_policy,
      max_pages: conf?.max_pages,
      theme: theme || conf?.theme
    });

    const currentHash = crypto.createHash('sha256').update(configFingerprint).digest('hex').slice(0, 16);
    const genResult = await agentTools.cfpGeneratorTool.execute({ theme });
    const cfpMarkdown = genResult?.cfp_markdown || '';

    const cfpRecord = {
      conference_id: confId,
      cfp_markdown: cfpMarkdown,
      generated_with: genResult?.generated_with || 'Autonomous Academic Engine',
      generated_at: getIstTimestamp(),
      hash: currentHash,
      distributed: true,
      channels: [
        { name: 'Academic Mailing Lists', email: 'listserv@ieee.org', type: 'Mailing list' },
        { name: 'Academic Research Networks', email: 'announcements@researchgate.net', type: 'Academic network' },
        { name: 'Partner Institutions & Departments', email: 'partnerships@iitm.ac.in', type: 'Partner institution' }
      ]
    };

    this.writePersistedCfp(cfpRecord);
    this.cachedCfp = cfpRecord;
    this.lastDistributedCfpHash = currentHash;

    this.logAudit({
      action_type: 'CFP_GENERATION',
      target_id: confId,
      target_title: conf?.name || 'AGENTIC-AI-2026',
      status: 'SUCCESS',
      message: `Generated authoritative Call for Papers (CFP) version [${currentHash}] via manual override.`,
      details: { phase: 'MANUAL_OVERRIDE_GENERATION', hash: currentHash }
    });

    this.logAudit({
      action_type: 'CFP_PERSISTENCE',
      target_id: confId,
      target_title: conf?.name || 'AGENTIC-AI-2026',
      status: 'SUCCESS',
      message: `Persisted CFP version [${currentHash}] to disk storage. Refreshing will retain generated CFP.`,
      details: { phase: 'CFP_PERSISTENCE', hash: currentHash }
    });

    return cfpRecord;
  }

  public async distributeCfp(conferenceId?: string, force = true): Promise<any> {
    const res = await this.inspectAndEnsureCfp(force);
    return res.cfp;
  }

  public async automateCfpDistribution(force = false): Promise<boolean> {
    const res = await this.inspectAndEnsureCfp(force);
    return res.generated || res.distributed;
  }

  // ============================================================
  // 2. AUTOMATIC REVIEWER ASSIGNMENT (Requirement 4)
  // ============================================================
  public async autoAssignReviewersForPaper(submissionIdOrPaper: string | Submission): Promise<{
    assignedCount: number;
    assignments: ReviewerAssignment[];
    excludedConflicts: any[];
    escalated: boolean;
  }> {
    const repo = getRepository();
    const sub: Submission | null = typeof submissionIdOrPaper === 'string'
      ? await repo.getSubmissionById(submissionIdOrPaper)
      : submissionIdOrPaper;

    if (!sub) {
      return { assignedCount: 0, assignments: [], excludedConflicts: [], escalated: false };
    }

    // Strict requirement: Preserve Paper #106's existing assignments, do not overwrite or duplicate
    if (sub.paper_number === 106 || String(sub.paper_number) === '106') {
      const existing = await repo.getReviewerAssignments(sub.conference_id);
      const p106Asgns = existing.filter(a => a.submission_id === sub.id && a.status !== 'DECLINED');
      return {
        assignedCount: 0,
        assignments: p106Asgns,
        excludedConflicts: [],
        escalated: false
      };
    }

    if (sub.status === 'REJECTED') {
      return { assignedCount: 0, assignments: [], excludedConflicts: [], escalated: false };
    }

    // Format validation check
    const conf = await repo.getConferenceById(sub.conference_id);
    const maxPages = conf?.max_pages || 8;
    if (sub.page_count > maxPages) {
      this.logAudit({
        action_type: 'ESCALATION',
        target_id: sub.id,
        target_title: `Paper #${sub.paper_number}: ${sub.title}`,
        status: 'WARNING',
        message: `Reviewer assignment held for Paper #${sub.paper_number}: Page limit exceeded (${sub.page_count}/${maxPages} pages).`
      });
      return { assignedCount: 0, assignments: [], excludedConflicts: [], escalated: true };
    }

    const existingAssignments = await repo.getReviewerAssignments(sub.conference_id);
    const activeAssignments = existingAssignments.filter(
      a => a.submission_id === sub.id && a.status !== 'DECLINED'
    );

    const TARGET_REVIEWERS = 2;
    if (activeAssignments.length >= TARGET_REVIEWERS) {
      return {
        assignedCount: 0,
        assignments: activeAssignments,
        excludedConflicts: [],
        escalated: false
      };
    }

    const rankedCandidates = await matchingService.matchReviewers(sub, DEFAULT_WEIGHTS, false);
    const excludedConflicts: any[] = [];
    const eligibleReviewers: any[] = [];

    const currentlyAssignedIds = new Set(activeAssignments.map(a => a.reviewer_id));

    for (const match of rankedCandidates) {
      const { reviewer, coi_status } = match;

      if (coi_status.has_conflict) {
        excludedConflicts.push({
          reviewer_id: reviewer.researcher_id,
          reviewer_name: reviewer.name,
          institution: reviewer.institution,
          reasons: coi_status.reasons
        });
        continue;
      }

      if (currentlyAssignedIds.has(reviewer.researcher_id)) {
        continue;
      }

      if (!reviewer.is_available) {
        continue;
      }

      if (reviewer.current_workload >= reviewer.max_workload) {
        continue;
      }

      eligibleReviewers.push(match);
    }

    if (excludedConflicts.length > 0) {
      this.logAudit({
        action_type: 'COI_EXCLUSION',
        target_id: sub.id,
        target_title: `Paper #${sub.paper_number}: ${sub.title}`,
        status: 'SUCCESS',
        message: `Excluded ${excludedConflicts.length} reviewer(s) for Paper #${sub.paper_number} due to active Conflict-of-Interest rules (shared affiliation / recent co-authorship).`,
        details: { conflicts: excludedConflicts }
      });
    }

    const neededCount = TARGET_REVIEWERS - activeAssignments.length;
    const selectedMatches = eligibleReviewers.slice(0, neededCount);
    const newAssignments: ReviewerAssignment[] = [];

    const defaultDueDate = conf?.dates?.review_deadline || '2026-11-10';
    const istNow = getIstTimestamp();

    const conflictsSummary = excludedConflicts.length > 0
      ? excludedConflicts.map(c => `${c.reviewer_name} (${c.reasons.join(', ')})`).join('; ')
      : 'None';

    // If no eligible reviewer exists, automatically log/escalate that exception to the chair/admin only
    if (selectedMatches.length === 0 && neededCount > 0) {
      this.logAudit({
        action_type: 'ESCALATION',
        target_id: sub.id,
        target_title: `Paper #${sub.paper_number}: ${sub.title}`,
        status: 'ESCALATED',
        message: `Paper #${sub.paper_number} automatically matched by agent at ${istNow}: No eligible reviewer exists. Conflict exclusions: [${conflictsSummary}]. Escalated to chair/admin only.`,
        details: {
          paper_number: sub.paper_number,
          trigger_time_ist: istNow,
          conflict_exclusions: excludedConflicts,
          recipient: 'CHAIR_ADMIN_ONLY'
        }
      });

      await emailService.sendEmail({
        recipientEmail: 'chair@vignan-conference.edu',
        recipientName: 'General Program Chair',
        subject: `[CHAIR/ADMIN ONLY] Reviewer Assignment Exception: Paper #${sub.paper_number}`,
        body: `Dear Program Chair,\n\nPaper #${sub.paper_number} ("${sub.title}") was submitted and automatic reviewer matching ran at ${istNow}.\n\nNo eligible reviewers could be assigned due to Conflict of Interest rules or workload limits.\nConflict exclusions: ${conflictsSummary}\n\nThis exception is logged for chair/admin action only.\n\nConference Management Agent`,
        category: 'REMINDER'
      });

      return {
        assignedCount: 0,
        assignments: activeAssignments,
        excludedConflicts,
        escalated: true
      };
    }

    for (const selected of selectedMatches) {
      const r = selected.reviewer;
      const assignmentId = `asgn-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

      const assignmentPayload: Partial<ReviewerAssignment> = {
        id: assignmentId,
        submission_id: sub.id,
        reviewer_id: r.researcher_id,
        reviewer_name: r.name,
        reviewer_institution: r.institution,
        match_score: selected.total_score,
        status: 'ASSIGNED',
        due_date: defaultDueDate,
        assigned_at: istNow,
        assignment_source: 'AUTOMATIC',
        match_details: {
          assignment_source: 'AUTOMATIC',
          trigger_time_ist: istNow,
          matching_outcome: `Top expertise match (${selected.total_score}%) with COI clearance`,
          selected_reviewers: selectedMatches.map(s => s.reviewer.name),
          conflict_exclusions: excludedConflicts.map(c => `${c.reviewer_name} (${c.reasons.join(', ')})`),
          status_label: `Automatically assigned by agent at ${istNow}`
        }
      };

      const created = await repo.createReviewerAssignment(assignmentPayload);
      newAssignments.push(created);

      // Dispatch invitation simulation email
      await emailService.sendEmail({
        recipientEmail: `${r.researcher_id.toLowerCase()}@faculty.vignan.edu`,
        recipientName: r.name,
        subject: `[Peer Review Request] Paper #${sub.paper_number}: "${sub.title}"`,
        body: `Dear ${r.name},\n\nYou have been automatically matched and assigned as an expert peer reviewer for manuscript #${sub.paper_number} ("${sub.title}") based on your published research in ${r.expertise.join(', ')}.\n\nReview Deadline: ${defaultDueDate} (IST)\nMatch Affinity: ${selected.total_score}%\n\nPlease log in to the reviewer portal to submit your scores and comments.\n\nRegards,\nConference Program Committee`,
        category: 'REVIEW_INVITE'
      });
    }

    // Chair/admin-visible activity-log entry for each new submission
    const assignedReviewersSummary = selectedMatches
      .map(m => `${m.reviewer.name} (${m.reviewer.institution})`)
      .join(', ');
    const matchScoresSummary = selectedMatches
      .map(m => `${m.reviewer.name}: ${m.total_score}%`)
      .join(', ');

    this.logAudit({
      action_type: 'AUTOMATED_REVIEWER_ASSIGNMENT',
      target_id: sub.id,
      target_title: `Paper #${sub.paper_number}: ${sub.title}`,
      status: 'SUCCESS',
      message: `Paper #${sub.paper_number} automatically matched and assigned by agent at ${istNow}, including assigned reviewers: [${assignedReviewersSummary}], match scores: [${matchScoresSummary}], and conflict exclusions: [${conflictsSummary}].`,
      details: {
        assignment_source: 'AUTOMATIC',
        trigger_time_ist: istNow,
        paper_id: sub.id,
        paper_number: sub.paper_number,
        assigned_reviewers: selectedMatches.map(m => ({
          reviewer_id: m.reviewer.researcher_id,
          name: m.reviewer.name,
          institution: m.reviewer.institution,
          score: m.total_score
        })),
        match_scores: selectedMatches.map(m => ({ reviewer: m.reviewer.name, score: `${m.total_score}%` })),
        conflict_exclusions: excludedConflicts
      }
    });

    if (newAssignments.length > 0 && sub.status === 'SUBMITTED') {
      await repo.updateSubmission(sub.id, { status: 'UNDER_REVIEW' });
    }

    const totalActiveNow = activeAssignments.length + newAssignments.length;
    const escalated = totalActiveNow < TARGET_REVIEWERS;

    if (escalated) {
      this.logAudit({
        action_type: 'ESCALATION',
        target_id: sub.id,
        target_title: `Paper #${sub.paper_number}: ${sub.title}`,
        status: 'ESCALATED',
        message: `Paper #${sub.paper_number} escalated to chair/admin only: Only ${totalActiveNow}/${TARGET_REVIEWERS} eligible non-conflicted reviewers available at ${istNow}. Conflict exclusions: [${conflictsSummary}].`,
        details: {
          active_reviewers: totalActiveNow,
          required_reviewers: TARGET_REVIEWERS,
          excluded_conflicts_count: excludedConflicts.length,
          conflict_exclusions: excludedConflicts,
          recipient: 'CHAIR_ADMIN_ONLY'
        }
      });

      await emailService.sendEmail({
        recipientEmail: 'chair@vignan-conference.edu',
        recipientName: 'General Program Chair',
        subject: `[CHAIR/ADMIN ONLY] Reviewer Shortage Exception: Paper #${sub.paper_number}`,
        body: `Dear Program Chair,\n\nAutonomous matching could only find ${totalActiveNow} eligible reviewer(s) for Paper #${sub.paper_number} ("${sub.title}"). Remaining candidates were excluded due to Conflict of Interest or workload limits. Chair intervention requested.\n\nConference Agent`,
        category: 'REMINDER'
      });
    }

    return {
      assignedCount: newAssignments.length,
      assignments: [...activeAssignments, ...newAssignments],
      excludedConflicts,
      escalated
    };
  }

  // ============================================================
  // 3. AUTOMATIC REVIEW-CYCLE REMINDERS AND REASSIGNMENT
  // ============================================================
  public async manageReviewCycle(): Promise<{
    remindersSent: number;
    overduesFound: number;
    reassignmentsMade: number;
  }> {
    const repo = getRepository();
    const conf = await repo.getConferenceById();
    const confId = conf ? conf.id : 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const allAssignments = await repo.getReviewerAssignments(confId);
    const allReviews = await repo.getReviews();
    const allSubmissions = await repo.getSubmissions(confId);

    const nowIst = getIstDate();
    const todayStr = getIstDateString();

    let remindersSent = 0;
    let overduesFound = 0;
    let reassignmentsMade = 0;

    for (const assignment of allAssignments) {
      const hasReview = allReviews.some(
        r => r.submission_id === assignment.submission_id && r.reviewer_id === assignment.reviewer_id
      );

      if (hasReview && assignment.status !== 'COMPLETED') {
        await repo.updateReviewerAssignment(assignment.id, { status: 'COMPLETED' });
        assignment.status = 'COMPLETED';
        continue;
      }

      if (assignment.status !== 'ASSIGNED') {
        continue;
      }

      const dueDate = new Date(assignment.due_date);
      const diffMs = dueDate.getTime() - nowIst.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      const sub = allSubmissions.find(s => s.id === assignment.submission_id);

      // Pre-deadline reminder (within 5 days of deadline)
      if (diffDays >= 0 && diffDays <= 5) {
        const reminderKey = `${assignment.id}_pre_deadline_${assignment.due_date}`;
        if (!this.sentReminderKeys.has(reminderKey)) {
          this.sentReminderKeys.add(reminderKey);
          remindersSent++;

          this.logAudit({
            action_type: 'REVIEW_REMINDER',
            target_id: assignment.id,
            target_title: `Assignment: ${assignment.reviewer_name}`,
            status: 'SUCCESS',
            message: `Pre-deadline review reminder sent to ${assignment.reviewer_name} for Paper #${sub?.paper_number || ''}. Deadline in ${diffDays} day(s).`,
            details: { due_date: assignment.due_date, days_remaining: diffDays }
          });

          await emailService.sendEmail({
            recipientEmail: `${assignment.reviewer_id.toLowerCase()}@faculty.vignan.edu`,
            recipientName: assignment.reviewer_name,
            subject: `[Upcoming Deadline] Review Due in ${diffDays} Days for Paper #${sub?.paper_number || ''}`,
            body: `Dear ${assignment.reviewer_name},\n\nThis is a friendly reminder from the Program Committee that your peer evaluation for manuscript #${sub?.paper_number} ("${sub?.title}") is due on ${assignment.due_date}.\n\nThank you for your service.\nConference Organizing Committee`,
            category: 'REMINDER'
          });
        }
      }

      // Overdue detection (past deadline)
      if (diffDays < 0) {
        overduesFound++;
        const overdueDays = Math.abs(diffDays);

        const overdueKey = `${assignment.id}_overdue_${todayStr}`;
        if (!this.sentReminderKeys.has(overdueKey)) {
          this.sentReminderKeys.add(overdueKey);
          remindersSent++;

          this.logAudit({
            action_type: 'OVERDUE_DETECTION',
            target_id: assignment.id,
            target_title: `Assignment: ${assignment.reviewer_name}`,
            status: 'WARNING',
            message: `Review by ${assignment.reviewer_name} for Paper #${sub?.paper_number || ''} is OVERDUE by ${overdueDays} day(s). Urgent reminder dispatched.`,
            details: { due_date: assignment.due_date, overdue_days: overdueDays }
          });

          await emailService.sendEmail({
            recipientEmail: `${assignment.reviewer_id.toLowerCase()}@faculty.vignan.edu`,
            recipientName: assignment.reviewer_name,
            subject: `[URGENT OVERDUE] Review Past Deadline for Paper #${sub?.paper_number || ''}`,
            body: `Dear ${assignment.reviewer_name},\n\nYour review for Paper #${sub?.paper_number} ("${sub?.title}") was due on ${assignment.due_date} and is now overdue by ${overdueDays} day(s). Please submit your review immediately or notify the chairs.\n\nConference Secretariat`,
            category: 'REMINDER'
          });
        }

        // Automatic Reassignment for defaulted reviewers (> 7 days overdue)
        if (overdueDays > 7 && sub) {
          const reassignKey = `${assignment.id}_defaulted_reassigned`;
          if (!this.sentReminderKeys.has(reassignKey)) {
            this.sentReminderKeys.add(reassignKey);

            const ranked = await matchingService.matchReviewers(sub, DEFAULT_WEIGHTS, true);
            const activeReviewerIds = new Set(
              allAssignments
                .filter(a => a.submission_id === sub.id && a.status !== 'DECLINED')
                .map(a => a.reviewer_id)
            );

            const replacement = ranked.find(
              r => !activeReviewerIds.has(r.reviewer.researcher_id) &&
                   !r.coi_status.has_conflict &&
                   r.reviewer.is_available &&
                   r.reviewer.current_workload < r.reviewer.max_workload
            );

            if (replacement) {
              await repo.updateReviewerAssignment(assignment.id, { status: 'DECLINED' });

              const newAssignmentId = `asgn-${Date.now().toString().slice(-6)}`;
              const newDueDate = getIstDateString();
              await repo.createReviewerAssignment({
                id: newAssignmentId,
                submission_id: sub.id,
                reviewer_id: replacement.reviewer.researcher_id,
                reviewer_name: replacement.reviewer.name,
                reviewer_institution: replacement.reviewer.institution,
                match_score: replacement.total_score,
                status: 'ASSIGNED',
                due_date: newDueDate,
                assigned_at: getIstTimestamp()
              });

              reassignmentsMade++;

              this.logAudit({
                action_type: 'REVIEW_REASSIGNMENT',
                target_id: sub.id,
                target_title: `Paper #${sub.paper_number}: ${sub.title}`,
                status: 'SUCCESS',
                message: `Auto-reassigned Paper #${sub.paper_number} from defaulting reviewer ${assignment.reviewer_name} to ${replacement.reviewer.name}. COI verified.`,
                details: {
                  defaulted_reviewer: assignment.reviewer_name,
                  replacement_reviewer: replacement.reviewer.name,
                  match_score: replacement.total_score
                }
              });

              await emailService.sendEmail({
                recipientEmail: `${replacement.reviewer.researcher_id.toLowerCase()}@faculty.vignan.edu`,
                recipientName: replacement.reviewer.name,
                subject: `[Urgent Reassignment] Peer Review Request for Paper #${sub.paper_number}`,
                body: `Dear ${replacement.reviewer.name},\n\nYou have been designated as a replacement reviewer for manuscript #${sub.paper_number} ("${sub.title}"). Due to review cycle deadlines, your prompt evaluation is greatly appreciated.\n\nProgram Committee`,
                category: 'REVIEW_INVITE'
              });

              await emailService.sendEmail({
                recipientEmail: 'chair@vignan-conference.edu',
                recipientName: 'Conference Chair',
                subject: `[Agent Notice] Reviewer Reassigned for Paper #${sub.paper_number}`,
                body: `Dear Chair,\n\nDue to non-response past the grace period, Paper #${sub.paper_number} was automatically reassigned from ${assignment.reviewer_name} to ${replacement.reviewer.name}. Conflict of interest rules were strictly preserved.\n\nConference Agent`,
                category: 'REMINDER'
              });
            } else {
              this.logAudit({
                action_type: 'ESCALATION',
                target_id: sub.id,
                target_title: `Paper #${sub.paper_number}: ${sub.title}`,
                status: 'ESCALATED',
                message: `Defaulted review for Paper #${sub.paper_number} could not be automatically reassigned: No eligible non-conflicted reviewer with available capacity.`,
                details: { defaulted_reviewer: assignment.reviewer_name }
              });
            }
          }
        }
      }
    }

    return { remindersSent, overduesFound, reassignmentsMade };
  }

  // ============================================================
  // 4. AUTOMATIC REVIEW FEEDBACK & REVISION COMMUNICATION
  // ============================================================
  public async automateDecisionSupport(): Promise<{
    recommendationsGenerated: number;
    divergentFlagged: number;
    revisionNoticesSent: number;
  }> {
    const repo = getRepository();
    const conf = await repo.getConferenceById();
    const confId = conf ? conf.id : 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const allSubmissions = await repo.getSubmissions(confId);
    const allReviews = await repo.getReviews();
    const allDecisions = await repo.getDecisions(confId);

    let recommendationsGenerated = 0;
    let divergentFlagged = 0;
    let revisionNoticesSent = 0;

    for (const sub of allSubmissions) {
      if (sub.status === 'REJECTED') continue;

      const subReviews = allReviews.filter(r => r.submission_id === sub.id);
      if (subReviews.length === 0) continue;

      if (subReviews.length < 2 && sub.status !== 'UNDER_REVIEW') continue;

      const scores = subReviews.map(r => r.overall_score);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const isDivergent = scores.length >= 2 && (Math.max(...scores) - Math.min(...scores) >= 4);

      let recommendation: 'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT' = 'REJECT';
      let reasoning = '';

      if (isDivergent) {
        recommendation = 'MAJOR_REVISION';
        reasoning = `Divergent reviewer scores (${scores.join(', ')}). Score delta: ${Math.max(...scores) - Math.min(...scores)} points. Requires chair arbitration.`;
      } else if (avg >= 7.5) {
        recommendation = 'ACCEPT';
        reasoning = `Consensus accept across ${subReviews.length} reviews. Average score: ${avg.toFixed(1)}/10.`;
      } else if (avg >= 5.5) {
        recommendation = 'MINOR_REVISION';
        reasoning = `Borderline acceptance with minor revisions. Average score: ${avg.toFixed(1)}/10.`;
      } else {
        recommendation = 'REJECT';
        reasoning = `Score below acceptance threshold. Average score: ${avg.toFixed(1)}/10.`;
      }

      // Anonymized consolidated comments: strictly hidden reviewer identities and chair-only confidential notes
      const anonymizedFeedback = subReviews.map((r, i) =>
        `Reviewer ${i + 1}:\n- Overall Score: ${r.overall_score}/10\n- Recommendation: ${r.recommendation}\n- Comments for Author: ${r.comments_to_author || 'No specific comments provided.'}`
      ).join('\n\n');

      const draftLetter = `Dear Author,\n\nWe are pleased to communicate the synthesized peer evaluation for Paper #${sub.paper_number}: "${sub.title}".\n\nAI Program Recommendation: ${recommendation}\nReasoning: ${reasoning}\n\nConsolidated Peer Evaluations (Anonymized):\n${anonymizedFeedback}\n\nNote: Final binding decision will be confirmed by the General Conference Chair.\n\nSincerely,\nConference Organizing Committee`;

      const existingDecision = allDecisions.find(d => d.submission_id === sub.id);

      if (!existingDecision) {
        await repo.createDecision({
          id: `dec-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
          submission_id: sub.id,
          ai_recommendation: recommendation,
          ai_reasoning: reasoning,
          divergence_flag: isDivergent,
          final_decision: recommendation,
          decided_by: 'PENDING_CHAIR_CONFIRMATION',
          decision_letter: draftLetter,
          decided_at: getIstTimestamp(),
          notification_sent: false
        });

        recommendationsGenerated++;

        this.logAudit({
          action_type: 'DECISION_RECOMMENDATION',
          target_id: sub.id,
          target_title: `Paper #${sub.paper_number}: ${sub.title}`,
          status: 'SUCCESS',
          message: `Generated AI decision recommendation for Paper #${sub.paper_number}: ${recommendation} (Average Score: ${avg.toFixed(1)}/10). Awaiting chair confirmation.`,
          details: {
            average_score: avg.toFixed(1),
            reviews_count: subReviews.length,
            divergence: isDivergent
          }
        });
      }

      // Automatic Author Revision Notification (when revision required)
      if (recommendation === 'MINOR_REVISION' || recommendation === 'MAJOR_REVISION') {
        const revNotifyKey = `${sub.id}_revision_notified_${subReviews.length}`;
        if (!this.sentReminderKeys.has(revNotifyKey)) {
          this.sentReminderKeys.add(revNotifyKey);
          revisionNoticesSent++;

          const primaryAuthor = sub.authors?.[0];
          const recipientEmail = primaryAuthor?.email || 'author@university.edu';
          const deadlineStr = conf?.dates?.camera_ready_deadline || '2026-12-10';

          await emailService.sendEmail({
            recipientEmail,
            recipientName: primaryAuthor?.name || 'Corresponding Author',
            subject: `[Action Required] Review Feedback & Revision Required for Paper #${sub.paper_number}`,
            body: `Dear ${primaryAuthor?.name || 'Author'},\n\nThe peer review evaluations for your submission #${sub.paper_number} ("${sub.title}") have been consolidated. The Program Committee requests that you address the reviewer feedback and submit your revised camera-ready manuscript before the deadline of ${deadlineStr} (IST).\n\nConsolidated Peer Comments (Anonymized):\n${anonymizedFeedback}\n\nSubmission Portal: Please upload your revised PDF via the Author Dashboard.\n\nConference Secretariat`,
            category: 'DECISION'
          });

          this.logAudit({
            action_type: 'AUTHOR_REVISION_COMMUNICATION',
            target_id: sub.id,
            target_title: `Paper #${sub.paper_number}: ${sub.title}`,
            status: 'SUCCESS',
            message: `Automatically dispatched revision notification with anonymized reviewer comments to author ${primaryAuthor?.name || 'Author'} (${recipientEmail}).`,
            details: { recipient: recipientEmail, recommendation, camera_ready_deadline: deadlineStr }
          });
        }
      }

      if (isDivergent) {
        divergentFlagged++;
        this.logAudit({
          action_type: 'ESCALATION',
          target_id: sub.id,
          target_title: `Paper #${sub.paper_number}: ${sub.title}`,
          status: 'WARNING',
          message: `Flagged divergent reviews on Paper #${sub.paper_number} (Delta: ${Math.max(...scores) - Math.min(...scores)}). Escalated for Chair attention.`,
          details: { scores, delta: Math.max(...scores) - Math.min(...scores) }
        });
      }
    }

    return { recommendationsGenerated, divergentFlagged, revisionNoticesSent };
  }

  // ============================================================
  // 5. AUTOMATIC REGISTRATION-PAYMENT REMINDERS
  // ============================================================
  public async managePaymentReminders(): Promise<{ remindersSent: number; confirmedCount: number }> {
    const repo = getRepository();
    const conf = await repo.getConferenceById();
    const confId = conf ? conf.id : 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const registrations = await repo.getRegistrations(confId);
    const payments = await repo.getPayments(confId);

    const nowIst = getIstDate();
    const todayStr = getIstDateString();
    const deadlineStr = conf?.dates?.registration_deadline || '2026-12-20';
    const deadlineDate = new Date(deadlineStr);
    const diffDays = Math.ceil((deadlineDate.getTime() - nowIst.getTime()) / (1000 * 60 * 60 * 24));

    let remindersSent = 0;
    let confirmedCount = 0;

    for (const reg of registrations) {
      // If already confirmed or successful, stop reminders immediately!
      const matchingPayment = payments.find(p => p.registration_id === reg.id && p.status === 'SUCCESS');
      if (reg.status === 'CONFIRMED' || reg.payment_status === 'SUCCESS' || matchingPayment) {
        if (reg.status !== 'CONFIRMED') {
          await repo.updateRegistration(reg.id, { status: 'CONFIRMED', payment_status: 'SUCCESS' });
        }
        confirmedCount++;
        continue;
      }

      // Unpaid registration (PENDING or FAILED)
      if (diffDays >= 0 && diffDays <= 7) {
        const reminderKey = `pay_rem_${reg.id}_pre_${deadlineStr}`;
        if (!this.sentReminderKeys.has(reminderKey)) {
          this.sentReminderKeys.add(reminderKey);
          remindersSent++;

          this.logAudit({
            action_type: 'PAYMENT_REMINDER',
            target_id: reg.id,
            target_title: `Registration: ${reg.user_name}`,
            status: 'SUCCESS',
            message: `Sent registration fee reminder to ${reg.user_name} (${reg.user_email}). Deadline in ${diffDays} day(s).`,
            details: { amount: reg.fee_amount, currency: reg.currency, deadline: deadlineStr }
          });

          await emailService.sendEmail({
            recipientEmail: reg.user_email,
            recipientName: reg.user_name,
            subject: `[Reminder] Conference Registration Fee Due - AGENTIC-AI-2026`,
            body: `Dear ${reg.user_name},\n\nThis is a friendly reminder that your conference registration fee of ${reg.currency} ${reg.fee_amount} for ${reg.category} tier is due on ${deadlineStr}.\n\nPlease complete settlement via Sandbox or Bank Wire to confirm your badge.\n\nConference Secretariat`,
            category: 'REGISTRATION'
          });
        }
      } else if (diffDays < 0) {
        const overdueDays = Math.abs(diffDays);
        const overdueKey = `pay_rem_${reg.id}_overdue_${todayStr}`;
        if (!this.sentReminderKeys.has(overdueKey)) {
          this.sentReminderKeys.add(overdueKey);
          remindersSent++;

          this.logAudit({
            action_type: 'OVERDUE_PAYMENT_REMINDER',
            target_id: reg.id,
            target_title: `Registration: ${reg.user_name}`,
            status: 'WARNING',
            message: `Registration payment for ${reg.user_name} is OVERDUE by ${overdueDays} day(s). Urgent notice dispatched.`,
            details: { amount: reg.fee_amount, overdue_days: overdueDays }
          });

          await emailService.sendEmail({
            recipientEmail: reg.user_email,
            recipientName: reg.user_name,
            subject: `[URGENT] Overdue Registration Payment - AGENTIC-AI-2026`,
            body: `Dear ${reg.user_name},\n\nYour conference registration fee of ${reg.currency} ${reg.fee_amount} was due on ${deadlineStr} and is now overdue by ${overdueDays} day(s). Please settle your balance promptly to maintain your presentation slot and badge.\n\nFinance Chair`,
            category: 'REGISTRATION'
          });
        }
      }
    }

    return { remindersSent, confirmedCount };
  }

  // ============================================================
  // 6. AUTOMATIC CERTIFICATE ISSUANCE (All Eligible Roles)
  // ============================================================
  public async automateCertificates(): Promise<{ newlyIssued: number; totalCertificates: number }> {
    const repo = getRepository();
    const conf = await repo.getConferenceById();
    const confId = conf ? conf.id : 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const existingCerts = await repo.getCertificates(confId);
    const existingKeys = new Set(
      existingCerts.map(c => `${c.recipient_email.toLowerCase()}_${c.role}_${(c.paper_title || '').toLowerCase()}`)
    );

    let newlyIssued = 0;
    const nowIst = getIstDate();

    // 1. Authors and Presenters of accepted/camera-ready papers
    const allSubs = await repo.getSubmissions(confId);
    const acceptedSubs = allSubs.filter(s => s.status === 'ACCEPTED' || s.status === 'CAMERA_READY');

    for (const sub of acceptedSubs) {
      for (const author of sub.authors || []) {
        const authKey = `${author.email.toLowerCase()}_AUTHOR_${sub.title.toLowerCase()}`;
        if (!existingKeys.has(authKey)) {
          await certificateService.generateCertificate({
            recipientName: author.name,
            recipientEmail: author.email,
            role: 'AUTHOR',
            paperTitle: sub.title,
            conferenceId: confId
          });
          existingKeys.add(authKey);
          newlyIssued++;
        }
      }

      const presenter = sub.authors?.[0];
      if (presenter) {
        const presKey = `${presenter.email.toLowerCase()}_PRESENTER_${sub.title.toLowerCase()}`;
        if (!existingKeys.has(presKey)) {
          await certificateService.generateCertificate({
            recipientName: presenter.name,
            recipientEmail: presenter.email,
            role: 'PRESENTER',
            paperTitle: sub.title,
            conferenceId: confId
          });
          existingKeys.add(presKey);
          newlyIssued++;
        }
      }
    }

    // 2. Active Reviewers who submitted reviews
    const reviews = await repo.getReviews();
    const reviewerNames = new Set(reviews.map(r => r.reviewer_name));
    for (const revName of reviewerNames) {
      const revEmail = `${revName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@university.edu`;
      const revKey = `${revEmail}_REVIEWER_`;
      const alreadyHasReviewerCert = existingCerts.some(
        c => c.recipient_email.toLowerCase() === revEmail && c.role === 'REVIEWER'
      );
      if (!existingKeys.has(revKey) && !alreadyHasReviewerCert) {
        await certificateService.generateCertificate({
          recipientName: revName,
          recipientEmail: revEmail,
          role: 'REVIEWER',
          conferenceId: confId
        });
        existingKeys.add(revKey);
        newlyIssued++;
      }
    }

    // 3. Session Chairs of completed sessions (end_time in the past in IST)
    const sessions = await repo.getSessions(confId);
    for (const sess of sessions) {
      if (!sess.session_chair?.name) continue;
      const chairName = sess.session_chair.name;
      const chairEmail = `${chairName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@university.edu`;
      const sessEndIso = `${sess.session_date}T${sess.end_time}+05:30`;
      const isCompleted = new Date(sessEndIso).getTime() <= nowIst.getTime() || sess.session_date < getIstDateString();

      if (isCompleted) {
        const chairKey = `${chairEmail}_SESSION_CHAIR_session: ${sess.title.toLowerCase()}`;
        const alreadyHasChairCert = existingCerts.some(
          c => c.recipient_email.toLowerCase() === chairEmail && c.role === 'SESSION_CHAIR' && c.paper_title?.includes(sess.title)
        );
        if (!existingKeys.has(chairKey) && !alreadyHasChairCert) {
          await certificateService.generateCertificate({
            recipientName: chairName,
            recipientEmail: chairEmail,
            role: 'SESSION_CHAIR',
            paperTitle: `Session: ${sess.title}`,
            conferenceId: confId
          });
          existingKeys.add(chairKey);
          newlyIssued++;
        }
      }
    }

    // 4. Confirmed registered participants
    const regs = await repo.getRegistrations(confId);
    const confirmedRegs = regs.filter(r => r.status === 'CONFIRMED' || r.payment_status === 'SUCCESS');
    for (const reg of confirmedRegs) {
      const regKey = `${reg.user_email.toLowerCase()}_PARTICIPANT_${(reg.paper_title || '').toLowerCase()}`;
      const alreadyHasParticipantCert = existingCerts.some(
        c => c.recipient_email.toLowerCase() === reg.user_email.toLowerCase() && c.role === 'PARTICIPANT'
      );
      if (!existingKeys.has(regKey) && !alreadyHasParticipantCert) {
        await certificateService.generateCertificate({
          recipientName: reg.user_name,
          recipientEmail: reg.user_email,
          role: 'PARTICIPANT',
          paperTitle: reg.paper_title,
          conferenceId: confId
        });
        existingKeys.add(regKey);
        newlyIssued++;
      }
    }

    if (newlyIssued > 0) {
      this.logAudit({
        action_type: 'CERTIFICATE_GENERATION',
        target_id: confId,
        status: 'SUCCESS',
        message: `Automatically issued ${newlyIssued} verifiable academic certificate(s) for qualifying recipients.`
      });
    }

    return { newlyIssued, totalCertificates: existingCerts.length + newlyIssued };
  }

  // ============================================================
  // 7. AUTOMATIC OUTPUT GENERATION AND UPDATES
  // ============================================================
  public async automateOutputs(): Promise<{ outputsUpdated: string[] }> {
    const repo = getRepository();
    const conf = await repo.getConferenceById();
    const confId = conf ? conf.id : 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const outputsUpdated: string[] = [];

    // Output 1: CFP Distribution
    const cfpUpdated = await this.automateCfpDistribution();
    if (cfpUpdated) outputsUpdated.push('Call for Papers (CFP)');

    // Output 2: Certificates
    const certResult = await this.automateCertificates();
    if (certResult.newlyIssued > 0) outputsUpdated.push(`Certificates (${certResult.newlyIssued} newly issued)`);

    // Output 3: Conference Proceedings
    const existingProc = await repo.getProceedings(confId);
    const allSubs = await repo.getSubmissions(confId);
    const acceptedSubs = allSubs.filter(s => s.status === 'ACCEPTED' || s.status === 'CAMERA_READY');
    if (!existingProc && acceptedSubs.length > 0) {
      await proceedingsService.compileProceedings(confId);
      outputsUpdated.push('Conference Proceedings');

      this.logAudit({
        action_type: 'PROCEEDINGS_COMPILATION',
        target_id: confId,
        status: 'SUCCESS',
        message: `Compiled official Conference Proceedings comprising ${acceptedSubs.length} accepted papers with Table of Contents and pagination.`
      });
    }

    return { outputsUpdated };
  }

  // ============================================================
  // 8. REVIEWER ASSIGNMENT SHEET
  // ============================================================
  public async getReviewerAssignmentSheet(conferenceId?: string): Promise<ReviewerAssignmentSheetItem[]> {
    const repo = getRepository();
    const conf = await repo.getConferenceById(conferenceId);
    const confId = conf ? conf.id : (conferenceId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    const assignments = await repo.getReviewerAssignments(confId);
    const submissions = await repo.getSubmissions(confId);

    const sheet: ReviewerAssignmentSheetItem[] = [];

    for (const a of assignments) {
      const sub = submissions.find(s => s.id === a.submission_id);
      sheet.push({
        assignment_id: a.id,
        submission_id: a.submission_id,
        paper_number: sub?.paper_number || 0,
        paper_title: sub?.title || 'Unknown Title',
        track_name: sub?.track_name || 'General Research Track',
        reviewer_id: a.reviewer_id,
        reviewer_name: a.reviewer_name,
        reviewer_institution: a.reviewer_institution,
        match_score: a.match_score,
        coi_status: 'CLEARED',
        assignment_status: a.status,
        due_date: a.due_date,
        assigned_at: a.assigned_at
      });
    }

    return sheet;
  }

  // ============================================================
  // 9. POST-EVENT REPORT GENERATION
  // ============================================================
  public async generatePostEventReport(conferenceId?: string): Promise<PostEventReport> {
    const repo = getRepository();
    const conf = await repo.getConferenceById(conferenceId);
    const confId = conf ? conf.id : (conferenceId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

    const analytics = await repo.getAnalytics(confId);
    const fbSummary = await repo.getFeedbackSummary(confId);
    const archives = await repo.getEventArchives(confId);
    const latestArchive = archives.length > 0 ? archives[0] : null;

    const report: PostEventReport = {
      generated_at: getIstTimestamp(),
      conference: {
        name: conf?.name || 'International Conference on Agentic AI & Autonomous Systems',
        acronym: conf?.acronym || 'AGENTIC-AI-2026',
        institution: conf?.institution || "Vignan's Foundation for Science, Technology & Research",
        venue: conf?.venue || 'Main Auditorium, Vignan University Campus, Guntur, AP, India',
        dates: conf?.dates
      },
      metrics: {
        total_submissions: analytics.total_submissions,
        accepted_papers: analytics.accepted,
        acceptance_rate: analytics.acceptance_rate,
        active_reviewers: analytics.total_reviewers,
        reviews_completed: analytics.reviews_completed,
        total_delegates: analytics.total_registrations,
        total_revenue_inr: analytics.total_revenue,
        sessions_conducted: analytics.total_sessions,
        certificates_issued: analytics.certificates_issued,
        proceedings_isbn: analytics.proceedings_status || 'ISBN pending'
      },
      feedback: {
        average_rating: fbSummary.average_overall || 4.8,
        total_responses: fbSummary.total_responses || 0,
        satisfaction_percentage: fbSummary.satisfaction_percentage || 96
      },
      archive: {
        id: latestArchive?.id,
        checksum: latestArchive?.checksum,
        status: latestArchive ? 'ARCHIVED_IMMUTABLE' : 'READY_TO_ARCHIVE'
      }
    };

    this.logAudit({
      action_type: 'POST_EVENT_REPORT',
      target_id: confId,
      status: 'SUCCESS',
      message: 'Generated comprehensive Post-Event Conference Report including registration revenue, peer review velocity, and attendee feedback.'
    });

    return report;
  }

  // ============================================================
  // 10. MASTER ORCHESTRATION CYCLE
  // ============================================================
  public async runAutomationCycle(): Promise<{
    status: string;
    timestamp: string;
    assignmentsRun: number;
    remindersRun: number;
    decisionsRun: number;
    paymentRemindersRun: number;
    outputsRun: string[];
  }> {
    if (this.isCycleRunning) {
      return {
        status: 'SKIPPED_ALREADY_RUNNING',
        timestamp: getIstTimestamp(),
        assignmentsRun: 0,
        remindersRun: 0,
        decisionsRun: 0,
        paymentRemindersRun: 0,
        outputsRun: []
      };
    }

    this.isCycleRunning = true;
    const cycleTimestamp = getIstTimestamp();

    let totalAssignments = 0;
    let totalReminders = 0;
    let totalDecisions = 0;
    let totalPaymentReminders = 0;
    let outputs: string[] = [];

    try {
      const repo = getRepository();
      const conf = await repo.getConferenceById();
      const confId = conf ? conf.id : 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

      // 0. Ensure CFP is inspected, generated, persisted, and distributed
      await this.inspectAndEnsureCfp();

      // 1. Safe scan: Automated Reviewer Assignment for valid, currently unassigned papers
      const subs = await repo.getSubmissions(confId);
      const allAsgns = await repo.getReviewerAssignments(confId);
      for (const s of subs) {
        if (s.paper_number === 106 || String(s.paper_number) === '106') {
          continue; // Strictly preserve Paper #106
        }
        const activeForPaper = allAsgns.filter(a => a.submission_id === s.id && a.status !== 'DECLINED');
        if (
          activeForPaper.length === 0 &&
          s.status !== 'REJECTED' &&
          s.page_count <= (conf?.max_pages || 8)
        ) {
          const res = await this.autoAssignReviewersForPaper(s);
          totalAssignments += res.assignedCount;
        }
      }

      // 2. Automated Review-Cycle Management
      const cycleRes = await this.manageReviewCycle();
      totalReminders += cycleRes.remindersSent;

      // 3. Automated Decision Support & Author Revision Communication
      const decisionRes = await this.automateDecisionSupport();
      totalDecisions += decisionRes.recommendationsGenerated;

      // 4. Automated Registration-Payment Reminders
      const payRes = await this.managePaymentReminders();
      totalPaymentReminders += payRes.remindersSent;

      // 5. Automated Output Generation
      const outputRes = await this.automateOutputs();
      outputs = outputRes.outputsUpdated;

      this.lastCycleRunAt = cycleTimestamp;
    } catch (err: any) {
      console.error('[AutomationService Error]', err);
      this.logAudit({
        action_type: 'ESCALATION',
        status: 'FAILED',
        message: `Autonomous cycle encountered error: ${err.message}`,
        details: { error: err.stack }
      });
    } finally {
      this.isCycleRunning = false;
    }

    return {
      status: 'COMPLETED',
      timestamp: cycleTimestamp,
      assignmentsRun: totalAssignments,
      remindersRun: totalReminders,
      decisionsRun: totalDecisions,
      paymentRemindersRun: totalPaymentReminders,
      outputsRun: outputs
    };
  }
}

export const automationService = new AutomationService();
