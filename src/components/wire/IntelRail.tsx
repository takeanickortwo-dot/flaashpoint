/**
 * WIRE — Section 3b: intelligence rail (wire.md).
 * R1 NEWS INTENSITY (timelinevol chart) · R2 THEME VOLUME (per-feed bars,
 * click = switch tab, hover = exact GDELT query) · R3 TOP HOTSPOTS (keyword
 * tally over current feed titles, Framer layout reorder, click → /hotspots#slug).
 * On <lg the rail collapses into a horizontal scroll strip above the feed.
 */

import { useMemo } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GDELT_FEEDS } from "@/lib/gdelt";
import type { GdeltArticle, GdeltFeedId, GdeltTimelinePoint, GdeltTimespan } from "@/lib/gdelt";
import { tallyHotspots } from "@/lib/hotspots";
import { Panel } from "@/components/Panel";
import { IntensityChart } from "@/components/wire/IntensityChart";
import type { WireTab } from "@/components/wire/WireControlBar";

const EASE_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];

function ThemeVolume({
  counts,
  active,
  onSelect,
}: {
  counts: Record<GdeltFeedId, number>;
  active: WireTab;
  onSelect: (id: GdeltFeedId) => void;
}) {
  const maxCount = Math.max(1, ...GDELT_FEEDS.map((f) => counts[f.id]));
  return (
    <Panel title="THEME VOLUME" bodyClassName="space-y-2.5 pt-3">
      {GDELT_FEEDS.map((f) => {
        const count = counts[f.id];
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            title={f.query}
            aria-label={`Switch to ${f.label} feed — ${count} articles`}
            className="group flex w-full items-center gap-2 text-left"
          >
            <span
              className={cn(
                "w-[92px] shrink-0 truncate font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-150",
                isActive ? "text-phosphor" : "text-field group-hover:text-bone",
              )}
            >
              {f.label}
            </span>
            <span className="h-3 min-w-0 flex-1 bg-hairline/60">
              <motion.span
                className={cn(
                  "block h-full transition-colors duration-150",
                  isActive ? "bg-phosphor" : "bg-hairline-strong group-hover:bg-faint",
                )}
                initial={{ width: 0 }}
                animate={{ width: `${(count / maxCount) * 100}%` }}
                transition={{ duration: 0.8, ease: EASE_EXPO }}
              />
            </span>
            <span
              key={count}
              className={cn(
                "w-8 shrink-0 text-right font-mono text-[11px] tabular-nums",
                isActive ? "text-phosphor" : "text-bone",
                count > 0 && "animate-flash-update",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </Panel>
  );
}

function HotspotTally({ articles }: { articles: GdeltArticle[] }) {
  const tallies = useMemo(() => tallyHotspots(articles, 10), [articles]);
  const max = Math.max(1, ...tallies.map((t) => t.count));

  return (
    <Panel
      title="TOP HOTSPOTS"
      meta={
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
          CURRENT FEED
        </span>
      }
      bodyClassName="pt-2"
    >
      {tallies.length === 0 ? (
        <p className="py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
          AWAITING WIRE DATA…
        </p>
      ) : (
        <ol>
          {tallies.map((t, i) => (
            <motion.li
              layout
              key={t.slug}
              transition={{ duration: 0.3 }}
              className="border-b border-hairline last:border-b-0"
            >
              <Link
                to={`/hotspots#${t.slug}`}
                className="group flex items-center gap-2.5 px-1 py-2 transition-colors duration-150 hover:bg-raised"
              >
                <span
                  className={cn(
                    "w-5 shrink-0 text-right font-mono text-[10px] tabular-nums",
                    i < 3 ? "text-phosphor" : "text-faint",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="w-[88px] shrink-0 truncate font-mono text-[11px] uppercase tracking-[0.12em] text-bone transition-colors group-hover:text-phosphor">
                  {t.label}
                </span>
                <span className="h-1 min-w-0 flex-1 bg-hairline/60">
                  <motion.span
                    className={cn("block h-full", i < 3 ? "bg-phosphor" : "bg-hairline-strong")}
                    initial={{ width: 0 }}
                    animate={{ width: `${(t.count / max) * 100}%` }}
                    transition={{ duration: 0.6, ease: EASE_EXPO }}
                  />
                </span>
                <span className="w-7 shrink-0 text-right font-mono text-[13px] font-medium tabular-nums text-bone">
                  {t.count}
                </span>
              </Link>
            </motion.li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

export function IntelRail({
  points,
  timespan,
  redrawKey,
  counts,
  active,
  onSelectFeed,
  articles,
}: {
  points: GdeltTimelinePoint[];
  timespan: GdeltTimespan;
  redrawKey: string;
  counts: Record<GdeltFeedId, number>;
  active: WireTab;
  onSelectFeed: (id: GdeltFeedId) => void;
  articles: GdeltArticle[];
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 md:gap-4 lg:flex-col lg:overflow-visible lg:pb-0">
      <div className="w-[300px] shrink-0 lg:w-auto">
        <IntensityChart points={points} timespan={timespan} redrawKey={redrawKey} />
      </div>
      <div className="w-[300px] shrink-0 lg:w-auto">
        <ThemeVolume counts={counts} active={active} onSelect={onSelectFeed} />
      </div>
      <div className="w-[300px] shrink-0 lg:w-auto">
        <HotspotTally articles={articles} />
      </div>
    </div>
  );
}
