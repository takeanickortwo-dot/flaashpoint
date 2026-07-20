/**
 * WIRE — Rail panel R1: NEWS INTENSITY (wire.md).
 * 140px timelinevol area chart of the active feed (amber line, 10% fill,
 * hourly x-ticks, mono 9px faint labels) + peak bucket callout. When the
 * user picks the 1W timespan, a lazy 7-day mini-bar view replaces the chart.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { GdeltTimelinePoint, GdeltTimespan } from "@/lib/gdelt";
import { parseSeendate } from "@/lib/gdelt";
import { Panel } from "@/components/Panel";
import { Badge } from "@/components/StatusLED";

const EASE_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];

const W = 560;
const H = 140;

function hourLabel(raw: string): string {
  const d = parseSeendate(raw);
  if (!d) return raw.slice(8, 10) ? `${raw.slice(8, 10)}:00` : raw;
  return `${String(d.getUTCHours()).padStart(2, "0")}:00`;
}

/** 24h-style area chart with hourly x-ticks. */
function AreaChart({ points, redrawKey }: { points: GdeltTimelinePoint[]; redrawKey: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const spanX = Math.max(1, points.length - 1);
  const coords = points.map((p, i) => {
    const x = (i / spanX) * W;
    const y = H - 4 - (p.value / max) * (H - 14);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = coords.join(" ");

  const tickTotal = Math.min(6, points.length);
  const ticks = Array.from({ length: tickTotal }, (_, i) => {
    const idx = Math.round((i * (points.length - 1)) / Math.max(1, tickTotal - 1));
    return { idx, label: hourLabel(points[idx]?.date ?? "") };
  });

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-[140px] w-full"
        aria-hidden
      >
        <polygon points={`0,${H} ${line} ${W},${H}`} fill="rgba(255,176,0,0.10)" />
        <polyline
          key={redrawKey}
          points={line}
          fill="none"
          stroke="#FFB000"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray={1}
          className="animate-draw-line"
          style={{ "--draw-len": "1" } as React.CSSProperties}
        />
      </svg>
      <div className="relative mt-1 h-3.5" aria-hidden>
        {ticks.map((t) => {
          const pct = (t.idx / spanX) * 100;
          return (
            <span
              key={`${t.idx}-${t.label}`}
              className="absolute top-0 whitespace-nowrap font-mono text-[9px] tabular-nums text-faint"
              style={{
                left: `${pct}%`,
                transform:
                  pct === 0 ? "none" : pct >= 100 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {t.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Lazy 7-day mini-bars (rendered when the 1W timespan is picked). */
function MiniBars({ points }: { points: GdeltTimelinePoint[] }) {
  const days = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of points) {
      const d = parseSeendate(p.date);
      const key = d
        ? `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
            d.getUTCDate(),
          ).padStart(2, "0")}`
        : p.date.slice(0, 8);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + p.value);
    }
    return [...map.entries()].slice(-7);
  }, [points]);

  const max = Math.max(1, ...days.map(([, v]) => v));

  if (days.length === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
        ACQUIRING TIMELINE…
      </div>
    );
  }

  return (
    <div className="flex h-[158px] items-end gap-1.5 pb-1">
      {days.map(([key, value]) => (
        <div key={key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="font-mono text-[9px] tabular-nums text-field">{value}</span>
          <div className="flex h-[110px] w-full items-end bg-hairline/40">
            <motion.div
              className="w-full origin-bottom bg-phosphor/80"
              style={{ height: `${(value / max) * 100}%` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.8, ease: EASE_EXPO }}
            />
          </div>
          <span className="font-mono text-[9px] tabular-nums text-faint">
            {key.slice(6, 8)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function IntensityChart({
  points,
  timespan,
  redrawKey,
}: {
  points: GdeltTimelinePoint[];
  timespan: GdeltTimespan;
  /** Changes per tab activation — replays draw-line. */
  redrawKey: string;
}) {
  const peak = useMemo(() => {
    if (points.length === 0) return null;
    const max = points.reduce((a, b) => (b.value > a.value ? b : a));
    const d = parseSeendate(max.date);
    let label: string;
    if (timespan === "1w") {
      label = d
        ? d.toLocaleDateString("en-US", { month: "short", day: "2-digit", timeZone: "UTC" }).toUpperCase()
        : max.date.slice(0, 8);
    } else {
      label = d ? `${String(d.getUTCHours()).padStart(2, "0")}:00 UTC` : max.date;
    }
    return { value: max.value, label };
  }, [points, timespan]);

  return (
    <Panel
      title="NEWS INTENSITY"
      meta={
        <span className="flex items-center gap-2">
          {peak && (
            <span
              key={`${peak.label}-${peak.value}`}
              className="animate-flash-update whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-phosphor"
            >
              PEAK {peak.label} — {peak.value} STORIES
            </span>
          )}
          <Badge variant="24h">{timespan}</Badge>
        </span>
      }
      bodyClassName="pt-3"
    >
      {points.length < 2 ? (
        <div className="flex h-[158px] items-center justify-center font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
          ACQUIRING TIMELINE…
        </div>
      ) : timespan === "1w" ? (
        <MiniBars points={points} />
      ) : (
        <AreaChart points={points} redrawKey={redrawKey} />
      )}
    </Panel>
  );
}
