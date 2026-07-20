/**
 * RegionCard — per-region dossier (hotspots.md §3).
 *
 * Header (name · coords · intensity meter · mention count) → linked-asset
 * chips from the market board → WIRE PREVIEW block. The preview fetches ON
 * DEMAND only (ghost button / marker click), one GDELT query through the 5s
 * queue, then renders 5 rows with as-of + DELAYED/cache honesty. Deep-linked
 * cards (`#<slug>`) pulse an amber border for 1.5s.
 */

import { Link } from "react-router";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/Panel";
import { DelayedBadge } from "@/components/StatusLED";
import { parseSeendate } from "@/lib/gdelt";
import type { GdeltArticle } from "@/lib/gdelt";
import type { Hotspot } from "@/lib/hotspots";
import { dirOf, fmtPrice, fmtUtcTime } from "@/lib/markets";
import type { MarketAsset } from "@/lib/markets";
import { relativeTimeLabel, exactUtcTitle } from "@/hooks/useRelativeTime";
import type { Dossier } from "@/components/hotspots/useRegionDossiers";

/* Deep-link amber border pulse (1.5s) — local, not global CSS.
   Exported so the page can inject it exactly once. */
export const CARD_CSS = `
.fp-card-pulse { animation: fp-card-border-pulse 1.5s ease-out; }
@keyframes fp-card-border-pulse {
  0%, 55% { border-color: #FFB000; box-shadow: 0 0 14px rgba(255,176,0,0.22); }
  100% { border-color: #272B22; box-shadow: none; }
}
`;

/** Region → closest standing wire feed (for the MORE ON THE WIRE link). */
const WIRE_TAB: Record<string, string> = {
  ukraine: "escalation",
  "israel-gaza": "breaking",
  iran: "nuclear",
  "red-sea": "energy",
  hormuz: "energy",
  taiwan: "breaking",
  korea: "nuclear",
  "sudan-sahel": "breaking",
};

const EASE_SNAP = [0.22, 1, 0.36, 1] as [number, number, number, number];

const rowsParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const rowSnap: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_SNAP } },
};

/** `26.5N 56.3E` coordinate label. */
function coordLabel(lat: number, lng: number): string {
  const la = `${Math.abs(lat).toFixed(1)}${lat >= 0 ? "N" : "S"}`;
  const lo = `${Math.abs(lng).toFixed(1)}${lng >= 0 ? "E" : "W"}`;
  return `${la} ${lo}`;
}

/** 5-segment LED intensity meter; segments light sequentially on reveal. */
function IntensityMeter({ count, maxCount }: { count: number; maxCount: number }) {
  const norm = Math.min(1, count / Math.max(1, maxCount));
  const lit = Math.round(norm * 5);
  return (
    <span
      className="flex items-end gap-[3px]"
      title={`${count} mentions across active wires, 24h window`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0.15 }}
          whileInView={{ opacity: i < lit ? 1 : 0.15 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: 0.1 + i * 0.06, duration: 0.2 }}
          className="w-[4px] rounded-[1px]"
          style={{
            height: 4 + i * 1.6,
            backgroundColor: i < lit ? "#FFB000" : "#3B4136",
            boxShadow: i < lit ? "0 0 5px rgba(255,176,0,0.45)" : "none",
          }}
        />
      ))}
    </span>
  );
}

/** Three-dot pulse loader for the fetch-in-progress state. */
function DotLoader() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block size-1 animate-dot-pulse rounded-full bg-phosphor"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function ArticleRow({ article }: { article: GdeltArticle }) {
  const seen = parseSeendate(article.seendate);
  return (
    <motion.a
      variants={rowSnap}
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2.5 border-b border-hairline py-2 transition-colors duration-150 last:border-b-0 hover:bg-raised"
    >
      <span
        className="w-14 shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-field"
        title={seen ? exactUtcTitle(seen) : undefined}
      >
        {seen ? relativeTimeLabel(seen) : "—"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-sans text-[13px] font-medium leading-snug text-bone transition-colors group-hover:text-phosphor">
          {article.title}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[11px] text-faint">
          {article.domain}
        </span>
      </span>
      <ArrowUpRight
        size={12}
        className="mt-1 shrink-0 text-phosphor opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        aria-hidden
      />
    </motion.a>
  );
}

export function RegionCard({
  hotspot,
  count,
  maxCount,
  assets,
  dossier,
  onLoad,
  highlighted,
}: {
  hotspot: Hotspot;
  count: number;
  maxCount: number;
  /** Resolved linked assets (seed or stooq-refreshed). */
  assets: MarketAsset[];
  dossier: Dossier;
  onLoad: (slug: string) => void;
  highlighted: boolean;
}) {
  const { status, articles, asOf, fromCache } = dossier;
  const loading = status === "loading";
  const showRows = articles.length > 0 && status !== "idle" && !loading;

  return (
    <div id={`hotspot-${hotspot.slug}`} className="scroll-mt-[104px]">
      <Panel
        padded={false}
        className={cn(
          "h-full transition-colors duration-150 hover:border-hairline-strong",
          highlighted && "fp-card-pulse",
        )}
        bodyClassName="flex h-full flex-col p-3.5 md:p-4"
      >

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold uppercase tracking-wide text-bone">
            {hotspot.name}
          </h3>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-faint">
            {coordLabel(hotspot.lat, hotspot.lng)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <IntensityMeter count={count} maxCount={maxCount} />
          <span className="font-mono text-sm font-medium tabular-nums text-bone">
            {count}
            <span className="ml-1 text-[9px] font-normal uppercase tracking-[0.12em] text-faint">
              hits
            </span>
          </span>
        </div>
      </div>

      {/* Linked assets */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {assets.map((a) => {
          const dir = dirOf(a.changePct);
          const color =
            dir === "up" ? "text-signal-green" : dir === "down" ? "text-signal-red" : "text-field";
          return (
            <Link
              key={a.ticker}
              to={`/markets#${encodeURIComponent(a.ticker)}`}
              className="flex items-center gap-1.5 rounded-[2px] border border-hairline px-1.5 py-1 font-mono text-[11px] tabular-nums transition-colors duration-150 hover:border-phosphor-dim"
              title={`${a.name} — open on the markets board`}
            >
              <span className="font-bold text-bone">{a.ticker}</span>
              <span className="text-field">${fmtPrice(a.price)}</span>
              <span className={color}>
                {dir === "up" ? "▲" : dir === "down" ? "▼" : "●"}
                {Math.abs(a.changePct).toFixed(2)}%
              </span>
            </Link>
          );
        })}
      </div>

      {/* Wire preview */}
      <div className="mt-3 flex flex-1 flex-col border-t border-hairline pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="fp-label">Wire preview</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
            {loading
              ? "QUERY IN QUEUE…"
              : showRows
                ? `AS OF ${asOf ? fmtUtcTime(asOf) : "—"} UTC`
                : "FETCHES ON DEMAND // GDELT 5S QUEUE"}
          </span>
        </div>

        <div className="mt-2 flex-1" aria-live="polite">
          {status === "idle" && (
            <div className="flex h-full min-h-[96px] flex-col items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onLoad(hotspot.slug)}
                className="rounded-[2px] border border-hairline-strong px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-bone transition-colors duration-150 hover:border-phosphor hover:text-phosphor active:scale-[0.98]"
              >
                Load latest headlines
              </button>
            </div>
          )}

          {loading && (
            <div className="flex h-full min-h-[96px] flex-col items-center justify-center gap-2.5">
              <DotLoader />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-field">
                Fetching region wire…
              </span>
            </div>
          )}

          {status === "error" && articles.length === 0 && (
            <div className="flex h-full min-h-[96px] flex-col items-center justify-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal-red">
                No signal — GDELT unreachable
              </span>
              <button
                type="button"
                onClick={() => onLoad(hotspot.slug)}
                className="rounded-[2px] border border-hairline-strong px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-bone transition-colors duration-150 hover:border-phosphor hover:text-phosphor"
              >
                Retry
              </button>
            </div>
          )}

          {showRows && (
            <motion.div variants={rowsParent} initial="hidden" animate="show">
              {articles.slice(0, 5).map((a) => (
                <ArticleRow key={a.url} article={a} />
              ))}
            </motion.div>
          )}
        </div>

        {/* Footer honesty row */}
        {showRows && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2">
            <span className="flex items-center gap-1.5">
              {(status === "delayed" || status === "error") && <DelayedBadge />}
              {fromCache && asOf && (
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                  Cached {relativeTimeLabel(asOf)}
                </span>
              )}
            </span>
            <Link
              to={`/wire?tab=${WIRE_TAB[hotspot.slug] ?? "breaking"}`}
              className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-phosphor transition-colors hover:text-[#FFC133]"
            >
              More on the wire →
            </Link>
          </div>
        )}
      </div>
      </Panel>
    </div>
  );
}
