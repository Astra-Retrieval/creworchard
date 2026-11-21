/**
 * Three small animated line-art panels for the Features page, sitting between
 * the feature intentions and the roadmap. Each one acts out a feature:
 * scattered pieces flowing into one home, a version line you can roll back
 * along, and automations orbiting the backend. Pure SVG + CSS (no client JS),
 * drawn in the same palette as StackArt. Motion is switched off by the global
 * prefers-reduced-motion rule, and every panel reads correctly at rest.
 */

const S = "#EEF1F8"; // starlight: primary strokes
const P = "#46527A"; // path: dashed trajectories
const D = "#98A1B8"; // dust: labels
const M = "#7EE0B2"; // signal mint: the one live signal per panel

const label = {
  fill: D,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: 2,
} as const;

/* ── 1 · Gather: scattered pieces flow into one home ─────────── */

const GATHER_SOURCES = [
  { y: 22, t: "FILES", d: "M92 37 C150 37, 170 92, 222 100" },
  { y: 85, t: "DATA", d: "M92 100 H222" },
  { y: 148, t: "NOTES", d: "M92 163 C150 163, 170 108, 222 100" },
];

function GatherArt() {
  return (
    <svg className="motion-art" viewBox="0 0 320 200" fill="none" role="img" aria-label="Files, data, and notes flowing along paths into a single Crew Orchard hub">
      {GATHER_SOURCES.map((s, i) => (
        <g key={s.t}>
          <rect x="20" y={s.y} width="72" height="30" rx="8" stroke={S} strokeWidth="2" />
          <path d={`M32 ${s.y + 12}h30M32 ${s.y + 20}h18`} stroke={P} strokeWidth="2" strokeLinecap="round" />
          <text x="56" y={s.y + 46} textAnchor="middle" {...label}>{s.t}</text>
          <path d={s.d} stroke={P} strokeWidth="2" strokeDasharray="4 6" className="motion-dash" />
          <rect
            x="-4" y="-4" width="8" height="8" rx="2"
            fill={i === 1 ? M : S}
            className="motion-packet"
            style={{ offsetPath: `path("${s.d}")`, animationDelay: `${i * -0.9}s` }}
          />
        </g>
      ))}
      {/* The home: stacked strata */}
      <g stroke={S} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M222 100 258 90l36 10-36 10Z" />
        <path d="M222 114l36 10 36-10" />
        <path d="M222 128l36 10 36-10" />
      </g>
      <circle cx="258" cy="100" r="7" stroke={M} strokeWidth="1.5" className="motion-pulse" />
      <circle cx="258" cy="100" r="4" fill={M} />
      <text x="258" y="166" textAnchor="middle" {...label} fill={M}>ONE HOME</text>
    </svg>
  );
}

/* ── 2 · History: every change on a line you can roll back along ─ */

const VERSIONS = [44, 104, 164, 224];
const HEAD = 284;
const ROLLBACK = `M${HEAD} 88 C${HEAD - 30} 40, 134 40, 104 88`;

function HistoryArt() {
  return (
    <svg className="motion-art" viewBox="0 0 320 200" fill="none" role="img" aria-label="A version history line with commits lighting up in turn and a roll-back arc to an earlier version">
      <path d={`M${VERSIONS[0]} 100H${HEAD}`} stroke={S} strokeWidth="2" />
      {/* Roll-back arc, dashes running backwards in time */}
      <path d={ROLLBACK} stroke={P} strokeWidth="2" strokeDasharray="4 6" className="motion-dash-rev" />
      <path d="M98 78l6 10 10-5" stroke={P} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="194" y="36" textAnchor="middle" {...label}>ROLL BACK</text>
      {VERSIONS.map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="100" r="9" fill="#0D1222" stroke={S} strokeWidth="2" />
          <circle cx={x} cy="100" r="9" stroke={M} strokeWidth="2" className="motion-commit" style={{ animationDelay: `${i * 0.6}s` }} />
          <text x={x} y="134" textAnchor="middle" {...label}>v{i + 1}</text>
        </g>
      ))}
      {/* Head: the live version */}
      <circle cx={HEAD} cy="100" r="11" stroke={M} strokeWidth="1.5" className="motion-pulse" />
      <circle cx={HEAD} cy="100" r="7" fill={M} />
      <text x={HEAD} y="134" textAnchor="middle" {...label} fill={M}>NOW</text>
      {/* Change log ticks under the line */}
      {VERSIONS.map((x) => (
        <path key={`t${x}`} d={`M${x - 14} 158h28M${x - 14} 168h18`} stroke={P} strokeWidth="2" strokeLinecap="round" />
      ))}
    </svg>
  );
}

/* ── 3 · Automate: routine tasks orbit the backend on their own ─ */

const ORBIT_OUTER = "M40 100 A120 48 0 1 0 280 100 A120 48 0 1 0 40 100";
const ORBIT_INNER = "M90 100 A70 26 0 1 1 230 100 A70 26 0 1 1 90 100";

function AutomateArt() {
  return (
    <svg className="motion-art" viewBox="0 0 320 200" fill="none" role="img" aria-label="Small task satellites orbiting the Crew Orchard backend on their own">
      <path d={ORBIT_OUTER} stroke={P} strokeWidth="2" strokeDasharray="4 6" />
      <path d={ORBIT_INNER} stroke={P} strokeWidth="2" strokeDasharray="4 6" />
      {/* Backend core */}
      <g stroke={S} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M134 96 160 88l26 8-26 8Z" />
        <path d="M134 106l26 8 26-8" />
      </g>
      <circle cx="160" cy="96" r="6" stroke={M} strokeWidth="1.5" className="motion-pulse" />
      <circle cx="160" cy="96" r="3.5" fill={M} />
      {/* Satellites: outer ring runs slow, inner ring runs fast the other way */}
      {[0, -4, -8].map((delay, i) => (
        <g key={`o${i}`} className="motion-sat motion-sat-slow" style={{ offsetPath: `path("${ORBIT_OUTER}")`, animationDelay: `${delay}s` }}>
          <rect x="-7" y="-7" width="14" height="14" rx="3" fill="#0D1222" stroke={i === 0 ? M : S} strokeWidth="2" />
          <path d="M-3 0h6" stroke={i === 0 ? M : P} strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      {[0, -3].map((delay, i) => (
        <g key={`i${i}`} className="motion-sat motion-sat-fast" style={{ offsetPath: `path("${ORBIT_INNER}")`, animationDelay: `${delay}s` }}>
          <circle r="5" fill="#0D1222" stroke={S} strokeWidth="2" />
        </g>
      ))}
      <text x="160" y="184" textAnchor="middle" {...label}>RUNS IN THE BACKGROUND</text>
    </svg>
  );
}

const PANELS = [
  { key: "gather", Art: GatherArt, eyebrow: "Gather", text: "Scattered files, data, and notes settle into one place." },
  { key: "history", Art: HistoryArt, eyebrow: "Remember", text: "Every change is kept, so any version is one step away." },
  { key: "automate", Art: AutomateArt, eyebrow: "Automate", text: "Routine work keeps circling on its own while you build." },
];

export function FeatureMotion() {
  return (
    <div className="grid grid-3">
      {PANELS.map(({ key, Art, eyebrow, text }) => (
        <figure className="card motion-card" key={key}>
          <Art />
          <figcaption>
            <span className="eyebrow" style={{ margin: 0 }}>{eyebrow}</span>
            <p>{text}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
