/**
 * AssetChart — large area chart for the expanded asset drawer (markets.md §3).
 * Direction-colored 2px line, 8% fill, min/max gridlines with mono 9px
 * labels, last-point pulse dot, draw-line 1.2s + fill fade 0.4s on mount.
 * Series < 5 points → dashed line + "LIMITED HISTORY — N SESSIONS" overlay.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { dirOf, fmtPrice } from "@/lib/markets";
import type { Direction, MarketAsset } from "@/lib/markets";

const DIR_COLORS: Record<Direction, string> = {
  up: "#3DDC84",
  down: "#FF4A3D",
  flat: "#969B8A",
};

function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function AssetChart({ asset }: { asset: MarketAsset }) {
  const [wrapRef, size] = useMeasure<HTMLDivElement>();
  const series = asset.series;
  const n = series.length;
  const limited = n < 5;
  const color = DIR_COLORS[dirOf(asset.changePct)];

  const W = Math.floor(size.width);
  const H = Math.floor(size.height);
  const padL = 4;
  const padR = 56; // right gutter for min/max mono labels
  const padT = 10;
  const padB = 10;

  const min = n > 0 ? Math.min(...series) : 0;
  const max = n > 0 ? Math.max(...series) : 0;
  const span = max - min || 1;
  const x = (i: number) => padL + (n > 1 ? (i / (n - 1)) * (W - padL - padR) : 0);
  const y = (v: number) => padT + (1 - (v - min) / span) * (H - padT - padB);

  const ready = W > 40 && H > 40 && n > 1;
  const points = ready ? series.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`) : [];
  const lastX = ready ? x(n - 1) : 0;
  const lastY = ready ? y(series[n - 1]) : 0;

  return (
    <div
      ref={wrapRef}
      className="relative h-[160px] w-full overflow-hidden md:h-[220px]"
      role="img"
      aria-label={`${asset.name} — ${n} session trend chart`}
    >
      {ready && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" aria-hidden>
          {/* min/max gridlines + mono 9px labels */}
          <line
            x1={padL}
            x2={W - padR}
            y1={y(max)}
            y2={y(max)}
            stroke="#3B4136"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <line
            x1={padL}
            x2={W - padR}
            y1={y(min)}
            y2={y(min)}
            stroke="#3B4136"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <text
            x={W - 4}
            y={y(max) + 3}
            textAnchor="end"
            fill="#5B6053"
            fontSize={9}
            fontFamily="'JetBrains Mono', monospace"
          >
            {fmtPrice(max)}
          </text>
          <text
            x={W - 4}
            y={y(min) + 3}
            textAnchor="end"
            fill="#5B6053"
            fontSize={9}
            fontFamily="'JetBrains Mono', monospace"
          >
            {fmtPrice(min)}
          </text>

          {/* 8% area fill — fades in 0.4s after the line draws */}
          <motion.polygon
            points={`${padL},${H - padB} ${points.join(" ")} ${W - padR},${H - padB}`}
            fill={color}
            fillOpacity={0.08}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.4 }}
          />

          {/* price line — draw-line 1.2s (dashed + static when limited) */}
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            {...(limited
              ? { strokeDasharray: "5 4" }
              : {
                  pathLength: 1,
                  strokeDasharray: 1,
                  className: "animate-draw-line",
                  style: { "--draw-len": "1" } as React.CSSProperties,
                })}
          />

          {/* last-point pulse dot */}
          <circle cx={lastX} cy={lastY} r={6} fill="none" stroke={color} strokeWidth={1} className="animate-led-pulse" />
          <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
        </svg>
      )}

      {limited && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-[2px] border border-phosphor-dim bg-void/85 px-2 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-phosphor">
            LIMITED HISTORY — {n} SESSIONS
          </span>
        </div>
      )}
    </div>
  );
}
