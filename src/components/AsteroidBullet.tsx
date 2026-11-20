/** The small asteroid bullet from the brand's "Pills & bullets" component. */
export function AsteroidBullet({ color = "var(--mint)", size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.6 6.2C2.4 4 4 2.2 6.1 1.8c1.9-.4 4 .1 5.6 1.4 1.6 1.4 2.4 3.6 1.7 5.6-.6 2-2.1 3.8-4.2 4.6-1.6.6-3.4.5-4.8-.6C2.9 11.6 2.1 9.4 2.6 6.2Z"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M6 5.4c.5-1.1 1.9-1.4 2.9-.8.8.5.9 1.6.3 2.3-.6.7-1.7.8-2.5.4-.8-.4-1-1.2-.7-1.9ZM4 10.2c1-.6 2.3-.4 3.1.4M10.2 11.6c-.2-1.2.4-2.3 1.6-2.7"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
