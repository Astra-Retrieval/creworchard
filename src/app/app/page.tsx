import { getSession } from "@/lib/auth";
import { firstNameOf } from "@/lib/names";

/**
 * The product's home screen. This is the starting point to build Crew Orchard
 * on: anything here is only visible to people the /app layout lets in.
 */
export default async function ProductHome() {
  const session = await getSession();
  const firstName = firstNameOf(session?.profile?.full_name);

  return (
    <section className="section-tight">
      <div className="container stack">
        <div>
          <p className="eyebrow">Crew Orchard · Workspace</p>
          <h1>{firstName ? `Welcome, ${firstName}` : "Welcome"}</h1>
          <p className="lede">
            This is the Crew Orchard workspace. The product gets built here, and everything you create
            is saved to your account just as it will be for members.
          </p>
        </div>

        <div className="grid grid-3">
          {[
            { label: "01 · Projects", title: "Your projects", body: "Nothing here yet. Projects will appear as the product is built." },
            { label: "02 · Crew", title: "Your crew", body: "Invite teammates to seats once crew management is built." },
            { label: "03 · Integrations", title: "Connected tools", body: "Connect the tools you already use. Coming as the roadmap lands." },
          ].map((c) => (
            <article key={c.title} className="card">
              <p className="eyebrow">{c.label}</p>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
