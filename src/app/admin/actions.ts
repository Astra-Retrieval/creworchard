"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-data";
import { createAdminClient } from "@/lib/supabase/admin";

/** Marks a contact message handled, or reopens it. Admins only. */
export async function setMessageHandled(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const handled = fd.get("handled") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const db = createAdminClient();
  if (!db) return;
  const { error } = await db
    .from("contact_messages")
    .update({ handled_at: handled ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) console.error("mark message handled failed", error);
  revalidatePath("/admin");
}
