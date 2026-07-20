/**
 * CountdownRing (design.md §8.12) — SVG circle, 2px amber stroke,
 * dashoffset maps to seconds remaining of the 60s GDELT cycle;
 * center mono seconds. Click = manual refresh (rate-limit guard shakes).
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { secondsUntilNextSlot } from "@/lib/gdelt";

export function CountdownRing({
  secondsRemaining,
  size = 24,
  onRefresh,
  className,
}: {
  secondsRemaining: number;
  size?: number;
  /** Called when the user clicks; parent triggers manual refresh. */
  onRefresh?: () => void;
  className?: string;
}) {
  const [shake, setShake] = useState(false);
  const stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = 1 - Math.min(1, Math.max(0, secondsRemaining / 60));
  const small = size < 32;

  const handleClick = () => {
    if (secondsUntilNextSlot() > 0) {
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
      return;
    }
    onRefresh?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        secondsUntilNextSlot() > 0
          ? `RATE LIMIT — NEXT SLOT IN ${secondsUntilNextSlot()}s`
          : "Refresh now"
      }
      aria-label={`Refresh in ${secondsRemaining} seconds. Activate to refresh now.`}
      className={cn(
        "relative inline-flex items-center justify-center rounded-[2px] text-phosphor transition-colors hover:bg-raised focus-visible:outline-1 focus-visible:outline-phosphor",
        shake && "animate-ring-shake",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#3B4136"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#FFB000"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          strokeLinecap="butt"
          className="transition-[stroke-dashoffset] duration-300 ease-linear"
        />
      </svg>
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 flex items-center justify-center font-mono tabular-nums text-bone",
          small ? "text-[8px]" : "text-[11px]",
        )}
      >
        {secondsRemaining}
      </span>
    </button>
  );
}
