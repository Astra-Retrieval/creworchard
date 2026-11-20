import "server-only";
import { notFound } from "next/navigation";
import { getSession, type Profile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface WaitlistRow {
  id: string;
  email: string;
  full_name: string;
  organization: string | null;
  use_case: string;
  seats: number;
  notes: string | null;
  invite_code: string | null;
  created_at: string;
}

/** 404s for anyone who isn't a signed-in admin, so the page's existence isn't revealed. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.profile?.role !== "admin") notFound();
  return session;
}

export async function loadAdminData() {
  const db = createAdminClient();
  if (!db) return null;
  const [waitlist, profiles] = await Promise.all([
    db.from("waitlist").select("*").order("created_at", { ascending: false }).returns<WaitlistRow[]>(),
    db.from("profiles").select("*").order("created_at", { ascending: false }).returns<Profile[]>(),
  ]);
  if (waitlist.error) throw waitlist.error;
  if (profiles.error) throw profiles.error;
  return { waitlist: waitlist.data ?? [], members: (profiles.data ?? []).filter((p) => p.role !== "admin") };
}
