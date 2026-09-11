import { Agent17Researcher, Agent17Publication } from '../../types';

export interface Agent17Provider {
  /**
   * Get all registered faculty researchers, optionally filtered by domain
   */
  getResearchers(domain?: string): Promise<Agent17Researcher[]>;

  /**
   * Lookup a specific researcher by their faculty ID
   */
  getResearcherById(researcherId: string): Promise<Agent17Researcher | null>;

  /**
   * Search researchers with expertise or keywords matching query terms
   */
  searchExpertise(keywords: string[]): Promise<Agent17Researcher[]>;

  /**
   * Get the publication history for a researcher
   */
  getPublicationHistory(researcherId: string): Promise<Agent17Publication[]>;

  /**
   * Get known co-authors for a researcher to check recent collaborations
   */
  getCoauthors(researcherId: string): Promise<string[]>;

  /**
   * Provider metadata & status for integration diagnostics
   */
  getProviderStatus(): {
    providerName: string;
    isMock: boolean;
    totalResearchers: number;
    totalPublications: number;
    status: 'CONNECTED' | 'ERROR';
  };
}
