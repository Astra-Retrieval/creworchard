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

export interface ContactMessageRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  user_id: string | null;
  handled_at: string | null;
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
  const [waitlist, profiles, messages] = await Promise.all([
    db.from("waitlist").select("*").order("created_at", { ascending: false }).returns<WaitlistRow[]>(),
    db.from("profiles").select("*").order("created_at", { ascending: false }).returns<Profile[]>(),
    db.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(500).returns<ContactMessageRow[]>(),
  ]);
  if (waitlist.error) throw waitlist.error;
  if (profiles.error) throw profiles.error;
  if (messages.error) throw messages.error;
  // Unhandled messages first, newest first within each group.
  const sortedMessages = [...(messages.data ?? [])].sort(
    (a, b) => Number(Boolean(a.handled_at)) - Number(Boolean(b.handled_at)) || b.created_at.localeCompare(a.created_at),
  );
  return {
    waitlist: waitlist.data ?? [],
    members: (profiles.data ?? []).filter((p) => p.role !== "admin"),
    messages: sortedMessages,
  };
}
