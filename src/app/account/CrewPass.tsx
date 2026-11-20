import { EditName } from "./EditName";
import { LogoMark } from "@/components/Logo";

/**
 * Boarding-pass style card on /account: the member's name (editable), their
 * seat details, and a tear-off stub with the member number and a decorative
 * barcode derived from it.
 */
export function CrewPass({
  name,
  email,
  memberNumber,
  seats,
  rate,
  boarding,
  status,
  reserved,
  planLabel,
}: {
  name: string | null;
  email: string;
  memberNumber: number | null;
  seats: number;
  rate: string;
  boarding: string;
  status: string;
  reserved: boolean;
  planLabel: string;
}) {
  const memberNo = memberNumber ? String(memberNumber).padStart(4, "0") : "----";
  const code = `CO-${memberNo}`;

  return (
    <article className="crew-pass" aria-label="Crew pass">
      <div className="crew-pass-main">
        <div className="crew-pass-head">
          <span className="eyebrow" style={{ margin: 0 }}>Crew Orchard · Crew pass</span>
          <span className="pill pill-mint">{planLabel}</span>
        </div>

        <div className="crew-pass-label">Crew member</div>
        <EditName name={name} email={email} />

        <dl className="crew-pass-fields">
          <div>
            <dt>Seats</dt>
            <dd>{seats}</dd>
          </div>
          <div>
            <dt>Rate</dt>
            <dd>{rate}</dd>
          </div>
          <div>
            <dt>Boarding</dt>
            <dd>{boarding}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className={reserved ? "ok" : "hold"}>{status}</dd>
          </div>
        </dl>
      </div>

      <div className="crew-pass-stub">
        <LogoMark size={40} />
        <div className="crew-pass-label" style={{ marginTop: 14 }}>Member no.</div>
        <div className="member-no">{memberNo}</div>
        <Barcode value={code} />
        <div className="crew-pass-code">{code}</div>
      </div>
    </article>
  );
}

/** Decorative barcode: bar widths come from the characters of `value`. */
function Barcode({ value }: { value: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of value) {
    const n = ch.charCodeAt(0);
    for (let bit = 0; bit < 4; bit++) {
      const w = 1 + ((n >> bit) & 1) + ((n >> (bit + 3)) & 1);
      bars.push({ x, w });
      x += w + 1 + ((n >> (bit + 1)) & 1);
    }
  }
  return (
    <svg className="crew-pass-barcode" viewBox={`0 0 ${x} 30`} preserveAspectRatio="none" aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={30} fill="currentColor" />
      ))}
    </svg>
  );
}
