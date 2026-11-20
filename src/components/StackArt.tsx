/**
 * Brand line-art: your project's pieces on top, the Crew Orchard backend as
 * layered strata underneath, and your crew connected to it. One Signal Mint
 * dot marks where everything meets. Labels are live mono text.
 */
export function StackArt({ label = "Crew Orchard" }: { label?: string }) {
  const S = "#EEF1F8";
  const P = "#46527A";
  return (
    <svg className="orbit-art" viewBox="0 0 620 380" fill="none" role="img" aria-label="Line drawing of project files, data, and tools connected through the Crew Orchard backend to a crew">
      {/* Project pieces */}
      {[
        [70, "FILES"],
        [250, "DATA"],
        [430, "TOOLS"],
      ].map(([x, t]) => (
        <g key={t as string}>
          <rect x={x as number} y="36" width="120" height="56" rx="12" stroke={S} strokeWidth="2.2" />
          <path d={`M${(x as number) + 18} 58h52M${(x as number) + 18} 72h34`} stroke={P} strokeWidth="2" strokeLinecap="round" />
          <text x={(x as number) + 60} y="118" fill="#98A1B8" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="12" letterSpacing="2.4">{t}</text>
        </g>
      ))}
      {/* Paths down into the backend */}
      <path d="M130 128 C130 170, 300 160, 310 196 M310 128 V196 M490 128 C490 170, 320 160, 310 196" stroke={P} strokeWidth="2" strokeDasharray="5 7" className="travel" />
      {/* Backend strata */}
      <g stroke={S} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M180 214 310 182l130 32-130 32Z" />
        <path d="M180 238l130 32 130-32" />
        <path d="M180 262l130 32 130-32" />
      </g>
      {/* Crew */}
      {[90, 150, 470, 530].map((x) => (
        <g key={x} stroke={S} strokeWidth="2.2" strokeLinecap="round">
          <circle cx={x} cy="300" r="9" />
          <path d={`M${x - 15} 334c2-11 8-16 15-16s13 5 15 16`} />
        </g>
      ))}
      <path d="M168 306 C200 300, 220 290, 240 272 M452 306 C420 300, 400 290, 380 272" stroke={P} strokeWidth="2" strokeDasharray="5 7" />
      <text x="120" y="362" fill="#98A1B8" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="12" letterSpacing="2.4">YOUR CREW</text>
      <text x="500" y="362" fill="#98A1B8" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="12" letterSpacing="2.4">YOUR CREW</text>
      {/* The one mint signal */}
      <circle cx="310" cy="214" r="8" stroke="#7EE0B2" strokeWidth="1.5" className="pulse" />
      <circle cx="310" cy="214" r="5.5" fill="#7EE0B2" />
      <text x="310" y="330" fill="#7EE0B2" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="13" letterSpacing="2.4">{label.toUpperCase()}</text>
    </svg>
  );
}
