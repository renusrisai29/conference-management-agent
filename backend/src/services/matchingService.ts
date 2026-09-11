import { getAgent17Provider } from '../integrations/agent17';
import { coiService } from './coiService';
import { Submission, ReviewerMatchScore, Agent17Researcher } from '../types';

export interface MatchingWeights {
  expertise: number;    // default 0.50
  keywords: number;     // default 0.20
  researchArea: number; // default 0.15
  workload: number;     // default 0.10
  suitability: number;  // default 0.05
}

export const DEFAULT_WEIGHTS: MatchingWeights = {
  expertise: 0.50,
  keywords: 0.20,
  researchArea: 0.15,
  workload: 0.10,
  suitability: 0.05
};

export class MatchingService {
  /**
   * Helper to compute text overlap score (0 to 100)
   */
  private computeOverlap(paperTerms: string[], reviewerTerms: string[]): number {
    if (paperTerms.length === 0 || reviewerTerms.length === 0) return 0;

    let matchCount = 0;
    const normReviewer = reviewerTerms.map(t => t.toLowerCase());

    for (const pTerm of paperTerms) {
      const pClean = pTerm.toLowerCase().trim();
      if (normReviewer.some(rTerm => rTerm.includes(pClean) || pClean.includes(rTerm))) {
        matchCount++;
      }
    }

    const ratio = matchCount / Math.max(1, paperTerms.length);
    return Math.min(100, Math.round(ratio * 100));
  }

  /**
   * Match a submission with faculty researchers through the Agent 17 Provider
   */
  public async matchReviewers(
    submission: Submission,
    weights: MatchingWeights = DEFAULT_WEIGHTS,
    filterConflicts: boolean = false
  ): Promise<ReviewerMatchScore[]> {
    const provider = getAgent17Provider();
    const researchers = await provider.getResearchers();

    const paperKeywords = submission.keywords || [];
    const paperTopics = [submission.track_name || '', submission.title, submission.abstract].filter(Boolean);

    const scoredReviewers: ReviewerMatchScore[] = [];

    for (const reviewer of researchers) {
      // 1. Conflict of Interest check
      const coi = coiService.detectConflicts(submission, reviewer);

      // 2. Expertise score (50%)
      // Combines declared expertise and titles of published papers
      const pubKeywords = reviewer.publications.flatMap(p => p.keywords || []);
      const allExpertiseTerms = [...reviewer.expertise, ...pubKeywords];
      const expertiseRaw = this.computeOverlap(paperKeywords, allExpertiseTerms);

      // Also bonus if abstract or title matches publication titles
      let pubTitleBonus = 0;
      for (const pub of reviewer.publications) {
        if (paperKeywords.some(k => pub.title.toLowerCase().includes(k.toLowerCase()))) {
          pubTitleBonus += 10;
        }
      }
      const expertiseScore = Math.min(100, expertiseRaw + pubTitleBonus);

      // 3. Keyword score (20%)
      const keywordScore = this.computeOverlap(paperKeywords, reviewer.keywords);

      // 4. Research Area score (15%)
      const researchAreaScore = this.computeOverlap(
        [submission.track_name || ''],
        reviewer.research_areas
      );

      // 5. Workload & availability score (10%)
      let workloadScore = 0;
      if (reviewer.is_available) {
        const capacity = Math.max(0, reviewer.max_workload - reviewer.current_workload);
        workloadScore = Math.min(100, Math.round((capacity / reviewer.max_workload) * 100));
      }

      // 6. Suitability signals (5%) - e.g. citations, h-index
      const citationSignal = Math.min(100, Math.round((reviewer.h_index / 40) * 100));

      // Weighted combination
      const totalScore = Math.round(
        expertiseScore * weights.expertise +
        keywordScore * weights.keywords +
        researchAreaScore * weights.researchArea +
        workloadScore * weights.workload +
        citationSignal * weights.suitability
      );

      // Recommendation classification
      let recommendation: ReviewerMatchScore['recommendation'] = 'BORDERLINE';
      if (coi.has_conflict) {
        recommendation = 'CONFLICT';
      } else if (totalScore >= 75) {
        recommendation = 'HIGHLY_RECOMMENDED';
      } else if (totalScore >= 50) {
        recommendation = 'RECOMMENDED';
      }

      if (filterConflicts && coi.has_conflict) {
        continue;
      }

      scoredReviewers.push({
        reviewer,
        total_score: totalScore,
        expertise_score: expertiseScore,
        keyword_score: keywordScore,
        research_area_score: researchAreaScore,
        workload_score: workloadScore,
        suitability_score: citationSignal,
        coi_status: coi,
        recommendation
      });
    }

    // Rank: unconflicted first by descending score, conflicted at the end
    return scoredReviewers.sort((a, b) => {
      if (a.coi_status.has_conflict && !b.coi_status.has_conflict) return 1;
      if (!a.coi_status.has_conflict && b.coi_status.has_conflict) return -1;
      return b.total_score - a.total_score;
    });
  }
}

export const matchingService = new MatchingService();
