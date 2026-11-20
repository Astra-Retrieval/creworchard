import type { Metadata } from "next";
import Link from "next/link";
import { ORG_PERMISSIONS, can, canManageMembers, wouldRemoveLastAdmin } from "@/lib/org-rules";
import { listMembers, listProjects, requireOrg } from "@/lib/orgs";
import { NameForm } from "@/components/workspace/NameForm";
import { addMember, createProject, removeMember, setMemberPermission, setMemberRole } from "../../actions";

export const metadata: Metadata = { title: "Organization" };

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const smallBtn = { padding: "6px 14px", fontSize: 13 } as const;

/**
 * The organization dashboard: its projects, and the people in it. Members
 * with the "Create projects" permission (and every admin) can start a
 * project; only admins can manage people and permissions.
 */
export default async function OrganizationDashboard({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { org, membership, userId } = await requireOrg(orgId);
  const [projects, members] = await Promise.all([listProjects(orgId), listMembers(orgId)]);

  const mayCreate = can(membership, "projects.create");
  const mayManage = canManageMembers(membership);

  return (
    <>
      <section className="section-tight">
        <div className="container">
          <div className="admin-head" style={{ alignItems: "center" }}>
            <div>
              <p className="eyebrow">Organization</p>
              <h1 style={{ margin: 0, overflowWrap: "anywhere" }}>{org.name}</h1>
            </div>
            <span className={`pill ${membership.role === "admin" ? "pill-mint" : "pill-blue"}`}>
              {membership.role === "admin" ? "Admin" : "Member"}
            </span>
          </div>
        </div>
      </section>

      <section className="section-tight" id="projects">
        <div className="container">
          <div className="admin-head">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>01 · Projects</p>
              <h2 style={{ margin: "8px 0 0" }}>Projects</h2>
            </div>
          </div>

          <div className="grid grid-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/app/org/${orgId}/project/${p.id}`} className="card card-link">
                <p className="eyebrow">Created {fmtDate(p.created_at)}</p>
                <h3 style={{ overflowWrap: "anywhere" }}>{p.name}</h3>
                <p>Open project →</p>
              </Link>
            ))}

            {mayCreate ? (
              <div className="card">
                <p className="eyebrow">New project</p>
                <NameForm
                  action={createProject.bind(null, orgId)}
                  label="Project name"
                  submitLabel="Create project"
                  pendingLabel="Creating…"
                />
              </div>
            ) : (
              <div className="card">
                <p className="eyebrow">New project</p>
                <p>
                  You don&apos;t have permission to create projects in this organization. An admin can
                  grant it to you from this page.
                </p>
              </div>
            )}
          </div>
          {projects.length === 0 && !mayCreate && (
            <p className="muted" style={{ marginTop: 20 }}>No projects yet.</p>
          )}
        </div>
      </section>

      <section className="section-tight" id="members">
        <div className="container">
          <div className="admin-head">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>02 · People</p>
              <h2 style={{ margin: "8px 0 0" }}>Members and permissions</h2>
            </div>
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
                  const isAdmin = m.role === "admin";
                  const lastAdmin = wouldRemoveLastAdmin(members, m.user_id);
                  return (
                    <tr key={m.user_id}>
                      <td>
                        {m.full_name || <span className="muted">No name</span>}
                        {m.user_id === userId && <span className="muted"> (you)</span>}
                      </td>
                      <td>{m.email}</td>
                      <td><span className={`pill ${isAdmin ? "pill-mint" : "pill-blue"}`}>{isAdmin ? "Admin" : "Member"}</span></td>
                      {ORG_PERMISSIONS.map((p) => {
                        const granted = can(m, p.key);
                        return (
                          <td key={p.key}>
                            {isAdmin || !mayManage ? (
                              <span className={granted ? "" : "muted"}>
                                {granted ? "Yes" : "No"}
                                {isAdmin && <span className="muted"> · all permissions</span>}
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
                          {lastAdmin ? (
                            <span className="muted">Only admin</span>
                          ) : (
                            <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                              <form action={setMemberRole.bind(null, orgId)}>
                                <input type="hidden" name="user_id" value={m.user_id} />
                                <input type="hidden" name="role" value={isAdmin ? "member" : "admin"} />
                                <button className="btn btn-ghost" style={smallBtn}>
                                  {isAdmin ? "Make member" : "Make admin"}
                                </button>
                              </form>
                              <form action={removeMember.bind(null, orgId)}>
                                <input type="hidden" name="user_id" value={m.user_id} />
                                <button className="btn btn-danger" style={smallBtn}>Remove</button>
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
              <p className="eyebrow">Add a member</p>
              <NameForm
                action={addMember.bind(null, orgId)}
                label="Their account email"
                name="email"
                type="email"
                placeholder="teammate@example.com"
                submitLabel="Add member"
                pendingLabel="Adding…"
                hint="They need a Crew Orchard account already. New members start with no permissions."
                inline
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
