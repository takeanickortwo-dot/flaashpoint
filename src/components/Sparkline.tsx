/**
 * Sparkline (design.md §8.9) — SVG polyline from an asset series.
 * 1.5px stroke in direction color, final point 2px dot in bone, optional
 * 10% area fill. First reveal plays draw-line. Flat series (<3 pts) →
 * dashed placeholder + "INSUFFICIENT HISTORY".
 */

import { useId } from "react";
import { cn } from "@/lib/utils";
import { dirOf } from "@/lib/markets";
import type { Direction } from "@/lib/markets";

const DIR_COLORS: Record<Direction, string> = {
  up: "#3DDC84",
  down: "#FF4A3D",
  flat: "#969B8A",
};

export function Sparkline({
  series,
  width = 72,
  height = 24,
  direction,
  area = false,
  strokeWidth = 1.5,
  animate = true,
  className,
  stroke,
}: {
  series: number[];
  width?: number;
  height?: number;
  /** Override direction detection (default: first→last point). */
  direction?: Direction;
  area?: boolean;
  strokeWidth?: number;
  animate?: boolean;
  className?: string;
  /** Explicit stroke color override (e.g. teal for correlation series). */
  stroke?: string;
}) {
  const id = useId().replace(/[:]/g, "");

  if (!series || series.length < 3) {
    return (
      <span
        className={cn("inline-flex flex-col items-start gap-0.5", className)}
        style={{ width }}
        title="INSUFFICIENT HISTORY"
      >
        <svg width={width} height={height} aria-hidden>
          <line
            x1={0}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="#5B6053"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </svg>
        <span className="sr-only">INSUFFICIENT HISTORY</span>
      </span>
    );
  }

  const changePct =
    series[0] !== 0 ? ((series[series.length - 1] - series[0]) / series[0]) * 100 : 0;
  const dir = direction ?? dirOf(changePct);
  const color = stroke ?? DIR_COLORS[dir];

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const padY = 2;
  const stepX = width / (series.length - 1);
  const points = series.map((v, i) => {
    const x = i * stepX;
    const y = padY + (1 - (v - min) / span) * (height - padY * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const last = points[points.length - 1].split(",").map(Number);
  const areaId = `sparkfill-${id}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("block shrink-0", className)}
      aria-hidden
    >
      {area && (
        <>
          <defs>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.14" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon
            points={`0,${height} ${points.join(" ")} ${width},${height}`}
            fill={`url(#${areaId})`}
          />
        </>
      )}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={animate ? 1 : undefined}
        className={animate ? "animate-draw-line" : undefined}
        style={animate ? ({ "--draw-len": "1" } as React.CSSProperties) : undefined}
      />
      <circle cx={last[0]} cy={last[1]} r={2} fill="#E8E6DC" />
    </svg>
  );
}
