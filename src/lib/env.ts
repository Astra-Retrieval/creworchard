/**
 * Integration readiness checks. Every integration is optional at build time
 * so the site can be previewed before Supabase and Stripe are wired up.
 */

export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  // Supabase publishable key (sb_publishable_...). The old ANON_KEY name is still
  // read as a fallback so a deploy never breaks mid-rename; remove it once Vercel
  // only has the new name.
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}

export function isSupabaseAdminConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(supabaseSecretKey());
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_EARLY_BIRD);
}

export const NOT_CONFIGURED_MESSAGE =
  "Sign-ups are not connected yet. Our systems are still coming online; please check back soon.";

/**
 * Supabase secret key (sb_secret_...). Server only: bypasses row level security.
 * Falls back to the old SERVICE_ROLE_KEY name during the rename.
 */
export function supabaseSecretKey(): string {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}
