/**
 * Crew Orchard mark: three backend layers with a sprout growing out of the
 * top one. The backend is the ground; whatever you build grows from it.
 * Thin Starlight strokes and a single Signal Mint dot, per the brand guide.
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
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {/* Backend layers */}
      <path d="M10 30.5 24 37l14-6.5" />
      <path d="M10 36.5 24 43l14-6.5" />
      <path d="M10 24.5 24 18l14 6.5L24 31Z" />
      {/* Sprout */}
      <path d="M24 18v-6" />
      <path d="M24 13.5c-1-4.6-4.6-7-9-7 .4 4.6 3.8 7.4 9 7Z" />
      <path d="M24 11.5c1.2-3.8 4.4-5.8 8.4-5.6-.6 3.9-3.6 6.2-8.4 5.6Z" />
      {/* The one mint signal: where your work plugs in */}
      <circle cx="24" cy="24.5" r="2.4" fill={accent} stroke="none" />
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
