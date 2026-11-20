"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRODUCT_ACCESS_MODES, type ProductAccessMode } from "@/lib/product-access";

/**
 * Sets when the product (/app) is open to members:
 * "auto" opens at launch, "open" opens now, "closed" keeps it shut.
 */
export async function setProductAccess(fd: FormData) {
  await requireAdmin();
  const mode = String(fd.get("mode") ?? "");
  if (!PRODUCT_ACCESS_MODES.includes(mode as ProductAccessMode)) return;
  const db = createAdminClient();
  if (!db) return;
  const { error } = await db
    .from("app_settings")
    .upsert({ key: "product_access", value: mode, updated_at: new Date().toISOString() });
  if (error) console.error("set product access failed", error);
  revalidatePath("/", "layout");
}

/** Gives or removes tester access for one member. Testers can enter /app early. */
export async function setTester(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const tester = fd.get("tester") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const db = createAdminClient();
  if (!db) return;
  const { error } = await db.from("profiles").update({ is_tester: tester }).eq("id", id);
  if (error) console.error("set tester failed", error);
  revalidatePath("/admin");
}

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
