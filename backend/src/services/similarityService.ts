import { db } from '../database/db';
import { Submission } from '../types';

export interface SimilarityResult {
  similarity_score: number;
  status: 'PASSED' | 'FLAGGED';
  matched_documents: {
    paper_number: number;
    title: string;
    similarity: number;
    matched_segments: string[];
  }[];
}

export class SimilarityService {
  /**
   * Tokenize text into normalized word n-grams
   */
  private tokenize(text: string): Set<string> {
    const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const words = clean.split(/\s+/).filter(w => w.length > 3);
    const set = new Set<string>();

    // 1-grams and 2-grams
    for (let i = 0; i < words.length; i++) {
      set.add(words[i]);
      if (i < words.length - 1) {
        set.add(`${words[i]}_${words[i + 1]}`);
      }
    }
    return set;
  }

  /**
   * Calculate Jaccard similarity between two token sets
   */
  private calculateJaccard(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const token of setA) {
      if (setB.has(token)) {
        intersection++;
      }
    }
    const union = setA.size + setB.size - intersection;
    return (intersection / union) * 100;
  }

  /**
   * Check a submission against all other stored submissions
   */
  public checkSimilarity(target: Submission): SimilarityResult {
    const targetText = `${target.title} ${target.abstract} ${target.keywords.join(' ')}`;
    const targetTokens = this.tokenize(targetText);

    const matches: {
      paper_number: number;
      title: string;
      similarity: number;
      matched_segments: string[];
    }[] = [];

    let maxScore = 0;

    for (const sub of db.submissions) {
      if (sub.id === target.id) continue;

      const otherText = `${sub.title} ${sub.abstract} ${sub.keywords.join(' ')}`;
      const otherTokens = this.tokenize(otherText);
      const score = Math.round(this.calculateJaccard(targetTokens, otherTokens) * 10) / 10;

      if (score > 3.0) {
        // Find matching key phrases
        const matchedSegments: string[] = [];
        for (const token of targetTokens) {
          if (token.includes('_') && otherTokens.has(token)) {
            matchedSegments.push(token.replace('_', ' '));
            if (matchedSegments.length >= 4) break;
          }
        }

        matches.push({
          paper_number: sub.paper_number,
          title: sub.title,
          similarity: score,
          matched_segments: matchedSegments
        });

        if (score > maxScore) maxScore = score;
      }
    }

    const status: 'PASSED' | 'FLAGGED' = maxScore >= 20.0 ? 'FLAGGED' : 'PASSED';

    return {
      similarity_score: maxScore,
      status,
      matched_documents: matches.sort((a, b) => b.similarity - a.similarity)
    };
  }
}

export const similarityService = new SimilarityService();
