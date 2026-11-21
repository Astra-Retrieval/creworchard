/**
 * Checks the organization, project, and canvas rules.
 * Run with:  node --experimental-strip-types scripts/test-org-rules.ts
 */
import assert from "node:assert/strict";
import { can, canChangeMember, canManageMembers, hasFreeSeat, isOrgPermission, isUuid, seatsLeft, uuidList, type OrgMembership } from "../src/lib/org-rules.ts";
import { effectiveProjectRole, peopleOutsideSubsystems, projectCan, randomSubsystemColor, wouldRemoveLastLead } from "../src/lib/project-rules.ts";
import { connectorPath, nextNodePosition, placeIntegrations } from "../src/lib/canvas-layout.ts";

const owner: OrgMembership = { role: "owner", permissions: [] };
const admin: OrgMembership = { role: "admin", permissions: [] };
const plainMember: OrgMembership = { role: "member", permissions: [] };
const grantedMember: OrgMembership = { role: "member", permissions: ["projects.create"] };
const U = "3f2b8c1e-9a4d-4e5f-8b6a-1c2d3e4f5a6b";

const nodes = [0, 1, 2, 3, 4].map((i) => ({ id: `s${i}`, ...nextNodePosition(i) }));
const spots = placeIntegrations(
  [
    { id: "adjacent", subsystem_ids: ["s0", "s1"] },
    { id: "skips-one", subsystem_ids: ["s0", "s2"] },
    { id: "same-pair", subsystem_ids: ["s0", "s1"] },
    { id: "three", subsystem_ids: ["s0", "s1", "s4"] },
  ],
  nodes,
);

const checks: [string, unknown, unknown][] = [
  // Organization: creating projects.
  ["owner can create projects", can(owner, "projects.create"), true],
  ["admin can create projects", can(admin, "projects.create"), true],
  ["member without the permission cannot", can(plainMember, "projects.create"), false],
  ["member granted the permission can", can(grantedMember, "projects.create"), true],
  ["someone outside the organization cannot", can(null, "projects.create"), false],
  // Organization: managing people.
  ["owner can manage members", canManageMembers(owner), true],
  ["admin can manage members", canManageMembers(admin), true],
  ["granted member cannot manage members", canManageMembers(grantedMember), false],
  ["nobody can change the owner", canChangeMember(owner, owner), false],
  ["admin cannot change the owner", canChangeMember(admin, owner), false],
  ["owner can change an admin", canChangeMember(owner, admin), true],
  ["admin cannot change another admin", canChangeMember(admin, admin), false],
  ["admin can change a member", canChangeMember(admin, plainMember), true],
  ["member cannot change a member", canChangeMember(grantedMember, plainMember), false],
  ["known permission key accepted", isOrgPermission("projects.create"), true],
  ["unknown permission key rejected", isOrgPermission("projects.delete_everything"), false],
  // Seats.
  ["3 of 5 seats used leaves 2", seatsLeft(5, 3), 2],
  ["a full organization has no free seat", hasFreeSeat(5, 5), false],
  ["a seat frees up when someone is removed", hasFreeSeat(5, 4), true],
  ["unlimited seats always have room", hasFreeSeat(null, 9999), true],
  // Project roles.
  ["organization owner leads every project", effectiveProjectRole(owner, null), "lead"],
  ["organization admin leads every project", effectiveProjectRole(admin, "viewer"), "lead"],
  ["member has their project role", effectiveProjectRole(plainMember, "contributor"), "contributor"],
  ["member not on the team sees nothing", effectiveProjectRole(plainMember, null), null],
  ["outsider sees nothing", effectiveProjectRole(null, "lead"), null],
  ["lead manages the team", projectCan("lead", "team.manage"), true],
  ["systems engineer does not manage the team", projectCan("systems_engineer", "team.manage"), false],
  ["systems engineer creates sub-systems", projectCan("systems_engineer", "structure.create"), true],
  ["contributor does not create sub-systems", projectCan("contributor", "structure.create"), false],
  ["contributor edits documents", projectCan("contributor", "content.edit"), true],
  ["viewer edits nothing", projectCan("viewer", "content.edit"), false],
  ["no role, no abilities", projectCan(null, "content.edit"), false],
  ["the only lead is protected", wouldRemoveLastLead([{ user_id: "a", role: "lead" }, { user_id: "b", role: "viewer" }], "a"), true],
  ["one of two leads can step down", wouldRemoveLastLead([{ user_id: "a", role: "lead" }, { user_id: "b", role: "lead" }], "a"), false],
  // Integration people must come from the connected sub-systems.
  ["people from the connected sub-systems are fine", peopleOutsideSubsystems(["p1", "p2"], [{ id: "a", member_ids: ["p1"] }, { id: "b", member_ids: ["p2"] }], ["a", "b"]), []],
  ["someone from an unconnected sub-system is rejected", peopleOutsideSubsystems(["p3"], [{ id: "a", member_ids: ["p1"] }, { id: "c", member_ids: ["p3"] }], ["a"]), ["p3"]],
  // Colors.
  ["first color", randomSubsystemColor(() => 0), "mint"],
  ["last color", randomSubsystemColor(() => 0.9999), "coral"],
  // Canvas placement.
  ["first sub-system position", nextNodePosition(0), { x: 96, y: 120 }],
  ["fifth wraps to row two", nextNodePosition(4), { x: 96, y: 330 }],
  ["integration between neighbours sits in the gap between them", spots.get("adjacent"), { x: 376, y: 166 }],
  ["integration that would cover a sub-system drops below the row", spots.get("skips-one"), { x: 546, y: 271 }],
  ["a second integration on the same pair doesn't overlap the first", spots.get("same-pair"), { x: 376, y: 206 }],
  ["three-way integration is placed", Boolean(spots.get("three")), true],
  // Lines.
  ["square line has only horizontal and vertical segments", connectorPath({ x: 0, y: 0 }, { x: 100, y: 40 }, "square"), "M 0 0 H 50 V 40 H 100"],
  ["square line leaves vertically when the target is mostly below", connectorPath({ x: 0, y: 0 }, { x: 40, y: 100 }, "square"), "M 0 0 V 50 H 40 V 100"],
  ["aligned points get a straight line", connectorPath({ x: 0, y: 0 }, { x: 100, y: 0 }, "square"), "M 0 0 L 100 0"],
  ["curved line is a single curve", connectorPath({ x: 0, y: 0 }, { x: 100, y: 40 }, "curved"), "M 0 0 C 50 0, 50 40, 100 40"],
  // Ids are validated before they reach the database.
  ["uuid accepted", isUuid(U), true],
  ["non-uuid rejected", isUuid("1; drop table projects"), false],
  ["id lists drop junk and duplicates", uuidList([U, U, "nope", 7]), [U]],
];

for (const [name, got, expected] of checks) {
  assert.deepEqual(got, expected, name);
  console.log(`  ok  ${name}`);
}
console.log(`\n${checks.length}/${checks.length} organization, project, and canvas rule cases pass`);
