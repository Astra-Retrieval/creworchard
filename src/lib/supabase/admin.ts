import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseAdminConfigured, supabaseSecretKey } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS: only ever use it on the server, after
 * the caller has been authorized (or for inserts that need no identity, like
 * the waitlist).
 */
export function createAdminClient() {
  if (!isSupabaseAdminConfigured()) return null;
  return createClient(env.supabaseUrl, supabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
