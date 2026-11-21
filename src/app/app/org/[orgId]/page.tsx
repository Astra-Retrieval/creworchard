import type { Metadata } from "next";
import Link from "next/link";
import { ORG_PERMISSIONS, ORG_ROLE_LABELS, can, canChangeMember, canManageMembers, isOrgManager, seatsLeft } from "@/lib/org-rules";
import { projectRoleLabel } from "@/lib/project-rules";
import { listMembers, listProjects, loadSeatLimit, requireOrg } from "@/lib/orgs";
import { NameForm } from "@/components/workspace/NameForm";
import { addMember, createProject, removeMember, setMemberPermission, setMemberRole } from "../../actions";

export const metadata: Metadata = { title: "Organization" };

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const smallBtn = { padding: "6px 14px", fontSize: 13 } as const;
const rolePill = { owner: "pill-gold", admin: "pill-mint", member: "pill-blue" } as const;

/**
 * The organization dashboard. The owner and admins see every project;
 * everyone else sees the projects they've been added to. People with the
 * "Create projects" permission can start one. The owner and admins assign
 * and unassign seats.
 */
export default async function OrganizationDashboard({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { org, membership, userId, db } = await requireOrg(orgId);
  const [projects, members, seatLimit] = await Promise.all([listProjects(orgId), listMembers(orgId), loadSeatLimit(db, orgId)]);

  const seesAll = isOrgManager(membership);
  const mayCreate = can(membership, "projects.create");
  const mayManage = canManageMembers(membership);
  const free = seatsLeft(seatLimit, members.length);

  return (
    <>
      <section className="section-tight">
        <div className="container">
          <div className="admin-head" style={{ alignItems: "center" }}>
            <div>
              <p className="eyebrow">Organization</p>
              <h1 style={{ margin: 0, overflowWrap: "anywhere" }}>{org.name}</h1>
            </div>
            <span className={`pill ${rolePill[membership.role]}`}>{ORG_ROLE_LABELS[membership.role]}</span>
          </div>
        </div>
      </section>

      <section className="section-tight" id="projects">
        <div className="container">
          <div className="admin-head">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>01 · Projects</p>
              <h2 style={{ margin: "8px 0 0" }}>{seesAll ? "All projects" : "Your projects"}</h2>
            </div>
          </div>

          <div className="grid grid-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/app/org/${orgId}/project/${p.id}`} className="card card-link">
                <p className="eyebrow">{projectRoleLabel(p.role)} · {fmtDate(p.created_at)}</p>
                <h3 style={{ overflowWrap: "anywhere" }}>{p.name}</h3>
                <p>Open project →</p>
              </Link>
            ))}

            {mayCreate && (
              <div className="card">
                <p className="eyebrow">New project</p>
                <NameForm
                  action={createProject.bind(null, orgId)}
                  label="Project name"
                  submitLabel="Create project"
                  pendingLabel="Creating…"
                  hint="You'll be its project lead."
                />
              </div>
            )}

            {projects.length === 0 && !mayCreate && (
              <div className="card">
                <p className="eyebrow">Nothing yet</p>
                <p>You haven&apos;t been added to a project. A project lead can add you from the project&apos;s Team tab.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section-tight" id="members">
        <div className="container">
          <div className="admin-head">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>02 · People</p>
              <h2 style={{ margin: "8px 0 0" }}>Seats and permissions</h2>
            </div>
            <span className="pill pill-dust">
              {seatLimit === null ? `${members.length} seats assigned · unlimited` : `${members.length} of ${seatLimit} seats assigned`}
            </span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  {ORG_PERMISSIONS.map((p) => <th key={p.key}>{p.label}</th>)}
                  {mayManage && <th>Manage</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const changeable = canChangeMember(membership, m);
                  return (
                    <tr key={m.user_id}>
                      <td>
                        {m.full_name || <span className="muted">No name</span>}
                        {m.user_id === userId && <span className="muted"> (you)</span>}
                      </td>
                      <td>{m.email}</td>
                      <td><span className={`pill ${rolePill[m.role]}`}>{ORG_ROLE_LABELS[m.role]}</span></td>
                      {ORG_PERMISSIONS.map((p) => {
                        const granted = can(m, p.key);
                        return (
                          <td key={p.key}>
                            {m.role !== "member" || !changeable ? (
                              <span className={granted ? "" : "muted"}>
                                {granted ? "Yes" : "No"}
                                {m.role !== "member" && <span className="muted"> · all permissions</span>}
                              </span>
                            ) : (
                              <form action={setMemberPermission.bind(null, orgId)}>
                                <input type="hidden" name="user_id" value={m.user_id} />
                                <input type="hidden" name="permission" value={p.key} />
                                <input type="hidden" name="granted" value={granted ? "false" : "true"} />
                                <button
                                  className={`btn ${granted ? "btn-primary" : "btn-ghost"}`}
                                  style={smallBtn}
                                  aria-pressed={granted}
                                  aria-label={`${p.label} for ${m.full_name || m.email}`}
                                >
                                  {granted ? "Allowed" : "Not allowed"}
                                </button>
                              </form>
                            )}
                          </td>
                        );
                      })}
                      {mayManage && (
                        <td>
                          {!changeable ? (
                            <span className="muted">{m.role === "owner" ? "Owns the organization" : "Owner only"}</span>
                          ) : (
                            <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                              {(m.role === "admin" || membership.role === "owner") && (
                                <form action={setMemberRole.bind(null, orgId)}>
                                  <input type="hidden" name="user_id" value={m.user_id} />
                                  <input type="hidden" name="role" value={m.role === "admin" ? "member" : "admin"} />
                                  <button className="btn btn-ghost" style={smallBtn}>
                                    {m.role === "admin" ? "Make member" : "Make admin"}
                                  </button>
                                </form>
                              )}
                              <form action={removeMember.bind(null, orgId)}>
                                <input type="hidden" name="user_id" value={m.user_id} />
                                <button className="btn btn-danger" style={smallBtn}>Unassign seat</button>
                              </form>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {mayManage && (
            <div className="card" style={{ marginTop: 20, maxWidth: 640 }}>
              <p className="eyebrow">Assign a seat</p>
              {free === 0 ? (
                <p>
                  All {seatLimit} seats are assigned. Unassign one above to free it up, or add seats to
                  the owner&apos;s plan.
                </p>
              ) : (
                <NameForm
                  action={addMember.bind(null, orgId)}
                  label="Their account email"
                  name="email"
                  type="email"
                  placeholder="teammate@example.com"
                  submitLabel="Assign seat"
                  pendingLabel="Assigning…"
                  hint={`They need a Crew Orchard account already. ${free === null ? "" : `${free} ${free === 1 ? "seat" : "seats"} free. `}New members start with no permissions and see only the projects they're added to.`}
                  inline
                />
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
