/**
 * Crew Orchard mark: a line-art tree whose canopy is an asteroid outline
 * (echoing the Astra Retrieval asteroid mark), rooted on a dashed orbit,
 * with a single Signal Mint "fruit": the one point that matters.
 * Thin Starlight strokes, no fills, no gradients, per the brand guide.
 */
export function LogoMark({
  size = 36,
  color = "currentColor",
  accent = "var(--mint, #7EE0B2)",
  title,
}: {
  size?: number;
  color?: string;
  accent?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {/* Canopy: irregular asteroid outline */}
      <path
        d="M11.2 19.4 13.8 10.6 20.6 6.4 29.6 6.8 35.8 11.8 37 20.6 32.4 27.6 23.4 30 15 27.2Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Facet cells inside the canopy */}
      <path
        d="M17.8 13.4 23.6 11 27.4 14.8 23.8 19.4 18.4 18.6Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M13.6 23.4 18.6 22.4 21.4 29.4M27.2 28.8 29.6 21.6 36.6 19.8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Trunk and branch */}
      <path d="M24 29.4V41" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24 35.2l4.2-3.4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Orbit the tree is rooted on */}
      <path
        d="M8 43.2c10.4-3.2 21.6-3.2 32 0"
        stroke="var(--path, #46527A)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="2.4 3"
      />
      {/* The one mint signal */}
      <circle cx="30.6" cy="13.2" r="2.6" fill={accent} />
    </svg>
  );
}

export function Logo({ size = 34, wordSize = 15 }: { size?: number; wordSize?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo-word" style={{ fontSize: wordSize }}>
        Crew Orchard
      </span>
    </span>
  );
}
