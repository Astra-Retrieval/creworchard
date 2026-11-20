/**
 * Brand line-art: Earth, Moon, a target asteroid, and the cislunar return
 * point marked by the single Signal Mint dot. Labels are live mono text.
 */
export function OrbitArt({ label = "Return · Cislunar" }: { label?: string }) {
  return (
    <svg className="orbit-art" viewBox="0 0 620 380" fill="none" role="img" aria-label="Line drawing of an asteroid's path from deep space to cislunar space">
      {[[40, 50], [230, 38], [330, 84], [580, 210], [290, 160], [470, 330], [560, 340], [140, 200], [600, 60]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.3" fill="#EEF1F8" opacity="0.5" />
      ))}
      {/* Earth orbit and Moon path */}
      <circle cx="110" cy="290" r="104" stroke="#46527A" strokeWidth="2" strokeDasharray="5 7" />
      <path d="M150 260 L520 104" stroke="#46527A" strokeWidth="2" strokeDasharray="5 7" className="travel" />
      {/* Earth */}
      <circle cx="110" cy="290" r="38" stroke="#EEF1F8" strokeWidth="2.4" />
      <ellipse cx="110" cy="290" rx="15" ry="38" stroke="#EEF1F8" strokeWidth="1.8" />
      {/* Moon */}
      <circle cx="186" cy="224" r="9" stroke="#EEF1F8" strokeWidth="2.2" />
      {/* Return trajectory */}
      <path d="M196 238 C 270 262, 360 262, 430 206 C 460 182, 476 160, 488 140" stroke="#EEF1F8" strokeWidth="2.4" strokeLinecap="round" />
      {/* Asteroid */}
      <path d="M492 78 518 56 552 60 566 86 560 122 532 142 500 136 486 110Z" stroke="#EEF1F8" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M508 84 524 72 540 80 536 98 516 100Z" stroke="#EEF1F8" strokeWidth="2" strokeLinejoin="round" />
      <path d="M534 136 538 116 562 106M490 116 506 112 514 134" stroke="#EEF1F8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* The one mint signal */}
      <circle cx="300" cy="252" r="8" stroke="#7EE0B2" strokeWidth="1.5" className="pulse" />
      <circle cx="300" cy="252" r="14" stroke="#7EE0B2" strokeOpacity="0.35" strokeWidth="1.2" />
      <circle cx="300" cy="252" r="5.5" fill="#7EE0B2" />
      {/* Labels */}
      <g fontFamily="var(--font-mono)" fontSize="13" letterSpacing="2.4">
        <text x="110" y="356" fill="#98A1B8" textAnchor="middle">EARTH</text>
        <text x="186" y="198" fill="#98A1B8" textAnchor="middle">MOON</text>
        <text x="526" y="34" fill="#98A1B8" textAnchor="middle">TARGET ASTEROID</text>
        <text x="300" y="292" fill="#7EE0B2" textAnchor="middle">{label.toUpperCase()}</text>
      </g>
    </svg>
  );
}
