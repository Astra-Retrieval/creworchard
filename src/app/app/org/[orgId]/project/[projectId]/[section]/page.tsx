import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROJECT_ROLES, PROJECT_SECTIONS, projectRoleLabel, wouldRemoveLastLead } from "@/lib/project-rules";
import { listMembers, listProjectBom, listProjectTeam, loadStructure, requireProject } from "@/lib/orgs";
import { AddToTeamForm } from "@/components/workspace/AddToTeamForm";
import { removeProjectMember, setProjectMemberRole, addProjectMember } from "../../../../../actions";

type Params = Promise<{ orgId: string; projectId: string; section: string }>;
const findSection = (slug: string) => PROJECT_SECTIONS.find((s) => s.slug === slug);
const smallBtn = { padding: "6px 14px", fontSize: 13 } as const;
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const qty = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 3 });

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { section } = await params;
  return { title: findSection(section)?.label };
}

/**
 * One of a project's left-hand tabs. The list lives in PROJECT_SECTIONS.
 * (Documents has its own folder, ../documents, because documents open inside it.)
 */
export default async function ProjectSectionPage({ params }: { params: Params }) {
  const { orgId, projectId, section: slug } = await params;
  const section = findSection(slug);
  if (!section) notFound();
  const ctx = await requireProject(orgId, projectId);

  if (section.slug === "team") return <TeamTab orgId={orgId} projectId={projectId} />;
  if (section.slug === "bom") return <BomTab orgId={orgId} projectId={projectId} />;

  const blurb = section.slug === "requirements"
    ? "What the system must do, for the whole project and for each sub-system."
    : "The limits the design has to live within: mass, power, cost, schedule.";
  return (
    <div className="ws-section">
      <p className="eyebrow">{ctx.project.name}</p>
      <h1>{section.label}</h1>
      <p className="lede">{blurb}</p>
      <div className="ws-section-empty">Nothing here yet.</div>
    </div>
  );
}

/** Who is on the project and what they can do. The lead adds people from the organization. */
async function TeamTab({ orgId, projectId }: { orgId: string; projectId: string }) {
  const { project, abilities, userId } = await requireProject(orgId, projectId);
  const [team, orgMembers] = await Promise.all([listProjectTeam(orgId, projectId), listMembers(orgId)]);
  const candidates = orgMembers.filter((m) => !team.some((t) => t.user_id === m.user_id));

  return (
    <div className="ws-section ws-section-wide">
      <p className="eyebrow">{project.name}</p>
      <h1>Team</h1>
      <p className="lede">
        The project lead adds people from the organization and gives each a role. The
        organization&apos;s owner and admins can always open the project and act as a lead.
      </p>

      <div className="ws-roles">
        {PROJECT_ROLES.map((r) => (
          <div key={r.key}><strong>{r.label}</strong><span>{r.blurb}</span></div>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th>{abilities.manageTeam && <th>Manage</th>}</tr>
          </thead>
          <tbody>
            {team.length === 0 && (
              <tr><td colSpan={abilities.manageTeam ? 4 : 3} className="muted" style={{ textAlign: "center", padding: 24 }}>Nobody is on this project yet.</td></tr>
            )}
            {team.map((m) => {
              const lastLead = wouldRemoveLastLead(team, m.user_id);
              return (
                <tr key={m.user_id}>
                  <td>
                    {m.full_name || <span className="muted">No name</span>}
                    {m.user_id === userId && <span className="muted"> (you)</span>}
                  </td>
                  <td><a href={`mailto:${m.email}`} style={{ color: "var(--mint)" }}>{m.email}</a></td>
                  <td>
                    {abilities.manageTeam && !lastLead ? (
                      <form action={setProjectMemberRole.bind(null, orgId, projectId)} className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                        <input type="hidden" name="user_id" value={m.user_id} />
                        <label className="sr-only" htmlFor={`role-${m.user_id}`}>Role for {m.full_name || m.email}</label>
                        <select id={`role-${m.user_id}`} name="role" defaultValue={m.role} style={{ padding: "6px 36px 6px 12px", fontSize: 14, width: "auto" }}>
                          {PROJECT_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                        </select>
                        <button className="btn btn-ghost" style={smallBtn}>Save</button>
                      </form>
                    ) : (
                      <span className={`pill ${m.role === "lead" ? "pill-mint" : "pill-blue"}`}>{projectRoleLabel(m.role)}</span>
                    )}
                  </td>
                  {abilities.manageTeam && (
                    <td>
                      {lastLead ? <span className="muted">Only lead</span> : (
                        <form action={removeProjectMember.bind(null, orgId, projectId)}>
                          <input type="hidden" name="user_id" value={m.user_id} />
                          <button className="btn btn-danger" style={smallBtn}>Remove</button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {abilities.manageTeam && (
        <div className="card" style={{ marginTop: 20, maxWidth: 720 }}>
          <p className="eyebrow">Add someone from the organization</p>
          <AddToTeamForm
            action={addProjectMember.bind(null, orgId, projectId)}
            candidates={candidates.map((c) => ({ user_id: c.user_id, label: c.full_name ? `${c.full_name} (${c.email})` : c.email }))}
          />
        </div>
      )}
    </div>
  );
}

/** The project bill of materials: every sub-system's lines, with subtotals and a grand total. */
async function BomTab({ orgId, projectId }: { orgId: string; projectId: string }) {
  const { project, db } = await requireProject(orgId, projectId);
  const [items, structure] = await Promise.all([listProjectBom(orgId, projectId), loadStructure(db, projectId)]);
  const total = (list: typeof items) => list.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);

  return (
    <div className="ws-section ws-section-wide">
      <p className="eyebrow">{project.name}</p>
      <h1>Bill of materials</h1>
      <p className="lede">
        The project BoM is built from each sub-system&apos;s BoM. To add or change parts, select a
        sub-system on the canvas and open its bill of materials.
      </p>
      {structure.subsystems.length === 0 ? (
        <div className="ws-section-empty">No sub-systems yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Part no.</th><th>Description</th><th>Qty</th><th>Unit cost</th><th>Line total</th></tr>
            </thead>
            {structure.subsystems.map((s) => {
              const lines = items.filter((i) => i.subsystem_id === s.id);
              return (
                <tbody key={s.id}>
                  <tr className="ws-bom-group">
                    <td colSpan={4}><span className={`ws-dot ws-color-${s.color}`} aria-hidden="true" /> {s.name}</td>
                    <td className="num">{money(total(lines))}</td>
                  </tr>
                  {lines.length === 0 && <tr><td colSpan={5} className="muted">No parts yet.</td></tr>}
                  {lines.map((i) => (
                    <tr key={i.id}>
                      <td className="mono">{i.part_number || "—"}</td>
                      <td style={{ whiteSpace: "normal", minWidth: 200 }}>{i.description}</td>
                      <td className="num">{qty(i.quantity)}</td>
                      <td className="num">{money(i.unit_cost)}</td>
                      <td className="num">{money(i.quantity * i.unit_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
            <tfoot>
              <tr><td colSpan={4} className="ws-bom-total-label">Project total</td><td className="num ws-bom-total">{money(total(items))}</td></tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
