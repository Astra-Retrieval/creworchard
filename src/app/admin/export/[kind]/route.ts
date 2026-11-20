import { NextResponse } from "next/server";
import { loadAdminData, requireAdmin } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

function csvCell(v: unknown) {
  let s = v == null ? "" : String(v);
  // Neutralize spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(rows: Record<string, unknown>[], cols: string[]) {
  return [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
}

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  await requireAdmin();
  const { kind } = await params;
  const data = await loadAdminData();
  if (!data) return new NextResponse("Not configured", { status: 503 });

  let csv: string;
  if (kind === "waitlist") {
    csv = toCsv(data.waitlist as unknown as Record<string, unknown>[], ["full_name", "email", "organization", "use_case", "seats", "notes", "created_at"]);
  } else if (kind === "members") {
    csv = toCsv(data.members as unknown as Record<string, unknown>[], ["member_number", "full_name", "email", "organization", "seats", "subscription_status", "stripe_customer_id", "created_at"]);
  } else {
    return new NextResponse("Not found", { status: 404 });
  }

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="crew-orchard-${kind}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
