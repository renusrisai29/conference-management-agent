import { agentTools } from '../tools/agentTools';
import { groqService } from '../integrations/groq/groqService';
import { AssistantChatMessage } from '../types';
import { getRepository } from '../database/repositoryFactory';

export class BoltAgent {
  public async handleMessage(userMessage: string, history: AssistantChatMessage[] = []): Promise<AssistantChatMessage> {
    const text = userMessage.toLowerCase().trim();

    const toolInvocations: any[] = [];
    let assistantResponse = '';
    let quickActions: string[] = [
      'Conference Status',
      'Generate CFP',
      'Review Submissions',
      'Find Reviewers',
      'Check COI',
      'Manage Reviews',
      'Build Programme',
      'Registration',
      'Certificates',
      'Proceedings',
      'View Analytics'
    ];

    // Intent routing & Tool Execution
    if (text.includes('status') && (text.includes('conference') || text.includes('event'))) {
      const tool = agentTools.conferenceConfigurationTool;
      const result = await tool.execute({});
      toolInvocations.push({
        tool_name: 'conferenceConfigurationTool',
        parameters: {},
        result,
        status: 'completed'
      });
      assistantResponse = `Here is the current status of **${result.name} (${result.acronym})**:\n\n- **Host:** ${result.institution}\n- **Venue:** ${result.venue} (${result.mode})\n- **Review Model:** ${result.review_model}\n- **Active Tracks:** ${result.tracks.length} tracks configured\n- **Submission Deadline:** ${result.dates?.submission_deadline}\n- **Review Deadline:** ${result.dates?.review_deadline}`;
    }
    else if (text.includes('cfp') || text.includes('call for papers')) {
      const tool = agentTools.cfpGeneratorTool;
      const result = await tool.execute({});
      toolInvocations.push({
        tool_name: 'cfpGeneratorTool',
        parameters: {},
        result,
        status: 'completed'
      });
      assistantResponse = `I have generated the official Call for Papers (CFP) for **AGENTIC-AI-2026** using the ${result.generated_with}.\n\nIt includes all four tracks, author page limits, and critical conference dates. You can preview, edit, or broadcast it from the CFP tab.`;
    }
    else if (
      text.includes('find reviewer') ||
      text.includes('match reviewer') ||
      text.includes('assign reviewer') ||
      (text.includes('reviewer') && (text.includes('paper') || text.includes('submission')))
    ) {
      const isRemaining = text.includes('remaining');
      const quantityMatch = text.match(/(\d+)\s+(?:of\s+the\s+)?(?:remaining\s+)?(?:papers|submissions)/i) ||
                            text.match(/(?:those|these|all|the)\s+(\d+)\s+(?:remaining\s+)?(?:papers|submissions)/i) ||
                            text.match(/remaining\s+(\d+)\s+(?:papers|submissions)/i);
      const requestedQuantity = quantityMatch ? parseInt(quantityMatch[1], 10) : undefined;

      const isBatch = isRemaining ||
                      !!quantityMatch ||
                      /\b(?:those|these|all)\s+(?:papers|submissions)\b/i.test(text) ||
                      /\ball\s+(?:the\s+)?(?:papers|submissions)\b/i.test(text);

      if (isBatch) {
        // 1. Get actual currently submitted paper numbers from submission-listing tool
        const subTool = agentTools.submissionTool;
        const subsResult = await subTool.execute({});
        toolInvocations.push({
          tool_name: 'submissionTool',
          parameters: {},
          result: subsResult,
          status: 'completed'
        });

        const submittedPaperNumbers: number[] = Array.isArray(subsResult)
          ? subsResult.map((s: any) => s.paper_number).filter((n: any) => typeof n === 'number')
          : [];
        submittedPaperNumbers.sort((a, b) => a - b);

        let targetPaperNumbers = [...submittedPaperNumbers];

        // 2. For "remaining papers", exclude only papers already successfully assigned
        if (isRemaining) {
          const repo = getRepository();
          const allAssignments = await repo.getReviewerAssignments();
          const allSubmissions = await repo.getSubmissions();

          const assignedPaperNumbers = new Set<number>();
          for (const a of allAssignments) {
            if (a.status !== 'DECLINED') {
              const sub = allSubmissions.find(
                s => s.id === a.submission_id || String(s.paper_number) === a.submission_id || `sub-${s.paper_number}` === a.submission_id
              );
              if (sub) {
                assignedPaperNumbers.add(sub.paper_number);
              } else {
                const numMatch = a.submission_id.match(/\d+/);
                if (numMatch) {
                  assignedPaperNumbers.add(parseInt(numMatch[0], 10));
                }
              }
            }
          }

          targetPaperNumbers = targetPaperNumbers.filter(num => !assignedPaperNumbers.has(num));
        }

        // Apply quantity limit if specified (e.g. 6 papers or 5 papers)
        if (requestedQuantity && requestedQuantity > 0) {
          targetPaperNumbers = targetPaperNumbers.slice(0, requestedQuantity);
        }

        if (targetPaperNumbers.length === 0) {
          if (isRemaining) {
            assistantResponse = `All submitted papers have already been successfully assigned reviewers. There are no remaining unassigned papers.`;
          } else {
            assistantResponse = `Paper not found: No submitted papers found to assign reviewers.`;
          }
        } else {
          // 3. Pass real paper numbers to reviewerMatchingTool
          const matchResults: { paperNum: number; result: any }[] = [];
          for (const paperNum of targetPaperNumbers) {
            const tool = agentTools.reviewerMatchingTool;
            const result = await tool.execute({ paper_number: paperNum });
            toolInvocations.push({
              tool_name: 'reviewerMatchingTool',
              parameters: { paper_number: paperNum },
              result,
              status: result.error ? 'failed' : 'completed'
            });
            matchResults.push({ paperNum, result });
          }

          if (matchResults.length === 1) {
            const { paperNum, result } = matchResults[0];
            if (result.error) {
              assistantResponse = `Paper not found: ${result.error}`;
            } else {
              assistantResponse = `I queried the **Agent 17 Mock Provider** (Faculty Research Publication Monitoring Agent) and evaluated ${result.total_reviewers_evaluated} verified faculty profiles for **Paper #${paperNum}: "${result.title}"**.\n\nHere are the top ranked candidates based on our 5-factor weighted algorithm (50% expertise, 20% keywords, 15% research area, 10% workload, 5% suitability), with COI detection applied.`;
            }
          } else {
            const validMatches = matchResults.filter(m => !m.result.error);
            if (validMatches.length === 0) {
              assistantResponse = `Paper not found: None of the requested papers could be found.`;
            } else {
              const paperSummaries = validMatches
                .map(m => `**Paper #${m.paperNum}: "${m.result.title}"** (${m.result.total_reviewers_evaluated} verified faculty profiles evaluated)`)
                .join('\n- ');

              assistantResponse = `I queried the **Agent 17 Mock Provider** (Faculty Research Publication Monitoring Agent) and evaluated candidate reviewer matches for **${validMatches.length} papers** (${validMatches.map(m => `Paper #${m.paperNum}`).join(', ')}):\n\n- ${paperSummaries}\n\nTop ranked candidates have been identified based on our 5-factor weighted algorithm (50% expertise, 20% keywords, 15% research area, 10% workload, 5% suitability), with COI detection applied.`;
            }
          }
        }
      } else {
        // Single paper request
        const paperMatch = text.match(/(?:paper|submission)\s*(?:#|no\.?|number)?\s*(\d+)/i) ||
                           text.match(/#\s*(\d+)/) ||
                           text.match(/\b(10[1-9]|\d{3,})\b/) ||
                           text.match(/\d+/);
        const paperNum = paperMatch ? parseInt(paperMatch[1] || paperMatch[0], 10) : 102;

        const tool = agentTools.reviewerMatchingTool;
        const result = await tool.execute({ paper_number: paperNum });
        toolInvocations.push({
          tool_name: 'reviewerMatchingTool',
          parameters: { paper_number: paperNum },
          result,
          status: result.error ? 'failed' : 'completed'
        });

        // 5. Add a small validation so a nonexistent paper does not show undefined; show "Paper not found" instead
        if (result.error) {
          assistantResponse = `Paper not found: ${result.error}`;
        } else {
          assistantResponse = `I queried the **Agent 17 Mock Provider** (Faculty Research Publication Monitoring Agent) and evaluated ${result.total_reviewers_evaluated} verified faculty profiles for **Paper #${paperNum}: "${result.title}"**.\n\nHere are the top ranked candidates based on our 5-factor weighted algorithm (50% expertise, 20% keywords, 15% research area, 10% workload, 5% suitability), with COI detection applied.`;
        }
      }
    }
    else if (text.includes('coi') || text.includes('conflict of interest') || text.includes('conflicts')) {
      const paperMatch = text.match(/10[1-6]/) || text.match(/\d+/);
      const paperNum = paperMatch ? parseInt(paperMatch[0], 10) : 104;

      const tool = agentTools.coiDetectionTool;
      const result = await tool.execute({ paper_number: paperNum });
      toolInvocations.push({
        tool_name: 'coiDetectionTool',
        parameters: { paper_number: paperNum },
        result,
        status: 'completed'
      });

      assistantResponse = `Checked Conflict of Interest (COI) rules for **Paper #${paperNum}: "${result.title}"** across all active faculty. Found **${result.conflicted_reviewers_found} conflicted reviewer(s)**. These individuals are barred from automated assignment to uphold peer-review integrity.`;
    }
    else if (text.includes('validate') || (text.includes('check') && text.includes('submission'))) {
      const paperMatch = text.match(/10[1-6]/) || text.match(/\d+/);
      const paperNum = paperMatch ? parseInt(paperMatch[0], 10) : 102;

      const tool = agentTools.submissionValidationTool;
      const result = await tool.execute({ paper_number: paperNum });
      toolInvocations.push({
        tool_name: 'submissionValidationTool',
        parameters: { paper_number: paperNum },
        result,
        status: 'completed'
      });

      assistantResponse = `Validation report for **Paper #${paperNum}: "${result.title}"**:\n\n- **Status:** ${result.status}\n- **Page Count:** ${result.page_count} / ${result.max_allowed} pages\n${result.issues.length > 0 ? `- **Issues Found:** ${result.issues.join('; ')}` : '- **All formatting constraints satisfied.**'}`;
    }
    else if (text.includes('similarity') || text.includes('plagiarism')) {
      const paperMatch = text.match(/10[1-6]/) || text.match(/\d+/);
      const paperNum = paperMatch ? parseInt(paperMatch[0], 10) : 102;

      const tool = agentTools.similarityTool;
      const result = await tool.execute({ paper_number: paperNum });
      toolInvocations.push({
        tool_name: 'similarityTool',
        parameters: { paper_number: paperNum },
        result,
        status: 'completed'
      });

      assistantResponse = `Document similarity check completed for **Paper #${paperNum}** against conference submissions repository.\n\n- **Similarity Index:** ${result.similarity_score}\n- **Status:** ${result.status}\n- **Analysis:** Genuine n-gram tokenization and Jaccard comparison performed across stored documents.`;
    }
    else if (text.includes('decision') || text.includes('recommendation') || text.includes('accept') || text.includes('reject')) {
      const paperMatch = text.match(/10[1-6]/) || text.match(/\d+/);
      const paperNum = paperMatch ? parseInt(paperMatch[0], 10) : 105;

      const tool = agentTools.decisionSupportTool;
      const result = await tool.execute({ paper_number: paperNum });
      toolInvocations.push({
        tool_name: 'decisionSupportTool',
        parameters: { paper_number: paperNum },
        result,
        status: 'completed'
      });

      assistantResponse = `AI Decision Support synthesis for **Paper #${paperNum}: "${result.title}"**:\n\n- **AI Recommendation:** ${result.ai_recommendation}\n- **Reasoning:** ${result.ai_reasoning}\n- **Divergence Detected:** ${result.divergence_detected ? '⚠️ Yes (Significant reviewer disagreement)' : 'No'}\n\n*Note: ${result.chair_note}*`;
    }
    else if (text.includes('programme') || text.includes('schedule') || text.includes('sessions')) {
      const tool = agentTools.scheduleTool;
      const result = await tool.execute({});
      toolInvocations.push({
        tool_name: 'scheduleTool',
        parameters: {},
        result,
        status: 'completed'
      });

      assistantResponse = `The conference programme schedule has been compiled with **${result.total_sessions} conflict-free sessions** across Main Auditorium, Seminar Hall B, and Colloquium Room C. Presenters and session chairs have been verified to prevent concurrency clashes.`;
    }
    else if (text.includes('certificate')) {
      const tool = agentTools.certificateTool;
      const result = await tool.execute({ action: 'list' });
      toolInvocations.push({
        tool_name: 'certificateTool',
        parameters: { action: 'list' },
        result,
        status: 'completed'
      });

      assistantResponse = `We currently have **${result.certificates.length} verifiable certificates** generated in the database. Each certificate features a unique cryptographic SHA-256 hash and can be verified publicly at \`/api/certificates/:id/verify\`.`;
    }
    else if (text.includes('proceedings') || text.includes('isbn')) {
      const tool = agentTools.proceedingsTool;
      const result = await tool.execute({});
      toolInvocations.push({
        tool_name: 'proceedingsTool',
        parameters: {},
        result,
        status: 'completed'
      });

      assistantResponse = `Conference Proceedings compilation status for **${result.title}**:\n\n- **Total Papers Included:** ${result.total_papers_included}\n- **Total Pages:** ${result.total_pages}\n- **ISBN Status:** \`${result.isbn_status}\` *(Note: Under conference policy, ISBN is marked pending until officially registered by authorized chairs)*.`;
    }
    else if (text.includes('analytic') || text.includes('metric') || text.includes('stat')) {
      const tool = agentTools.analyticsTool;
      const result = await tool.execute({});
      toolInvocations.push({
        tool_name: 'analyticsTool',
        parameters: {},
        result,
        status: 'completed'
      });

      assistantResponse = `Here are the live post-event conference analytics:\n\n- **Total Submissions:** ${result.total_submissions}\n- **Accepted:** ${result.accepted} (${result.acceptance_rate}% acceptance rate)\n- **Active Reviewers:** ${result.total_reviewers} (monitored via Agent 17)\n- **Reviews Completed:** ${result.reviews_completed} (${result.reviews_pending} pending)\n- **Total Revenue:** ₹${result.total_revenue.toLocaleString('en-IN')}\n- **Sessions Scheduled:** ${result.total_sessions}`;
    }
    else if (text.includes('submission') || text.includes('papers')) {
      const tool = agentTools.submissionTool;
      const result = await tool.execute({});
      toolInvocations.push({
        tool_name: 'submissionTool',
        parameters: {},
        result,
        status: 'completed'
      });

      assistantResponse = `Found **${result.length} papers** submitted to AGENTIC-AI-2026. You can review them in the Submissions tab or ask me to match reviewers, run similarity checks, or generate decision recommendations for any paper.`;
    }
    else if (text.includes('registration') || text.includes('payment')) {
      assistantResponse = `The registration system is active with 6 participant tiers (Author, Faculty, Student, Research Scholar, Industry, Participant). The Sandbox Payment Gateway is currently verified and ready for test card transactions without using real currency.`;
    }
    else {
      // General greeting or fallback
      assistantResponse = `Hi, I'm Bolt, your Conference Management Assistant. I manage academic conferences end-to-end, from Call for Papers through peer review, AI decision support, registration, conflict-free scheduling, certificates, and proceedings.\n\nHow can I assist you today? You can choose from the quick actions below or type any request!`;
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: assistantResponse,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tool_invocations: toolInvocations,
      quick_actions: quickActions
    };
  }
}

export const boltAgent = new BoltAgent();
