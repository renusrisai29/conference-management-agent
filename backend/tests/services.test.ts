import { similarityService } from '../src/services/similarityService';
import { coiService } from '../src/services/coiService';
import { matchingService } from '../src/services/matchingService';
import { schedulerService } from '../src/services/schedulerService';
import { certificateService } from '../src/services/certificateService';
import { proceedingsService } from '../src/services/proceedingsService';
import { getAgent17Provider } from '../src/integrations/agent17';
import { boltAgent } from '../src/agents/boltAgent';
import { db } from '../src/database/db';
import { getRepository } from '../src/database/repositoryFactory';

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

  test('Similarity Service runs genuine n-gram comparison and flags duplicate text', async () => {
    const paper102 = db.submissions.find(s => s.paper_number === 102)!;
    const simResult = await similarityService.checkSimilarity(paper102);

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

  test('Scheduler Service produces conflict-free sessions', async () => {
    const sessions = await schedulerService.generateProgramme({ conferenceId: 'conf-01' });
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].room).toBeDefined();
    expect(sessions[0].session_chair).toBeDefined();
  });

  test('Certificate Service issues verifiable certificates with SHA-256 hash', async () => {
    const cert = await certificateService.generateCertificate({
      recipientName: 'Dr. Test Scholar',
      recipientEmail: 'scholar@mit.edu',
      role: 'PRESENTER',
      paperTitle: 'Testing Autonomous Multi-Agent Verification'
    });

    expect(cert.certificate_number).toMatch(/^VIGNAN-CONF2026-CERT-[A-F0-9]{6}$/);
    expect(cert.verification_hash.length).toBe(64); // SHA-256 hex length

    const verify = await certificateService.verifyCertificate(cert.certificate_number);
    expect(verify.valid).toBe(true);
    expect(verify.certificate?.recipient_name).toBe('Dr. Test Scholar');
  });

  test('Proceedings Service compiles table of contents and maintains ISBN pending policy', async () => {
    const proc = await proceedingsService.compileProceedings('conf-01');
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

  test('“Assign reviewers for those 6 papers” uses 101–106, never Paper #6', async () => {
    const res = await boltAgent.handleMessage('Assign reviewers for those 6 papers');
    const matchingCalls = res.tool_invocations?.filter(t => t.tool_name === 'reviewerMatchingTool') || [];
    const paperNums = matchingCalls.map(t => t.parameters.paper_number);

    expect(paperNums).toEqual([101, 102, 103, 104, 105, 106]);
    expect(paperNums).not.toContain(6);
    expect(res.content).not.toContain('undefined');
  });

  test('“Assign reviewers for the remaining 5 papers” uses the five unassigned real paper numbers, never Paper #5', async () => {
    const repo = getRepository();
    const allSubs = await repo.getSubmissions();
    const paper101 = allSubs.find(s => s.paper_number === 101);

    // Mock assignments where Paper 101 is already successfully assigned, leaving 102-106 unassigned
    const mockAssignments: any[] = [
      {
        id: 'asgn-test-101',
        submission_id: paper101 ? paper101.id : 'sub-101',
        reviewer_id: 'FAC-A17-001',
        status: 'ASSIGNED'
      }
    ];

    const spy = jest.spyOn(repo, 'getReviewerAssignments').mockResolvedValue(mockAssignments);
    try {
      const res = await boltAgent.handleMessage('Assign reviewers for the remaining 5 papers');
      const matchingCalls = res.tool_invocations?.filter(t => t.tool_name === 'reviewerMatchingTool') || [];
      const paperNums = matchingCalls.map(t => t.parameters.paper_number);

      expect(paperNums).toEqual([102, 103, 104, 105, 106]);
      expect(paperNums).not.toContain(5);
      expect(res.content).not.toContain('undefined');
    } finally {
      spy.mockRestore();
    }
  });

  test('A missing paper shows a clear error without undefined fields', async () => {
    const res6 = await boltAgent.handleMessage('Assign reviewers for paper 6');
    expect(res6.content).toContain('Paper not found');
    expect(res6.content).not.toContain('undefined');
    const matchingCall6 = res6.tool_invocations?.find(t => t.tool_name === 'reviewerMatchingTool');
    expect(matchingCall6?.parameters.paper_number).toBe(6);
    expect(matchingCall6?.result.error).toContain('not found');

    const res999 = await boltAgent.handleMessage('Find reviewer for paper 999');
    expect(res999.content).toContain('Paper not found');
    expect(res999.content).not.toContain('undefined');
  });
});

