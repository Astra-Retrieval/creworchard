import Link from "next/link";
import { redirect } from "next/navigation";
import { firstNameOf } from "@/lib/names";
import { listMyOrganizations, requireProductUser } from "@/lib/orgs";
import { NameForm } from "@/components/workspace/NameForm";
import { createOrganization } from "./actions";

/**
 * Where signing in lands. It sends you straight to your organization's
 * dashboard; if you belong to several you choose one, and if you belong to
 * none you create the first.
 */
export default async function ProductHome() {
  const { session } = await requireProductUser();
  const organizations = await listMyOrganizations();
  if (organizations.length === 1) redirect(`/app/org/${organizations[0].id}`);

  const firstName = firstNameOf(session.profile?.full_name);

  if (organizations.length === 0) {
    return (
      <section className="section-tight">
        <div className="container stack" style={{ maxWidth: 640 }}>
          <div>
            <p className="eyebrow">Crew Orchard · Get started</p>
            <h1>{firstName ? `Welcome, ${firstName}` : "Welcome"}</h1>
            <p className="lede">
              Everything in Crew Orchard lives inside an organization. Create yours to start your first
              project. If your team already has one, ask an admin there to add you instead.
            </p>
          </div>
          <div className="card">
            <NameForm
              action={createOrganization}
              label="Organization name"
              defaultValue={session.profile?.organization ?? ""}
              submitLabel="Create organization"
              pendingLabel="Creating…"
              hint="You'll own it, with every permission and its seats to assign."
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-tight">
      <div className="container stack">
        <div>
          <p className="eyebrow">Crew Orchard · Organizations</p>
          <h1>Choose an organization</h1>
        </div>
        <div className="grid grid-3">
          {organizations.map((org) => (
            <Link key={org.id} href={`/app/org/${org.id}`} className="card card-link">
              <p className="eyebrow">{org.role === "owner" ? "Owner" : org.role === "admin" ? "Admin" : "Member"}</p>
              <h3>{org.name}</h3>
              <p>Open dashboard →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
