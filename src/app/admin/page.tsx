import type { Metadata } from "next";
import { loadAdminData, requireAdmin } from "@/lib/admin-data";
import { EARLY_BIRD } from "@/lib/site";
import { setMessageHandled } from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });

export default async function AdminPage() {
  await requireAdmin();
  const data = await loadAdminData();

  if (!data) {
    return (
      <section className="section">
        <div className="container">
          <h1>Admin</h1>
          <div className="notice notice-info">Set SUPABASE_SECRET_KEY to load sign-ups.</div>
        </div>
      </section>
    );
  }

  const { waitlist, members, messages } = data;
  const unread = messages.filter((m) => !m.handled_at).length;
  const reserved = members.filter((m) => m.subscription_status === "trialing" || m.subscription_status === "active");
  const reservedSeats = reserved.reduce((n, m) => n + m.seats, 0);
  const waitlistSeats = waitlist.reduce((n, w) => n + w.seats, 0);

  const stats = [
    { label: "Early-bird accounts", value: members.length },
    { label: "Seats reserved (card saved)", value: reservedSeats },
    { label: "Launch MRR, early bird", value: `$${(reservedSeats * EARLY_BIRD.price).toLocaleString()}` },
    { label: "On the waitlist", value: waitlist.length },
    { label: "Waitlist seats", value: waitlistSeats },
    { label: "Unread messages", value: unread },
  ];

  return (
    <>
      <section className="section-tight">
        <div className="container">
          <p className="eyebrow">Admin · Sign-ups</p>
          <h1>Sign-ups</h1>
          <div className="grid grid-4" style={{ marginTop: 32, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))" }}>
            {stats.map((s) => (
              <div className="stat" key={s.label}>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight" id="messages">
        <div className="container">
          <div className="admin-head">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>00 · Contact</p>
              <h2 style={{ margin: "8px 0 0" }}>Messages{unread ? ` (${unread} unread)` : ""}</h2>
            </div>
            <a href="/admin/export/messages" className="btn btn-ghost">Download CSV</a>
          </div>
          {messages.length === 0 ? (
            <div className="table-wrap"><div className="table-empty">No messages yet.</div></div>
          ) : (
            <div className="grid" style={{ gap: 14 }}>
              {messages.map((m) => (
                <article key={m.id} className="card message" style={{ opacity: m.handled_at ? 0.6 : 1, padding: 22 }}>
                  <div className="admin-head" style={{ marginBottom: 10, alignItems: "center" }}>
                    <div className="row" style={{ gap: 10 }}>
                      <strong>{m.name}</strong>
                      <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your Crew Orchard message")}`} style={{ color: "var(--mint)" }}>{m.email}</a>
                      <span className="pill pill-blue">{m.topic}</span>
                      {m.user_id && <span className="pill pill-mint">member</span>}
                    </div>
                    <div className="row" style={{ gap: 10 }}>
                      <span className="muted small">{fmtDateTime(m.created_at)}</span>
                      <form action={setMessageHandled}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="handled" value={m.handled_at ? "false" : "true"} />
                        <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 13 }}>
                          {m.handled_at ? "Reopen" : "Mark handled"}
                        </button>
                      </form>
                    </div>
                  </div>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "var(--starlight)" }}>{m.message}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <div className="admin-head">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>01 · Early bird</p>
              <h2 style={{ margin: "8px 0 0" }}>Early-bird members</h2>
            </div>
            <a href="/admin/export/members" className="btn btn-ghost">Download CSV</a>
          </div>
          <div className="table-wrap">
            {members.length === 0 ? (
              <div className="table-empty">No early-bird accounts yet.</div>
            ) : (
              <table>
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Organization</th><th>Seats</th><th>Status</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="num">{m.member_number}</td>
                      <td>{m.full_name ?? "—"}</td>
                      <td>{m.email}</td>
                      <td>{m.organization ?? "—"}</td>
                      <td className="num">{m.seats}</td>
                      <td>
                        <span className={`pill ${m.subscription_status === "trialing" || m.subscription_status === "active" ? "pill-mint" : "pill-gold"}`}>
                          {m.subscription_status ?? "no card"}
                        </span>
                      </td>
                      <td>{fmtDate(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <div className="admin-head">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>02 · Waitlist</p>
              <h2 style={{ margin: "8px 0 0" }}>Waitlist</h2>
            </div>
            <a href="/admin/export/waitlist" className="btn btn-ghost">Download CSV</a>
          </div>
          <div className="table-wrap">
            {waitlist.length === 0 ? (
              <div className="table-empty">Nobody on the waitlist yet.</div>
            ) : (
              <table>
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Organization</th><th>Use</th><th>Seats</th><th>Notes</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {waitlist.map((w) => (
                    <tr key={w.id}>
                      <td>{w.full_name}</td>
                      <td>{w.email}</td>
                      <td>{w.organization ?? "—"}</td>
                      <td><span className="pill pill-blue">{w.use_case}</span></td>
                      <td className="num">{w.seats}</td>
                      <td style={{ whiteSpace: "normal", minWidth: 220, color: "var(--dust)" }}>{w.notes ?? "—"}</td>
                      <td>{fmtDate(w.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
