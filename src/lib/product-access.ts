import "server-only";
import type { Profile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LAUNCH_DATE } from "@/lib/site";
import {
  PRODUCT_ACCESS_MODES,
  decideAccess,
  isOpenAt,
  type ProductAccess,
  type ProductAccessMode,
} from "@/lib/product-access-rules";

/**
 * Who can enter the product area (/app). The rule itself lives in
 * product-access-rules.ts; this file adds the stored setting and launch date.
 *
 * "Open" follows the product_access setting (app_settings table):
 *   auto    opens automatically at launch (LAUNCH_DATE, Jan 1 2027 00:00 UTC)
 *   open    open now (manual override from /admin)
 *   closed  closed even after launch (manual override, e.g. an emergency)
 */

export { PRODUCT_ACCESS_MODES, type ProductAccess, type ProductAccessMode };

export async function getProductAccessMode(): Promise<ProductAccessMode> {
  const db = createAdminClient();
  if (!db) return "auto";
  const { data } = await db.from("app_settings").select("value").eq("key", "product_access").maybeSingle();
  const value = data?.value;
  return PRODUCT_ACCESS_MODES.includes(value as ProductAccessMode) ? (value as ProductAccessMode) : "auto";
}

export function isProductOpen(mode: ProductAccessMode, now: number = Date.now()): boolean {
  return isOpenAt(mode, now, LAUNCH_DATE.getTime());
}

export function decideProductAccess(
  profile: Pick<Profile, "role" | "is_tester" | "subscription_status"> | null | undefined,
  signedIn: boolean,
  mode: ProductAccessMode,
  now: number = Date.now(),
): ProductAccess {
  return decideAccess(profile, signedIn, mode, now, LAUNCH_DATE.getTime());
}
