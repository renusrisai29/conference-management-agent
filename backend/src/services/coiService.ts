import { Submission, Agent17Researcher } from '../types';

export interface CoiResult {
  has_conflict: boolean;
  reasons: string[];
}

export class CoiService {
  /**
   * Detect potential conflicts of interest between a paper submission and a prospective reviewer
   */
  public detectConflicts(submission: Submission, reviewer: Agent17Researcher): CoiResult {
    const reasons: string[] = [];

    const reviewerNameClean = reviewer.name.toLowerCase().replace(/^(dr\.|prof\.|mr\.|ms\.)\s*/, '').trim();
    const reviewerInstClean = reviewer.institution.toLowerCase().trim();
    const reviewerDeptClean = reviewer.department.toLowerCase().trim();

    for (const author of submission.authors) {
      const authorNameClean = author.name.toLowerCase().replace(/^(dr\.|prof\.|mr\.|ms\.)\s*/, '').trim();
      const authorInstClean = author.institution.toLowerCase().trim();
      const authorDeptClean = (author.department || '').toLowerCase().trim();

      // 1. Reviewer is paper author
      if (authorNameClean === reviewerNameClean || author.email.toLowerCase() === reviewer.scopus_author_id) {
        reasons.push(`Reviewer is paper author (${author.name})`);
      }

      // 2. Same institution
      if (
        authorInstClean.length > 5 &&
        (reviewerInstClean.includes(authorInstClean) || authorInstClean.includes(reviewerInstClean))
      ) {
        reasons.push(`Same institution (${author.institution})`);
      }

      // 3. Same department
      if (
        authorDeptClean.length > 5 &&
        reviewerDeptClean.length > 5 &&
        (reviewerDeptClean.includes(authorDeptClean) || authorDeptClean.includes(reviewerDeptClean)) &&
        !reasons.some(r => r.startsWith('Same department'))
      ) {
        reasons.push(`Same department (${author.department})`);
      }

      // 4. Recent co-authorship
      const hasCoauthored = reviewer.co_authors.some(coAuthor => {
        const coAuthorClean = coAuthor.toLowerCase().replace(/^(dr\.|prof\.|mr\.|ms\.)\s*/, '').trim();
        return coAuthorClean.includes(authorNameClean) || authorNameClean.includes(coAuthorClean);
      });

      if (hasCoauthored) {
        reasons.push(`Recent co-authorship within 36-month window with ${author.name}`);
      }
    }

    return {
      has_conflict: reasons.length > 0,
      reasons
    };
  }
}

export const coiService = new CoiService();
