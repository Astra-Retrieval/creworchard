/**
 * Site-wide night sky: a real star field, not a random one.
 *
 * The background is the Winter Hexagon around Orion (Betelgeuse, Rigel, the
 * belt and sword, Sirius, Procyon, Castor and Pollux, Aldebaran, and the
 * Pleiades), drawn from the Hipparcos catalogue by scripts/build-sky.py into
 * public/sky/winter-hexagon.svg, with each star sized and tinted by its real
 * brightness and colour. It's framed as you'd see it facing south on a January
 * evening, the sky over launch day.
 *
 * Motion, all slow and all CSS (no JavaScript runs in the browser):
 *  - The whole sky turns gently about a point far above the screen, the way
 *    the real sky wheels around the celestial pole.
 *  - The brightest real stars twinkle (animated inside the SVG).
 *  - Three faint shooting stars on separate timers, about one every 5 seconds.
 * Visitors who ask for reduced motion get a still sky (see globals.css and
 * the SVG's own media query).
 */

const METEORS = [
  { top: "12%", left: "78%", angle: 152, distance: 520, duration: 11, delay: 2 },
  { top: "6%", left: "38%", angle: 141, distance: 420, duration: 15, delay: 7 },
  { top: "34%", left: "92%", angle: 163, distance: 600, duration: 19, delay: 12 },
];

export function Starfield() {
  return (
    <div className="starfield" aria-hidden>
      <div className="sky-rotor">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG background; next/image adds nothing here */}
        <img className="sky-image" src="/sky/winter-hexagon.svg" alt="" decoding="async" />
      </div>
      {METEORS.map((m, i) => (
        <span
          key={i}
          className="shooting-star"
          style={
            {
              top: m.top,
              left: m.left,
              "--angle": `${m.angle}deg`,
              "--distance": `${m.distance}px`,
              animationDuration: `${m.duration}s`,
              animationDelay: `${m.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
