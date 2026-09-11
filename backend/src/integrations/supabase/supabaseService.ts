import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private url: string | null;
  private key: string | null;

  constructor() {
    this.url = process.env.SUPABASE_URL?.trim() || null;
    this.key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim() || null;

    if (this.url && this.key) {
      try {
        this.client = createClient(this.url, this.key);
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
        this.client = null;
      }
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.url && this.key && this.client);
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public getStatus() {
    return {
      provider: 'Supabase PostgreSQL Cloud',
      isConfigured: this.isConfigured(),
      urlSet: Boolean(this.url),
      keySet: Boolean(this.key),
      status: this.isConfigured() ? ('CONNECTED' as const) : ('NOT_CONFIGURED' as const)
    };
  }
}

export const supabaseService = new SupabaseService();
