import { useEffect, useState } from "react";

export function useCountdown(target?: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = target ? Math.max(0, new Date(target).getTime() - now) : 0;
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms / 3600000) % 24),
    minutes: Math.floor((ms / 60000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

export function Countdown({ target, compact }: { target?: string | undefined; compact?: boolean }) {
  const c = useCountdown(target);
  const parts: [number, string][] = [[c.days, "días"], [c.hours, "horas"], [c.minutes, "min"], [c.seconds, "seg"]];
  if (compact) return <span className="tabular-nums">{c.days}d {c.hours}h {c.minutes}m</span>;
  return (
    <div className="flex gap-2">
      {parts.map(([v, l]) => (
        <div key={l} className="min-w-14 rounded-2xl bg-primary-foreground/15 px-2 py-2 text-center">
          <div className="font-display text-2xl font-bold tabular-nums">{String(v).padStart(2, "0")}</div>
          <div className="text-[10px] uppercase tracking-wide opacity-80">{l}</div>
        </div>
      ))}
    </div>
  );
}
