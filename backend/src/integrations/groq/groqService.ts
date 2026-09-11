import Groq from 'groq-sdk';

export interface GroqGenerationOptions {
  temperature?: number;
  max_tokens?: number;
  systemPrompt?: string;
}

export class GroqService {
  private client: Groq | null = null;
  private apiKey: string | null = null;
  private model: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY?.trim() || null;
    this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    if (this.apiKey) {
      try {
        this.client = new Groq({ apiKey: this.apiKey });
      } catch (err) {
        console.error('Failed to initialize Groq client:', err);
        this.client = null;
      }
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.client);
  }

  public getStatus() {
    return {
      configured: this.isConfigured(),
      model: this.model,
      provider: 'Groq Cloud LPU',
      status: this.isConfigured() ? ('CONNECTED' as const) : ('NOT_CONFIGURED' as const)
    };
  }

  public async generateCompletion(prompt: string, options: GroqGenerationOptions = {}): Promise<string> {
    if (!this.isConfigured() || !this.client) {
      throw new Error('AI service is not configured. Please set GROQ_API_KEY in your environment.');
    }

    try {
      const messages: any[] = [];
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await this.client.chat.completions.create({
        messages,
        model: this.model,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 2048,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('Groq API Error:', error);
      throw new Error(`Groq API Error: ${error.message || 'Unknown error during inference'}`);
    }
  }
}

export const groqService = new GroqService();
