import { getRepository } from '../database/repositoryFactory';
import { matchingService } from '../services/matchingService';
import { coiService } from '../services/coiService';
import { similarityService } from '../services/similarityService';
import { schedulerService } from '../services/schedulerService';
import { certificateService } from '../services/certificateService';
import { proceedingsService } from '../services/proceedingsService';
import { getAgent17Provider } from '../integrations/agent17';
import { groqService } from '../integrations/groq/groqService';

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
  execute: (params: any) => Promise<any>;
}

export const agentTools: Record<string, AgentTool> = {
  conferenceConfigurationTool: {
    name: 'conferenceConfigurationTool',
    description: 'Retrieve current conference configuration, tracks, deadlines, and review policies.',
    parameters: [],
    execute: async () => {
      const repo = getRepository();
      const conf = (await repo.getConferenceById()) || {
        name: 'International Conference on Agentic AI & Autonomous Systems',
        acronym: 'AGENTIC-AI-2026',
        institution: "Vignan's Foundation for Science, Technology & Research",
        venue: 'Main Auditorium, Vignan University Campus, Guntur, AP, India',
        mode: 'HYBRID' as const,
        review_model: 'DOUBLE_BLIND' as const,
        acceptance_policy: 'Rigorous peer review with minimum 2 expert evaluations and automated COI resolution',
        dates: undefined
      };
      const tracks = await repo.getTracks();
      return {
        name: conf.name,
        acronym: conf.acronym,
        institution: conf.institution,
        venue: conf.venue,
        mode: conf.mode,
        review_model: conf.review_model,
        acceptance_policy: conf.acceptance_policy,
        dates: conf.dates,
        tracks: tracks.map(t => ({ name: t.name, code: t.code, topics: t.topics }))
      };
    }
  },

  cfpGeneratorTool: {
    name: 'cfpGeneratorTool',
    description: 'Generate or retrieve Call for Papers (CFP) for the conference.',
    parameters: [
      { name: 'theme', type: 'string', description: 'Specialized focus or theme', required: false }
    ],
    execute: async (params: any) => {
      const repo = getRepository();
      const conf = (await repo.getConferenceById()) || {
        name: 'International Conference on Agentic AI & Autonomous Systems',
        acronym: 'AGENTIC-AI-2026',
        institution: "Vignan's Foundation for Science, Technology & Research",
        venue: 'Main Auditorium, Vignan University Campus, Guntur, AP, India',
        mode: 'HYBRID' as const,
        website_url: 'https://vignan.ac.in/agentic-ai-2026',
        theme: 'Architectures, Collaboration, and Governance of Autonomous AI Agents',
        max_pages: 8,
        submission_format: 'IEEE 2-Column Standard',
        review_model: 'DOUBLE_BLIND' as const,
        dates: {
          submission_deadline: '2026-10-15',
          review_deadline: '2026-11-15',
          conference_start_date: '2027-01-18',
          notification_date: '2026-11-25',
          camera_ready_deadline: '2026-12-15',
          conference_end_date: '2027-01-19'
        }
      };
      const tracks = await repo.getTracks();
      const tracksText = tracks.map(t => `- **${t.name} (${t.code})**: ${t.topics.join(', ')}`).join('\n');

      if (groqService.isConfigured()) {
        try {
          const prompt = `Generate an authoritative, IEEE/ACM format Call for Papers for ${conf.name} (${conf.acronym}) hosted at ${conf.institution}.\nThemes: ${conf.theme}\nTracks:\n${tracksText}\nDeadlines: Submission ${conf.dates?.submission_deadline}, Review ${conf.dates?.review_deadline}, Conference ${conf.dates?.conference_start_date}.\nMax pages: ${conf.max_pages}.`;
          const content = await groqService.generateCompletion(prompt, { temperature: 0.3 });
          return { generated_with: 'Groq Cloud LPU', cfp_markdown: content };
        } catch (err: any) {
          console.warn('Groq CFP generation failed, falling back to structured template:', err.message);
        }
      }

      const structuredCfp = `# CALL FOR PAPERS (CFP)\n## ${conf.name} (${conf.acronym})\n**Organized by:** ${conf.institution}\n**Venue:** ${conf.venue} (${conf.mode})\n**Website:** ${conf.website_url}\n\n### THEME\n${conf.theme}\n\n### SCOPE & TRACKS\n${tracksText}\n\n### SUBMISSION GUIDELINES\n- Format: ${conf.submission_format}\n- Maximum Page Limit: ${conf.max_pages} pages inclusive of references.\n- Review Policy: ${conf.review_model} review model.\n\n### IMPORTANT DATES\n- Submission Deadline: **${conf.dates?.submission_deadline}**\n- Author Notification: **${conf.dates?.notification_date}**\n- Camera-Ready Version: **${conf.dates?.camera_ready_deadline}**\n- Conference Dates: **${conf.dates?.conference_start_date} to ${conf.dates?.conference_end_date}**`;
      return { generated_with: 'Deterministic Academic Engine', cfp_markdown: structuredCfp };
    }
  },

  submissionTool: {
    name: 'submissionTool',
    description: 'Fetch submitted papers or details for a specific paper number.',
    parameters: [
      { name: 'paper_number', type: 'number', description: 'Specific paper number (optional)', required: false }
    ],
    execute: async (params: any) => {
      const repo = getRepository();
      if (params.paper_number) {
        const sub = await repo.getSubmissionById(Number(params.paper_number));
        if (!sub) return { error: `Paper #${params.paper_number} not found.` };
        return sub;
      }
      const subs = await repo.getSubmissions();
      return subs.map(s => ({
        paper_number: s.paper_number,
        title: s.title,
        track: s.track_name,
        authors: s.authors ? s.authors.map(a => a.name).join(', ') : '',
        status: s.status,
        similarity_score: s.similarity_score
      }));
    }
  },

  submissionValidationTool: {
    name: 'submissionValidationTool',
    description: 'Validate format, page limit, required author affiliations, and manuscript integrity for a paper.',
    parameters: [
      { name: 'paper_number', type: 'number', description: 'Paper number to validate', required: true }
    ],
    execute: async (params: any) => {
      const repo = getRepository();
      const sub = await repo.getSubmissionById(Number(params.paper_number));
      if (!sub) return { error: `Paper #${params.paper_number} not found.` };

      const conf = await repo.getConferenceById(sub.conference_id);
      const maxPages = conf?.max_pages || 8;
      const requiredFormat = conf?.submission_format || 'IEEE Double Column PDF';
      const issues: string[] = [];

      // Validate configured page limits
      if (sub.page_count > maxPages) {
        issues.push(`Page count (${sub.page_count}) exceeds conference limit (${maxPages} pages).`);
      }

      // Validate configured submission format requirements
      const fileName = (sub.file_name || sub.file_path || '').toLowerCase();
      if (requiredFormat.toLowerCase().includes('pdf') && !fileName.endsWith('.pdf')) {
        issues.push(`Manuscript does not meet required format specification (${requiredFormat}). A valid PDF upload is required.`);
      }

      if (!sub.authors || sub.authors.length === 0) {
        issues.push('No authors listed.');
      }
      if (!sub.abstract || sub.abstract.length < 50) {
        issues.push('Abstract is too short or missing.');
      }
      if (!sub.keywords || sub.keywords.length < 3) {
        issues.push('At least 3 keywords required.');
      }

      return {
        paper_number: sub.paper_number,
        title: sub.title,
        status: issues.length === 0 ? 'VALID' : 'INVALID',
        issues,
        page_count: sub.page_count,
        max_allowed: maxPages,
        format_requirement: requiredFormat
      };
    }
  },

  similarityTool: {
    name: 'similarityTool',
    description: 'Calculate document similarity and detect potential plagiarism against other submissions.',
    parameters: [
      { name: 'paper_number', type: 'number', description: 'Paper number to check', required: true }
    ],
    execute: async (params: any) => {
      const repo = getRepository();
      const sub = await repo.getSubmissionById(Number(params.paper_number));
      if (!sub) return { error: `Paper #${params.paper_number} not found.` };

      const result = await similarityService.checkSimilarity(sub);
      await repo.updateSubmission(sub.id, {
        similarity_score: result.similarity_score,
        similarity_status: result.status
      });

      return {
        paper_number: sub.paper_number,
        title: sub.title,
        similarity_score: `${result.similarity_score}%`,
        status: result.status,
        matched_documents: result.matched_documents
      };
    }
  },

  reviewerMatchingTool: {
    name: 'reviewerMatchingTool',
    description: 'Find ranked expert reviewers for a paper using Agent 17 faculty monitoring data, checking COI.',
    parameters: [
      { name: 'paper_number', type: 'number', description: 'Paper number to match', required: true }
    ],
    execute: async (params: any) => {
      const repo = getRepository();
      const sub = await repo.getSubmissionById(Number(params.paper_number));
      if (!sub) return { error: `Paper #${params.paper_number} not found.` };

      const ranked = await matchingService.matchReviewers(sub);

      return {
        paper_number: sub.paper_number,
        title: sub.title,
        data_source: 'Agent 17 Mock Provider',
        total_reviewers_evaluated: ranked.length,
        recommendations: ranked.slice(0, 5).map(r => ({
          name: r.reviewer.name,
          institution: r.reviewer.institution,
          total_score: `${r.total_score}%`,
          expertise_match: `${r.expertise_score}%`,
          keyword_match: `${r.keyword_score}%`,
          current_workload: `${r.reviewer.current_workload}/${r.reviewer.max_workload}`,
          has_conflict: r.coi_status.has_conflict,
          conflict_reasons: r.coi_status.reasons,
          status: r.recommendation
        }))
      };
    }
  },

  coiDetectionTool: {
    name: 'coiDetectionTool',
    description: 'Run Conflict of Interest detection on all reviewers or a specific reviewer for a paper.',
    parameters: [
      { name: 'paper_number', type: 'number', description: 'Paper number', required: true }
    ],
    execute: async (params: any) => {
      const repo = getRepository();
      const sub = await repo.getSubmissionById(Number(params.paper_number));
      if (!sub) return { error: `Paper #${params.paper_number} not found.` };

      const provider = getAgent17Provider();
      const researchers = await provider.getResearchers();

      const conflicts: any[] = [];
      for (const r of researchers) {
        const check = coiService.detectConflicts(sub, r);
        if (check.has_conflict) {
          conflicts.push({
            reviewer_name: r.name,
            institution: r.institution,
            reasons: check.reasons
          });
        }
      }

      return {
        paper_number: sub.paper_number,
        title: sub.title,
        conflicted_reviewers_found: conflicts.length,
        conflicts
      };
    }
  },

  reviewManagementTool: {
    name: 'reviewManagementTool',
    description: 'Fetch review statuses, score aggregates, and detect divergent reviews.',
    parameters: [
      { name: 'paper_number', type: 'number', description: 'Filter by paper number (optional)', required: false }
    ],
    execute: async (params: any) => {
      const repo = getRepository();
      if (params.paper_number) {
        const sub = await repo.getSubmissionById(Number(params.paper_number));
        if (!sub) return { error: `Paper #${params.paper_number} not found.` };

        const reviews = await repo.getReviews(sub.id);
        const scores = reviews.map(r => r.overall_score);
        const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
        const minScore = scores.length > 0 ? Math.min(...scores) : 0;
        const isDivergent = scores.length >= 2 && (maxScore - minScore >= 4);

        return {
          paper_number: sub.paper_number,
          title: sub.title,
          total_reviews: reviews.length,
          average_score: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A',
          is_divergent: isDivergent,
          reviews: reviews.map(r => ({
            reviewer: r.reviewer_name,
            score: r.overall_score,
            recommendation: r.recommendation,
            comments: r.comments_to_author
          }))
        };
      }

      const reviews = await repo.getReviews();
      const assignments = await repo.getReviewerAssignments();

      return {
        total_reviews: reviews.length,
        pending_assignments: assignments.filter(a => a.status === 'ASSIGNED').length,
        completed_reviews: assignments.filter(a => a.status === 'COMPLETED').length
      };
    }
  },

  decisionSupportTool: {
    name: 'decisionSupportTool',
    description: 'Synthesize reviewer feedback into an AI recommendation for the Conference Chair.',
    parameters: [
      { name: 'paper_number', type: 'number', description: 'Paper number', required: true }
    ],
    execute: async (params: any) => {
      const repo = getRepository();
      const sub = await repo.getSubmissionById(Number(params.paper_number));
      if (!sub) return { error: `Paper #${params.paper_number} not found.` };

      const reviews = await repo.getReviews(sub.id);
      if (reviews.length === 0) {
        return {
          paper_number: sub.paper_number,
          status: 'PENDING_REVIEWS',
          message: 'No reviews have been submitted for this paper yet.'
        };
      }

      const scores = reviews.map(r => r.overall_score);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const isDivergent = scores.length >= 2 && (Math.max(...scores) - Math.min(...scores) >= 4);

      let recommendation: 'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT' = 'REJECT';
      let reasoning = '';

      if (isDivergent) {
        recommendation = 'MAJOR_REVISION';
        reasoning = `Divergent reviews detected (Score delta: ${Math.max(...scores) - Math.min(...scores)} points). Recommending discussion or 3rd meta-reviewer before final decision.`;
      } else if (avg >= 7.5) {
        recommendation = 'ACCEPT';
        reasoning = `Consensus accept. Average score ${avg.toFixed(1)}/10 across ${reviews.length} independent reviews. High methodological soundness.`;
      } else if (avg >= 5.5) {
        recommendation = 'MINOR_REVISION';
        reasoning = `Borderline score ${avg.toFixed(1)}/10. Minor revisions recommended addressing reviewer queries on baselines.`;
      } else {
        recommendation = 'REJECT';
        reasoning = `Average score ${avg.toFixed(1)}/10 falls below conference acceptance threshold.`;
      }

      return {
        paper_number: sub.paper_number,
        title: sub.title,
        ai_recommendation: recommendation,
        ai_reasoning: reasoning,
        divergence_detected: isDivergent,
        average_score: avg.toFixed(1),
        binding_status: 'REQUIRES_CHAIR_CONFIRMATION',
        chair_note: 'The AI recommendation is non-binding. The Conference Chair retains final authority.'
      };
    }
  },

  scheduleTool: {
    name: 'scheduleTool',
    description: 'Generate or inspect conflict-free conference programme sessions.',
    parameters: [],
    execute: async () => {
      const repo = getRepository();
      const existingSessions = await repo.getSessions();
      const conf = await repo.getConferenceById();
      const confId = conf ? conf.id : 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

      const sessions = existingSessions.length > 0 ? existingSessions : await schedulerService.generateProgramme({
        conferenceId: confId
      });

      return {
        total_sessions: sessions.length,
        sessions: sessions.map(s => ({
          title: s.title,
          room: s.room,
          date: s.session_date,
          time: `${s.start_time} - ${s.end_time}`,
          status: schedulerService.computeSessionStatus(s),
          chair: s.session_chair ? s.session_chair.name : 'Session Chair',
          papers: s.papers.map(p => `#${p.paper_number} ${p.title}`)
        }))
      };
    }
  },

  certificateTool: {
    name: 'certificateTool',
    description: 'Issue or verify an academic certificate.',
    parameters: [
      { name: 'action', type: 'string', description: 'issue or verify', required: true },
      { name: 'certificate_number', type: 'string', description: 'Certificate number for verification', required: false },
      { name: 'recipient_name', type: 'string', description: 'Recipient name for issuance', required: false },
      { name: 'paper_title', type: 'string', description: 'Optional paper title for issuance', required: false },
      { name: 'role', type: 'string', description: 'AUTHOR, PRESENTER, REVIEWER, PARTICIPANT', required: false }
    ],
    execute: async (params: any) => {
      const repo = getRepository();

      if (params.action === 'verify') {
        return await certificateService.verifyCertificate(params.certificate_number || '');
      }

      if (params.action === 'issue') {
        const conf = await repo.getConferenceById();
        const cert = await certificateService.generateCertificate({
          recipientName: params.recipient_name || 'Academic Scholar',
          recipientEmail: 'scholar@university.edu',
          role: params.role || 'PARTICIPANT',
          paperTitle: params.paper_title,
          conferenceId: conf?.id
        });
        return {
          status: 'ISSUED',
          certificate_number: cert.certificate_number,
          verification_url: cert.verification_url,
          recipient: cert.recipient_name,
          role: cert.role
        };
      }

      return { certificates: await repo.getCertificates() };
    }
  },

  proceedingsTool: {
    name: 'proceedingsTool',
    description: 'Compile or view conference proceedings and ISBN status.',
    parameters: [
      { name: 'isbn', type: 'string', description: 'Optional manual ISBN', required: false }
    ],
    execute: async (params: any) => {
      const repo = getRepository();
      const conf = await repo.getConferenceById();
      const proceedings = await proceedingsService.compileProceedings(conf?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', params.isbn);
      return {
        title: proceedings.title,
        isbn_status: proceedings.isbn,
        total_papers_included: proceedings.total_papers,
        total_pages: proceedings.total_pages,
        table_of_contents: proceedings.table_of_contents
      };
    }
  },

  analyticsTool: {
    name: 'analyticsTool',
    description: 'Retrieve real-time conference analytics, submissions by track, and financial summaries.',
    parameters: [],
    execute: async () => {
      const repo = getRepository();
      return await repo.getAnalytics();
    }
  }
};
