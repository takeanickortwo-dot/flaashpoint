/**
 * CrossReference — region ↔ market cross-reference strip (hotspots.md §4).
 * Three hairline-separated mono stat lines pairing a region cluster with its
 * market tell (values from the live market board, prices count up 0.8s on
 * reveal). Hover raises the row; click anchors to the region card.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import type { Variants } from "framer-motion";
import { Panel } from "@/components/Panel";
import { dirOf, fmtPrice } from "@/lib/markets";
import type { MarketAsset } from "@/lib/markets";

const EASE_SNAP = [0.22, 1, 0.36, 1] as [number, number, number, number];

const parent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const snapIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_SNAP } },
};

const CROSS_REFS: { label: string; tickers: string[]; slug: string }[] = [
  { label: "MIDDLE EAST ESCALATION", tickers: ["BZ=F", "GC=F"], slug: "hormuz" },
  { label: "TAIWAN TENSION", tickers: ["NVDA", "AVGO"], slug: "taiwan" },
  { label: "UKRAINE THEATER", tickers: ["NG=F"], slug: "ukraine" },
];

/** Display aliases so lines read like the design copy (BRENT, GOLD, NATGAS). */
const ALIAS: Record<string, string> = {
  "BZ=F": "BRENT",
  "GC=F": "GOLD",
  "NG=F": "NATGAS",
};

/** Expo-out count-up that starts when `run` flips true (in-view trigger). */
function CountUp({
  value,
  run,
  format,
  duration = 800,
}: {
  value: number;
  run: boolean;
  format: (n: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, run, duration]);

  return <>{format(run ? display : 0)}</>;
}

export function CrossReference({
  assetOf,
  onJump,
}: {
  assetOf: (ticker: string) => MarketAsset | undefined;
  onJump: (slug: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      variants={parent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      <Panel title="REGION ↔ MARKET CROSS-REFERENCE" padded={false} bodyClassName="p-0">
        {CROSS_REFS.map(({ label, tickers, slug }) => {
          const pairs = tickers
            .map((t) => assetOf(t))
            .filter((a): a is MarketAsset => a !== undefined);
          return (
            <motion.button
              key={label}
              type="button"
              variants={snapIn}
              onClick={() => onJump(slug)}
              className="group flex w-full flex-wrap items-center gap-x-3 gap-y-1 border-b border-hairline px-3 py-3 text-left transition-colors duration-150 last:border-b-0 hover:bg-raised md:px-4"
            >
              <span aria-hidden className="text-phosphor">
                ▸
              </span>
              <span className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-bone">
                {label}
              </span>
              <span aria-hidden className="font-mono text-[11px] text-faint">
                ←→
              </span>
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[12px] tabular-nums">
                {pairs.map((a, i) => {
                  const dir = dirOf(a.changePct);
                  const color =
                    dir === "up"
                      ? "text-signal-green"
                      : dir === "down"
                        ? "text-signal-red"
                        : "text-field";
                  return (
                    <span key={a.ticker} className="flex items-center gap-1.5">
                      {i > 0 && <span className="text-faint">/</span>}
                      <span className="text-field">{ALIAS[a.ticker] ?? a.ticker}</span>
                      <span className="text-bone">
                        $
                        <CountUp
                          value={a.price}
                          run={inView}
                          format={(n) => fmtPrice(n)}
                        />
                      </span>
                      <span className={color}>
                        {dir === "up" ? "▲" : dir === "down" ? "▼" : "●"}
                        {Math.abs(a.changePct).toFixed(2)}%
                      </span>
                    </span>
                  );
                })}
              </span>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-field transition-colors duration-150 group-hover:text-phosphor">
                View card →
              </span>
            </motion.button>
          );
        })}
      </Panel>
    </motion.div>
  );
}
