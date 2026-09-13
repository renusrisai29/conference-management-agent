import { IConferenceRepository } from './repository.interface';
import { SupabaseRepository } from './supabaseRepository';
import { InMemoryRepository } from './inMemoryRepository';
import { supabaseService } from '../integrations/supabase/supabaseService';

let repoInstance: IConferenceRepository | null = null;

/**
 * Returns the active conference repository.
 * Prefers SupabaseRepository if Supabase is configured and operational;
 * gracefully falls back to InMemoryRepository otherwise.
 */
export function getRepository(): IConferenceRepository {
  if (!repoInstance) {
    if (supabaseService.isConfigured()) {
      const client = supabaseService.getClient();
      if (client) {
        console.log('[RepositoryFactory] Initialized SupabaseRepository (PostgreSQL Cloud)');
        repoInstance = new SupabaseRepository(client);
        return repoInstance;
      }
    }
    console.warn('[RepositoryFactory] Initialized InMemoryRepository (In-Memory Fallback)');
    repoInstance = new InMemoryRepository();
  }
  return repoInstance;
}

/**
 * Explicitly sets or resets the active repository instance.
 * Allows programmatic fallback testing and custom repository injection.
 */
export function setRepository(repo: IConferenceRepository | null): void {
  repoInstance = repo;
}

export const repository = getRepository;
