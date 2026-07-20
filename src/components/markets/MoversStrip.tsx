/**
 * MoversStrip — 56px full-width rail (markets.md §2).
 * TOP GAINERS / TOP LOSERS / VOLATILITY chip groups; chip = ticker (700) +
 * colored Δ% + micro-spark 40×14, hairline border, h-9. VIX chip is amber
 * with a FEAR tag (its rise signals stress, not gain). Chips stagger in
 * (x 16→0), rail scrolls natively with snap + masked edges, auto-scrolls
 * to the first gainer on load. Chip click → anchor-expand the asset row.
 */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/Sparkline";
import { Badge } from "@/components/StatusLED";
import { EASE_SNAP, staggerParent } from "@/components/markets/motion";
import { dirOf } from "@/lib/markets";
import type { MarketAsset } from "@/lib/markets";

const chipVar: Variants = {
  hidden: { opacity: 0, x: 16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE_SNAP } },
};

function pctLabel(changePct: number): { glyph: string; text: string; color: string } {
  const dir = dirOf(changePct);
  return {
    glyph: dir === "up" ? "▲" : dir === "down" ? "▼" : "●",
    text: `${Math.abs(changePct).toFixed(2)}%`,
    color: dir === "up" ? "#3DDC84" : dir === "down" ? "#FF4A3D" : "#969B8A",
  };
}

function MoverChip({
  asset,
  amber = false,
  onSelect,
  innerRef,
}: {
  asset: MarketAsset;
  /** VIX: amber fear coloring instead of red/green. */
  amber?: boolean;
  onSelect: (ticker: string) => void;
  innerRef?: React.Ref<HTMLButtonElement>;
}) {
  const p = pctLabel(asset.changePct);
  const color = amber ? "#FFB000" : p.color;
  return (
    <motion.button
      ref={innerRef}
      type="button"
      variants={chipVar}
      onClick={() => onSelect(asset.ticker)}
      title={`${asset.name} — jump to row`}
      className="flex h-9 shrink-0 snap-start items-center gap-2 rounded-[2px] border border-hairline bg-console px-2.5 transition-colors duration-150 hover:border-phosphor-dim"
    >
      <span className="font-mono text-[12px] font-bold tabular-nums text-bone">
        {asset.ticker}
      </span>
      <span className="font-mono text-[11px] tabular-nums" style={{ color }}>
        <span aria-hidden className="mr-0.5 text-[9px]">
          {p.glyph}
        </span>
        {p.text}
      </span>
      <Sparkline
        series={asset.series}
        width={40}
        height={14}
        animate={false}
        {...(amber ? { stroke: "#FFB000" } : {})}
      />
      {amber && (
        <Badge variant="conflict" className="px-1 py-0 text-[9px]">
          FEAR
        </Badge>
      )}
    </motion.button>
  );
}

export function MoversStrip({
  gainers,
  losers,
  vix,
  onSelect,
}: {
  gainers: MarketAsset[];
  losers: MarketAsset[];
  vix?: MarketAsset;
  onSelect: (ticker: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const firstGainerRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll the rail to the first gainer on load (markets.md §2).
  useEffect(() => {
    const rail = railRef.current;
    const chip = firstGainerRef.current;
    if (rail && chip) {
      rail.scrollTo({ left: Math.max(0, chip.offsetLeft - 8) });
    }
  }, []);

  return (
    <section aria-label="Movers" className="border-y border-hairline bg-void">
      <div className="mx-auto flex h-14 max-w-content items-center gap-3 px-4 md:px-6 xl:px-10">
        <h2 className="flex shrink-0 items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-bone">
          <span aria-hidden className="text-phosphor">
            ▸
          </span>
          MOVERS
        </h2>

        <div className="relative min-w-0 flex-1">
          <div
            ref={railRef}
            className="flex snap-x snap-proximity items-center gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <motion.div
              className="flex items-center gap-2"
              variants={staggerParent(0.04, 0.1)}
              initial="hidden"
              animate="show"
            >
              <span className="shrink-0 px-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint">
                TOP GAINERS
              </span>
              {gainers.map((a, i) => (
                <MoverChip
                  key={a.ticker}
                  asset={a}
                  onSelect={onSelect}
                  innerRef={i === 0 ? firstGainerRef : undefined}
                />
              ))}
              <span
                className={cn(
                  "shrink-0 px-1 pl-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint",
                )}
              >
                TOP LOSERS
              </span>
              {losers.map((a) => (
                <MoverChip key={a.ticker} asset={a} onSelect={onSelect} />
              ))}
              <span className="shrink-0 px-1 pl-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint">
                VOLATILITY
              </span>
              {vix && <MoverChip asset={vix} amber onSelect={onSelect} />}
            </motion.div>
          </div>

          {/* masked edges fading to void */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-void to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-void to-transparent"
          />
        </div>
      </div>
    </section>
  );
}
