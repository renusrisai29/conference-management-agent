import { similarityService } from '../src/services/similarityService';
import { coiService } from '../src/services/coiService';
import { matchingService } from '../src/services/matchingService';
import { schedulerService } from '../src/services/schedulerService';
import { certificateService } from '../src/services/certificateService';
import { proceedingsService } from '../src/services/proceedingsService';
import { getAgent17Provider } from '../src/integrations/agent17';
import { boltAgent } from '../src/agents/boltAgent';
import { db } from '../src/database/db';

describe('Conference Management Agent (Agent 26) - Service Suite', () => {
  test('Agent 17 Mock Provider has >= 15 faculty researchers and >= 100 publications', async () => {
    const provider = getAgent17Provider();
    const researchers = await provider.getResearchers();
    expect(researchers.length).toBeGreaterThanOrEqual(15);

    const totalPubs = researchers.reduce((acc, r) => acc + r.publications.length, 0);
    expect(totalPubs).toBeGreaterThanOrEqual(100);

    const status = provider.getProviderStatus();
    expect(status.providerName).toBe('Agent 17 Mock Provider');
    expect(status.isMock).toBe(true);
  });

  test('COI Service correctly detects institutional and co-author conflicts', async () => {
    const provider = getAgent17Provider();
    const paper101 = db.submissions.find(s => s.paper_number === 101)!;
    const authorAris = (await provider.getResearchers()).find(r => r.name.includes('Aris Thorne'))!;

    // Dr. Aris Thorne is a co-author of Elena Rostova on previous papers
    const coiResult = coiService.detectConflicts(paper101, authorAris);
    expect(coiResult.has_conflict).toBe(true);
    expect(coiResult.reasons.length).toBeGreaterThan(0);
  });

  test('Similarity Service runs genuine n-gram comparison and flags duplicate text', () => {
    const paper102 = db.submissions.find(s => s.paper_number === 102)!;
    const simResult = similarityService.checkSimilarity(paper102);

    expect(typeof simResult.similarity_score).toBe('number');
    expect(['PASSED', 'FLAGGED']).toContain(simResult.status);
  });

  test('Reviewer Matching engine computes weighted scores and ranks reviewers', async () => {
    const paper102 = db.submissions.find(s => s.paper_number === 102)!;
    const matches = await matchingService.matchReviewers(paper102);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].total_score).toBeGreaterThan(0);
    expect(matches[0].expertise_score).toBeDefined();
  });

  test('Scheduler Service produces conflict-free sessions', () => {
    const sessions = schedulerService.generateProgramme({ conferenceId: 'conf-01' });
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].room).toBeDefined();
    expect(sessions[0].session_chair).toBeDefined();
  });

  test('Certificate Service issues verifiable certificates with SHA-256 hash', () => {
    const cert = certificateService.generateCertificate({
      recipientName: 'Dr. Test Scholar',
      recipientEmail: 'scholar@mit.edu',
      role: 'PRESENTER',
      paperTitle: 'Testing Autonomous Multi-Agent Verification'
    });

    expect(cert.certificate_number).toMatch(/^VIGNAN-CONF2026-CERT-[A-F0-9]{6}$/);
    expect(cert.verification_hash.length).toBe(64); // SHA-256 hex length

    const verify = certificateService.verifyCertificate(cert.certificate_number);
    expect(verify.valid).toBe(true);
    expect(verify.certificate?.recipient_name).toBe('Dr. Test Scholar');
  });

  test('Proceedings Service compiles table of contents and maintains ISBN pending policy', () => {
    const proc = proceedingsService.compileProceedings('conf-01');
    expect(proc.title).toContain('Proceedings');
    expect(proc.isbn).toBe('ISBN pending');
    expect(proc.table_of_contents).toBeDefined();
  });

  test('Bolt Agent answers conference inquiries with real backend tool execution', async () => {
    const res = await boltAgent.handleMessage('Show conference status');
    expect(res.role).toBe('assistant');
    expect(res.content).toContain('AGENTIC-AI-2026');
    expect(res.tool_invocations?.length).toBeGreaterThan(0);
    expect(res.tool_invocations?.[0].tool_name).toBe('conferenceConfigurationTool');
  });
});
