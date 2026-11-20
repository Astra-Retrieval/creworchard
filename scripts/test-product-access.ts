/**
 * Checks the product access rule against every kind of person and situation.
 * Run with:  node --experimental-strip-types scripts/test-product-access.ts
 */
import assert from "node:assert/strict";
import { decideAccess, type AccessProfile, type ProductAccessMode } from "../src/lib/product-access-rules.ts";

const LAUNCH = Date.parse("2027-01-01T00:00:00Z");
const BEFORE = LAUNCH - 1000;
const AFTER = LAUNCH + 1000;

const admin: AccessProfile = { role: "admin", is_tester: false, subscription_status: null };
const tester: AccessProfile = { role: "member", is_tester: true, subscription_status: null };
const trialing: AccessProfile = { role: "member", is_tester: false, subscription_status: "trialing" };
const active: AccessProfile = { role: "member", is_tester: false, subscription_status: "active" };
const pastDue: AccessProfile = { role: "member", is_tester: false, subscription_status: "past_due" };
const canceled: AccessProfile = { role: "member", is_tester: false, subscription_status: "canceled" };
const noCard: AccessProfile = { role: "member", is_tester: false, subscription_status: null };

type Case = [string, AccessProfile | null, boolean, ProductAccessMode, number, string];
const cases: Case[] = [
  // Before launch, automatic: only admins and testers.
  ["admin, before launch", admin, true, "auto", BEFORE, "allowed:admin"],
  ["tester, before launch", tester, true, "auto", BEFORE, "allowed:tester"],
  ["paid member, before launch", active, true, "auto", BEFORE, "not_found"],
  ["early bird (trialing), before launch", trialing, true, "auto", BEFORE, "not_found"],
  ["visitor, before launch", null, false, "auto", BEFORE, "not_found"],
  // After launch, automatic: active subscriptions get in.
  ["active member, after launch", active, true, "auto", AFTER, "allowed:member"],
  ["early bird (trialing), after launch", trialing, true, "auto", AFTER, "allowed:member"],
  ["past-due member, after launch", pastDue, true, "auto", AFTER, "inactive"],
  ["canceled member, after launch", canceled, true, "auto", AFTER, "inactive"],
  ["no card saved, after launch", noCard, true, "auto", AFTER, "inactive"],
  ["visitor, after launch", null, false, "auto", AFTER, "sign_in"],
  // Manual overrides.
  ["active member, opened early", active, true, "open", BEFORE, "allowed:member"],
  ["active member, kept closed after launch", active, true, "closed", AFTER, "not_found"],
  ["admin, kept closed after launch", admin, true, "closed", AFTER, "allowed:admin"],
  ["tester, kept closed after launch", tester, true, "closed", AFTER, "allowed:tester"],
];

let passed = 0;
for (const [name, profile, signedIn, mode, now, expected] of cases) {
  const r = decideAccess(profile, signedIn, mode, now, LAUNCH);
  const got = r.allowed ? `allowed:${r.reason}` : r.next;
  assert.equal(got, expected, `${name}: expected ${expected}, got ${got}`);
  passed++;
  console.log(`  ok  ${name.padEnd(42)} -> ${got}`);
}
console.log(`\n${passed}/${cases.length} access cases pass`);
