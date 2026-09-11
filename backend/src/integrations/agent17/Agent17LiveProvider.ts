import { Agent17Provider } from './Agent17Provider';
import { Agent17Researcher, Agent17Publication } from '../../types';

export class Agent17LiveProvider implements Agent17Provider {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl?: string, apiKey?: string) {
    this.apiUrl = apiUrl || process.env.AGENT17_API_URL || '';
    this.apiKey = apiKey || process.env.AGENT17_API_KEY || '';
  }

  private isConfigured(): boolean {
    return Boolean(this.apiUrl && this.apiKey);
  }

  async getResearchers(domain?: string): Promise<Agent17Researcher[]> {
    if (!this.isConfigured()) {
      throw new Error('Agent 17 Live Provider is not configured with AGENT17_API_URL and AGENT17_API_KEY');
    }
    const url = new URL(`${this.apiUrl}/faculty/researchers`);
    if (domain) url.searchParams.append('domain', domain);

    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`Agent 17 Live API Error: ${res.statusText}`);
    return res.json();
  }

  async getResearcherById(researcherId: string): Promise<Agent17Researcher | null> {
    if (!this.isConfigured()) {
      throw new Error('Agent 17 Live Provider is not configured');
    }
    const res = await fetch(`${this.apiUrl}/faculty/researchers/${researcherId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Agent 17 Live API Error: ${res.statusText}`);
    return res.json();
  }

  async searchExpertise(keywords: string[]): Promise<Agent17Researcher[]> {
    if (!this.isConfigured()) {
      throw new Error('Agent 17 Live Provider is not configured');
    }
    const res = await fetch(`${this.apiUrl}/faculty/search`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords })
    });
    if (!res.ok) throw new Error(`Agent 17 Live API Error: ${res.statusText}`);
    return res.json();
  }

  async getPublicationHistory(researcherId: string): Promise<Agent17Publication[]> {
    if (!this.isConfigured()) {
      throw new Error('Agent 17 Live Provider is not configured');
    }
    const res = await fetch(`${this.apiUrl}/faculty/researchers/${researcherId}/publications`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    if (!res.ok) throw new Error(`Agent 17 Live API Error: ${res.statusText}`);
    return res.json();
  }

  async getCoauthors(researcherId: string): Promise<string[]> {
    if (!this.isConfigured()) {
      throw new Error('Agent 17 Live Provider is not configured');
    }
    const res = await fetch(`${this.apiUrl}/faculty/researchers/${researcherId}/coauthors`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    if (!res.ok) throw new Error(`Agent 17 Live API Error: ${res.statusText}`);
    return res.json();
  }

  getProviderStatus() {
    return {
      providerName: 'Agent 17 Live Provider',
      isMock: false,
      totalResearchers: 0,
      totalPublications: 0,
      status: this.isConfigured() ? ('CONNECTED' as const) : ('ERROR' as const)
    };
  }
}
