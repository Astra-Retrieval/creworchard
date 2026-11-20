/**
 * Site-wide night sky: plain black with natural-looking stars and a few slow,
 * quiet motions (the brand guide asks for natural starlight, no neon).
 *
 *  - Three drifting layers of stars. Nearer layers are brighter, larger, and
 *    move a little faster, which gives a subtle sense of depth. Each layer is
 *    a tile drawn twice, one under the other, so the upward drift loops
 *    seamlessly.
 *  - A few dozen stars that twinkle on their own slow rhythms.
 *  - A faint shooting star roughly every 20 seconds.
 *
 * Star positions come from a fixed seed, so the server and browser render the
 * same sky (no hydration mismatch) and it looks the same on every visit.
 * Everything is CSS: no JavaScript runs in the browser. Motion stops for
 * visitors who ask for reduced motion (see globals.css).
 */

const TILE_W = 2400; // px: wider than most screens, so no horizontal repeat is needed
const TILE_H = 1400; // px: height of one drift loop

function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mostly white starlight with a few faint warm and cool tints. */
function starColor(rand: () => number, alpha: number) {
  const r = rand();
  const rgb = r < 0.08 ? "255,228,196" : r < 0.16 ? "200,214,255" : "238,241,248";
  return `rgba(${rgb},${alpha.toFixed(2)})`;
}

function layerShadow(seed: number, count: number, alphaMin: number, alphaMax: number) {
  const rand = seeded(seed);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand() * TILE_W);
    const y = Math.round(rand() * TILE_H);
    const alpha = alphaMin + rand() * (alphaMax - alphaMin);
    parts.push(`${x}px ${y}px 0 0 ${starColor(rand, alpha)}`);
  }
  return parts.join(",");
}

const LAYERS = [
  { size: 1, shadow: layerShadow(11, 320, 0.25, 0.6), duration: 540 },
  { size: 1.5, shadow: layerShadow(23, 110, 0.4, 0.8), duration: 380 },
  { size: 2, shadow: layerShadow(37, 36, 0.6, 0.95), duration: 260 },
];

const TWINKLES = (() => {
  const rand = seeded(53);
  return Array.from({ length: 28 }, () => ({
    left: rand() * 100,
    top: rand() * 100,
    size: 1.5 + rand() * 1.5,
    duration: 4 + rand() * 6,
    delay: -rand() * 10,
  }));
})();

export function Starfield() {
  return (
    <div className="starfield" aria-hidden>
      {LAYERS.map((layer, i) => (
        <div
          key={i}
          className="star-layer"
          style={{ animationDuration: `${layer.duration}s`, height: TILE_H * 2 }}
        >
          {[0, TILE_H].map((top) => (
            <span
              key={top}
              className="star-tile"
              style={{ top, width: layer.size, height: layer.size, boxShadow: layer.shadow }}
            />
          ))}
        </div>
      ))}
      {TWINKLES.map((t, i) => (
        <span
          key={i}
          className="twinkle"
          style={{
            left: `${t.left}%`,
            top: `${t.top}%`,
            width: t.size,
            height: t.size,
            animationDuration: `${t.duration}s`,
            animationDelay: `${t.delay}s`,
          }}
        />
      ))}
      <span className="shooting-star" />
    </div>
  );
}
