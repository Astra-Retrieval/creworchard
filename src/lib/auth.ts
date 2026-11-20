import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  role: "member" | "admin";
  /** Testers can enter the product before it opens (and, later, see test features). */
  is_tester: boolean;
  plan: string;
  seats: number;
  member_number: number;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

/** The signed-in user plus their profile row, or null. */
export async function getSession() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .maybeSingle<Profile>();
  return { user: auth.user, profile };
}
