/**
 * The pure "who gets into the product" rule, with no database or framework
 * imports so it can be tested on its own (scripts/test-product-access.ts).
 * src/lib/product-access.ts wraps it with the stored setting and launch date.
 *
 *   Admins   always
 *   Testers  always
 *   Members  once the product is open, and only with an active subscription
 *   Others   never; before opening, /app answers "page not found"
 */

export type ProductAccessMode = "auto" | "open" | "closed";
export const PRODUCT_ACCESS_MODES: ProductAccessMode[] = ["auto", "open", "closed"];

/**
 * Subscription states that count as "active". trialing is included because at
 * launch the trial ends and Stripe moves it to active within moments; members
 * shouldn't be locked out while that webhook lands.
 */
export const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export interface AccessProfile {
  role: "member" | "admin";
  is_tester: boolean;
  subscription_status: string | null;
}

export type ProductAccess =
  | { allowed: true; reason: "admin" | "tester" | "member" }
  | { allowed: false; next: "not_found" | "sign_in" | "inactive" };

/** "auto" opens at launch; "open" and "closed" are manual overrides. */
export function isOpenAt(mode: ProductAccessMode, now: number, launchMs: number): boolean {
  if (mode === "open") return true;
  if (mode === "closed") return false;
  return now >= launchMs;
}

export function decideAccess(
  profile: AccessProfile | null | undefined,
  signedIn: boolean,
  mode: ProductAccessMode,
  now: number,
  launchMs: number,
): ProductAccess {
  if (profile?.role === "admin") return { allowed: true, reason: "admin" };
  if (profile?.is_tester) return { allowed: true, reason: "tester" };
  if (!isOpenAt(mode, now, launchMs)) return { allowed: false, next: "not_found" };
  if (!signedIn) return { allowed: false, next: "sign_in" };
  if (profile && ACTIVE_STATUSES.has(profile.subscription_status ?? "")) return { allowed: true, reason: "member" };
  return { allowed: false, next: "inactive" };
}
