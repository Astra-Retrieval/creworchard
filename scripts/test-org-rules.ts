/**
 * Checks the organization permission rules.
 * Run with:  node --experimental-strip-types scripts/test-org-rules.ts
 */
import assert from "node:assert/strict";
import {
  can,
  canManageMembers,
  findProjectSection,
  isOrgPermission,
  isUuid,
  nextNodePosition,
  wouldRemoveLastAdmin,
  type OrgMembership,
} from "../src/lib/org-rules.ts";

const admin: OrgMembership = { role: "admin", permissions: [] };
const plainMember: OrgMembership = { role: "member", permissions: [] };
const grantedMember: OrgMembership = { role: "member", permissions: ["projects.create"] };

const checks: [string, unknown, unknown][] = [
  // Creating projects: admins always, members only when granted, outsiders never.
  ["admin can create projects", can(admin, "projects.create"), true],
  ["member without the permission cannot", can(plainMember, "projects.create"), false],
  ["member granted the permission can", can(grantedMember, "projects.create"), true],
  ["someone outside the organization cannot", can(null, "projects.create"), false],
  // Managing members is admin-only and cannot be granted.
  ["admin can manage members", canManageMembers(admin), true],
  ["granted member cannot manage members", canManageMembers(grantedMember), false],
  ["outsider cannot manage members", canManageMembers(undefined), false],
  // Permission keys coming from a form are checked against the known list.
  ["known permission key accepted", isOrgPermission("projects.create"), true],
  ["unknown permission key rejected", isOrgPermission("projects.delete_everything"), false],
  // An organization always keeps one admin.
  ["sole admin is protected", wouldRemoveLastAdmin([{ user_id: "a", role: "admin" }, { user_id: "b", role: "member" }], "a"), true],
  ["one of two admins can step down", wouldRemoveLastAdmin([{ user_id: "a", role: "admin" }, { user_id: "b", role: "admin" }], "a"), false],
  ["removing a member never trips it", wouldRemoveLastAdmin([{ user_id: "a", role: "admin" }, { user_id: "b", role: "member" }], "b"), false],
  // Project tabs.
  ["documents tab exists", findProjectSection("documents")?.label, "Documents"],
  ["unknown tab is not found", findProjectSection("secrets"), null],
  // Canvas placement: four to a row, never overlapping.
  ["first sub-system position", nextNodePosition(0), { x: 96, y: 120 }],
  ["fourth sits at the end of row one", nextNodePosition(3), { x: 1116, y: 120 }],
  ["fifth wraps to row two", nextNodePosition(4), { x: 96, y: 310 }],
  // Ids from the URL are validated before they reach the database.
  ["uuid accepted", isUuid("3f2b8c1e-9a4d-4e5f-8b6a-1c2d3e4f5a6b"), true],
  ["non-uuid rejected", isUuid("1; drop table projects"), false],
];

for (const [name, got, expected] of checks) {
  assert.deepEqual(got, expected, name);
  console.log(`  ok  ${name}`);
}
console.log(`\n${checks.length}/${checks.length} organization rule cases pass`);
