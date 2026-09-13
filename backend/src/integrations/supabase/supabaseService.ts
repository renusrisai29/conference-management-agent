import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Polyfill global WebSocket for Node.js < 22 environments where native WebSocket is behind a flag
if (typeof globalThis !== 'undefined' && !globalThis.WebSocket) {
  (globalThis as any).WebSocket = class MockWebSocket {
    constructor() {}
  };
}

import path from 'path';
import dotenv from 'dotenv';

// Ensure .env is loaded if not already loaded in process.env
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private url: string | null = null;
  private key: string | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    if (this.client) return;

    this.url = process.env.SUPABASE_URL?.trim() || null;
    this.key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim() || null;

    if (this.url && this.key) {
      try {
        this.client = createClient(this.url, this.key, {
          auth: { persistSession: false }
        });
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
        this.client = null;
      }
    }
  }

  public isConfigured(): boolean {
    this.initClient();
    return Boolean(this.url && this.key && this.client);
  }

  public getClient(): SupabaseClient | null {
    this.initClient();
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
