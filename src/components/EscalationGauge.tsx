/**
 * EscalationGauge (design.md §8.10) — semicircular arc.
 * Track hairline-strong 8px, value arc colored by band, needle line,
 * center data-xl score + band label, ticks at 0/25/50/75/100.
 * Arc animates via stroke-dashoffset 1s expo on value change.
 */

import { useEffect, useState } from "react";
import { ESCALATION_BAND_COLORS, escalationBand } from "@/lib/markets";
import { cn } from "@/lib/utils";

const TICKS = [0, 25, 50, 75, 100];

export function EscalationGauge({
  value,
  width = 200,
  className,
  animateIn = true,
  showLabel = true,
}: {
  /** 0–100 composite score. */
  value: number;
  width?: number;
  className?: string;
  animateIn?: boolean;
  showLabel?: boolean;
}) {
  const height = width * 0.55;
  const cx = width / 2;
  const cy = height * 0.92;
  const r = width * 0.42;
  const strokeW = 8;

  const band = escalationBand(value);
  const color = ESCALATION_BAND_COLORS[band];

  // Semicircle from 180° (left) to 0° (right).
  const arcLen = Math.PI * r;
  const [display, setDisplay] = useState(animateIn ? 0 : value);
  useEffect(() => {
    if (!animateIn) {
      setDisplay(value);
      return;
    }
    // Animate to value with expo-out over ~1s.
    const start = display;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 1000);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setDisplay(Math.round(start + (value - start) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const frac = Math.min(1, Math.max(0, display / 100));
  const needleAngle = Math.PI * (1 - frac); // π → 0
  const nx = cx + Math.cos(needleAngle) * (r - strokeW - 6);
  const ny = cy - Math.sin(needleAngle) * (r - strokeW - 6);

  const polar = (deg: number, radius: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) };
  };

  return (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Escalation index ${display} of 100 — ${band}`}
      >
        {/* track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#3B4136"
          strokeWidth={strokeW}
        />
        {/* value arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeDasharray={arcLen}
          strokeDashoffset={arcLen * (1 - frac)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1), stroke 0.3s" }}
        />
        {/* ticks + numerals */}
        {TICKS.map((t) => {
          const deg = 180 - (t / 100) * 180;
          const p1 = polar(deg, r - strokeW / 2 - 3);
          const p2 = polar(deg, r - strokeW / 2 - 8);
          const pt = polar(deg, r + 11);
          return (
            <g key={t}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#5B6053" strokeWidth={1} />
              <text
                x={pt.x}
                y={pt.y + 3}
                textAnchor="middle"
                fill="#5B6053"
                fontSize={9}
                fontFamily='"JetBrains Mono", monospace'
              >
                {t}
              </text>
            </g>
          );
        })}
        {/* needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#E8E6DC" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={3} fill="#E8E6DC" />
        {/* center score */}
        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          fill={color}
          fontSize={30}
          fontWeight={700}
          fontFamily='"JetBrains Mono", monospace'
          className="tabular-nums"
        >
          {display}
        </text>
      </svg>
      {showLabel && (
        <span
          key={band}
          className="-mt-1 animate-flash-update rounded-[2px] border px-1.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em]"
          style={{ color, borderColor: color }}
        >
          {band}
        </span>
      )}
    </div>
  );
}
