"use server";

import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanName } from "@/lib/names";
import { NOT_CONFIGURED_MESSAGE } from "@/lib/env";
import type { FormState } from "@/app/waitlist/actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export type ContactTopic = "general" | "billing" | "support" | "partnership" | "press";
const TOPICS: ContactTopic[] = ["general", "billing", "support", "partnership", "press"];
/** Simple abuse guard: at most this many messages per email address per hour. */
const MAX_PER_HOUR = 5;

/**
 * Saves a contact-form message for the team to read on /admin.
 * Messages from signed-in members are linked to their account.
 */
export async function sendContactMessage(_prev: FormState, fd: FormData): Promise<FormState> {
  if (String(fd.get("company_website") ?? "").trim()) {
    return { status: "success", message: "Thanks, your message is on its way." }; // honeypot
  }

  const name = cleanName(fd.get("name"));
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const topicRaw = String(fd.get("topic") ?? "general");
  const topic: ContactTopic = TOPICS.includes(topicRaw as ContactTopic) ? (topicRaw as ContactTopic) : "general";
  const message = String(fd.get("message") ?? "").trim().slice(0, 4000);

  if (!name) return { status: "error", message: "Please tell us your name." };
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Please enter a valid email address so we can reply." };
  if (message.length < 2) return { status: "error", message: "Please write a message." };

  const db = createAdminClient();
  if (!db) return { status: "error", message: NOT_CONFIGURED_MESSAGE };

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("email", email) // stored lowercase, so an exact match is case-insensitive
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) {
    return { status: "error", message: "You've sent several messages in the last hour. Please try again a little later." };
  }

  const user = await getUser();
  const { error } = await db.from("contact_messages").insert({
    name,
    email,
    topic,
    message,
    user_id: user?.id ?? null,
  });
  if (error) {
    console.error("contact message insert failed", error);
    return { status: "error", message: "We couldn't send your message. Please try again." };
  }

  return {
    status: "success",
    message: `Thanks, ${name.split(" ")[0]}. Your message is in, and we'll reply to ${email}.`,
  };
}
