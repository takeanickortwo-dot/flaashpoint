/**
 * EscalationPanel — bracketed ESCALATION INDEX instrument (hotspots.md §1).
 * Shared EscalationGauge + three formula component rows (mini meter bars with
 * raw input values). Hovering a row dims the others to 40%. Footer carries
 * UPDATED HH:MM:SS UTC + an info tooltip with the verbatim formula.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/Panel";
import { EscalationGauge } from "@/components/EscalationGauge";
import {
  ESCALATION_FORMULA,
  fmtPct,
  fmtPrice,
  fmtUtcTime,
} from "@/lib/markets";
import type { MarketAsset } from "@/lib/markets";
import { useMediaQuery } from "@/components/hotspots/useMediaQuery";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const EASE_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function EscalationPanel({
  score,
  wireCount,
  vix,
  wti,
  updatedAt,
}: {
  /** Composite 0–100 from computeEscalationIndex. */
  score: number;
  /** breaking + escalation story counts (last fetch). */
  wireCount: number;
  vix?: MarketAsset;
  wti?: MarketAsset;
  updatedAt: Date | null;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const narrow = useMediaQuery("(max-width: 420px)");

  const rows = [
    {
      key: "wire",
      label: "WIRE INTENSITY",
      weight: "55%",
      raw: `${wireCount} STORIES/24H`,
      frac: clamp01(wireCount / 50),
    },
    {
      key: "vix",
      label: "VIX LEVEL",
      weight: "25%",
      raw: vix ? `VIX ${fmtPrice(vix.price)}` : "VIX —",
      frac: clamp01(((vix?.price ?? 10) - 10) / 30),
    },
    {
      key: "oil",
      label: "OIL SHOCK",
      weight: "20%",
      raw: wti ? `WTI ${fmtPct(wti.changePct)}` : "WTI —",
      frac: clamp01(Math.abs(wti?.changePct ?? 0) / 5),
    },
  ];

  return (
    <Panel
      variant="bracketed"
      title="ESCALATION INDEX"
      led="amber"
      className="h-full"
      bodyClassName="flex h-full flex-col"
      meta={
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
          COMPOSITE 0–100
        </span>
      }
    >
      <div className="flex flex-1 flex-col items-center gap-4 py-2 sm:flex-row sm:items-center sm:gap-6 sm:py-0">
        <EscalationGauge value={score} width={narrow ? 180 : 240} />

        {/* Formula component rows */}
        <div className="w-full flex-1 space-y-3">
          {rows.map((row, i) => (
            <div
              key={row.key}
              onMouseEnter={() => setHovered(row.key)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "transition-opacity duration-150",
                hovered !== null && hovered !== row.key && "opacity-40",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-field">
                  {row.label} <span className="text-faint">{row.weight}</span>
                </span>
                <span className="font-mono text-[11px] tabular-nums text-bone">
                  {row.raw}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full bg-hairline/60">
                <motion.div
                  className="h-full bg-phosphor"
                  initial={{ width: 0 }}
                  animate={{ width: `${row.frac * 100}%` }}
                  transition={{ duration: 0.8, ease: EASE_EXPO, delay: 0.1 * i }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: updated stamp + formula tooltip */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
          UPDATED {updatedAt ? `${fmtUtcTime(updatedAt)} UTC` : "—"}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Escalation index formula"
              className="flex size-6 items-center justify-center rounded-[2px] border border-hairline text-field transition-colors hover:border-phosphor hover:text-phosphor"
            >
              <Info size={12} aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[280px]">
            <span className="font-mono text-[11px] text-phosphor">ESCALATION INDEX =</span>{" "}
            <span className="font-mono text-[11px]">{ESCALATION_FORMULA}</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </Panel>
  );
}
