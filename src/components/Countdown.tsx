"use client";

import { useEffect, useState } from "react";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

/** T-minus countdown to launch, styled as brand stats (mint rule over each number). */
export function Countdown({ targetIso }: { targetIso: string }) {
  const target = new Date(targetIso).getTime();
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    setT(diff(target));
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const cells: [string, number | undefined][] = [
    ["Days", t?.days],
    ["Hours", t?.hours],
    ["Minutes", t?.minutes],
    ["Seconds", t?.seconds],
  ];

  return (
    <div className="countdown" role="timer" aria-label="Time until launch">
      {cells.map(([label, v]) => (
        <div className="stat" key={label}>
          <div className="stat-value">{v === undefined ? "--" : String(v).padStart(2, "0")}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
