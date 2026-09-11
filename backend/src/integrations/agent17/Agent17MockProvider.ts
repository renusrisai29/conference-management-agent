import { Agent17Provider } from './Agent17Provider';
import { Agent17Researcher, Agent17Publication } from '../../types';
import { MOCK_FACULTY_RESEARCHERS } from './mockData';

export class Agent17MockProvider implements Agent17Provider {
  private researchers: Agent17Researcher[] = [...MOCK_FACULTY_RESEARCHERS];

  async getResearchers(domain?: string): Promise<Agent17Researcher[]> {
    if (!domain) {
      return this.researchers;
    }
    const cleanDomain = domain.toLowerCase().trim();
    return this.researchers.filter(r =>
      r.research_areas.some(area => area.toLowerCase().includes(cleanDomain)) ||
      r.expertise.some(exp => exp.toLowerCase().includes(cleanDomain)) ||
      r.publications.some(pub => pub.domain.toLowerCase().includes(cleanDomain))
    );
  }

  async getResearcherById(researcherId: string): Promise<Agent17Researcher | null> {
    const researcher = this.researchers.find(r => r.researcher_id === researcherId);
    return researcher || null;
  }

  async searchExpertise(keywords: string[]): Promise<Agent17Researcher[]> {
    if (!keywords || keywords.length === 0) return this.researchers;

    const lowerKeywords = keywords.map(k => k.toLowerCase().trim());
    return this.researchers.filter(r => {
      const matchInExpertise = r.expertise.some(exp =>
        lowerKeywords.some(k => exp.toLowerCase().includes(k) || k.includes(exp.toLowerCase()))
      );
      const matchInKeywords = r.keywords.some(kw =>
        lowerKeywords.some(k => kw.toLowerCase().includes(k) || k.includes(kw.toLowerCase()))
      );
      const matchInPubs = r.publications.some(pub =>
        pub.keywords.some(pkw => lowerKeywords.some(k => pkw.toLowerCase().includes(k))) ||
        lowerKeywords.some(k => pub.title.toLowerCase().includes(k))
      );
      return matchInExpertise || matchInKeywords || matchInPubs;
    });
  }

  async getPublicationHistory(researcherId: string): Promise<Agent17Publication[]> {
    const researcher = this.researchers.find(r => r.researcher_id === researcherId);
    return researcher ? researcher.publications : [];
  }

  async getCoauthors(researcherId: string): Promise<string[]> {
    const researcher = this.researchers.find(r => r.researcher_id === researcherId);
    return researcher ? researcher.co_authors : [];
  }

  getProviderStatus() {
    const totalPubs = this.researchers.reduce((acc, r) => acc + r.publications.length, 0);
    return {
      providerName: 'Agent 17 Mock Provider',
      isMock: true,
      totalResearchers: this.researchers.length,
      totalPublications: totalPubs,
      status: 'CONNECTED' as const
    };
  }
}
