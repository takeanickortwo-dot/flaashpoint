/**
 * AssetRow — one asset line in a category panel (markets.md §3), in three
 * responsive variants plus the expandable drawer:
 * - AssetRowFull    — 44px table row (md+), 8 columns
 * - AssetRowCard    — mobile card-line (<md): ticker+name / price+chip
 * - AssetRowCompact — BIG TECH below xl: ticker · price · chip · micro-spark
 * - AssetDrawer     — accordion drawer: large chart + stats + wire link
 *
 * Conflict-sensitive tickers carry an amber ⚡ prefix (tooltip explains the
 * linkage, click routes to the mapped wire tab). Cells replay flash-update
 * when anchored from the ticker tape / movers, or when stooq data lands.
 */

import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChangeChip } from "@/components/ChangeChip";
import { Sparkline } from "@/components/Sparkline";
import { AssetChart } from "@/components/markets/AssetChart";
import { EASE_EXPO, snapIn, staggerParent } from "@/components/markets/motion";
import { CONFLICT_NOTES, WIRE_TAB_LABELS, wireTabForAsset } from "@/components/markets/marketMeta";
import type { WireTab } from "@/components/markets/marketMeta";
import { dirOf, fmtPrice, fmtSigned, formatAsOf } from "@/lib/markets";
import type { Direction, MarketAsset } from "@/lib/markets";

/** Shared 8-column grid template (full rows + table header). */
export const ROW_GRID =
  "grid-cols-[84px_minmax(0,1fr)_96px_80px_88px_92px_100px_24px]";

const DIR_COLORS: Record<Direction, string> = {
  up: "#3DDC84",
  down: "#FF4A3D",
  flat: "#969B8A",
};

export interface AssetRowProps {
  asset: MarketAsset;
  expanded: boolean;
  onToggle: () => void;
  /** True when this row was just anchor-targeted (flash-update on cells). */
  flashed: boolean;
  flashKey: number;
  /** Stooq refresh counter — >0 flashes updated cells. */
  refreshKey: number;
  /** Global board as-of (used when stooq-sourced). */
  asOf: Date;
  isStooq: boolean;
}

function useRowBits(props: AssetRowProps) {
  const { asset, flashed, flashKey, refreshKey } = props;
  const dir = dirOf(asset.changePct);
  const dirColor = DIR_COLORS[dir];
  const note = CONFLICT_NOTES[asset.ticker];
  const tab = wireTabForAsset(asset);
  const flashCls = flashed || refreshKey > 0 ? "animate-flash-update" : undefined;
  // Remount cells on a flash trigger so the animation replays.
  const cellKey = `${asset.ticker}|${refreshKey}|${flashed ? flashKey : 0}`;
  return { asset, dir, dirColor, note, tab, flashCls, cellKey };
}

/** ⚡ prefix with tooltip; click → mapped wire tab (does not toggle row). */
function ConflictBolt({
  note,
  tab,
  className,
}: {
  note: string;
  tab: WireTab;
  className?: string;
}) {
  return (
    <Link
      to={`/wire?tab=${tab}`}
      onClick={(e) => e.stopPropagation()}
      title={`⚡ CONFLICT SENSITIVE — ${note} → ${WIRE_TAB_LABELS[tab]}`}
      aria-label={`Conflict sensitive: ${note}. Related wire: ${WIRE_TAB_LABELS[tab]}`}
      className={cn(
        "shrink-0 text-[11px] leading-none text-phosphor transition-colors hover:text-[#FFC133]",
        className,
      )}
    >
      <span aria-hidden>⚡</span>
    </Link>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <span className="flex justify-center text-faint" aria-hidden>
      <ChevronRight
        size={14}
        className={cn("transition-transform duration-200", expanded && "rotate-90")}
      />
    </span>
  );
}

function rowKeyProps(
  onToggle: () => void,
  expanded: boolean,
): React.HTMLAttributes<HTMLDivElement> {
  return {
    role: "button",
    tabIndex: 0,
    "aria-expanded": expanded,
    onClick: onToggle,
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Full table row (44px, md+)                                          */
/* ------------------------------------------------------------------ */

export function AssetRowFull(props: AssetRowProps) {
  const { asset, expanded, onToggle } = props;
  const { dirColor, note, tab, flashCls, cellKey } = useRowBits(props);

  return (
    <motion.div variants={snapIn} data-mkt-row={asset.ticker} className="scroll-mt-28">
      <div
        {...rowKeyProps(onToggle, expanded)}
        className={cn(
          "grid h-11 cursor-pointer items-center gap-x-1.5 border-b border-hairline px-2 transition-colors duration-150 hover:bg-raised",
          ROW_GRID,
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {note && <ConflictBolt note={note} tab={tab} />}
          <span className="truncate font-mono text-[13px] font-bold tabular-nums text-bone">
            {asset.ticker}
          </span>
        </span>
        <span
          className="truncate font-mono text-[11px] text-field"
          title={asset.unit ? `${asset.name} · ${asset.unit}` : asset.name}
        >
          {asset.name}
          {asset.unit ? <span className="text-faint"> · {asset.unit}</span> : null}
        </span>
        <span
          key={cellKey}
          className={cn(
            "text-right font-mono text-[13px] tabular-nums text-bone",
            flashCls,
          )}
        >
          {fmtPrice(asset.price)}
        </span>
        <span
          key={cellKey}
          className={cn("text-right font-mono text-[11px] tabular-nums", flashCls)}
          style={{ color: dirColor }}
        >
          {fmtSigned(asset.change)}
        </span>
        <span key={cellKey} className={cn("flex justify-end", flashCls)}>
          <ChangeChip changePct={asset.changePct} />
        </span>
        <span className="text-right font-mono text-[11px] tabular-nums text-field">
          {fmtPrice(asset.prevClose)}
        </span>
        <span className="flex justify-end">
          <Sparkline series={asset.series} width={96} height={28} />
        </span>
        <Chevron expanded={expanded} />
      </div>
      <AssetDrawer {...props} />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile card-line (<md)                                              */
/* ------------------------------------------------------------------ */

export function AssetRowCard(props: AssetRowProps) {
  const { asset, expanded, onToggle } = props;
  const { dirColor, note, tab, flashCls, cellKey } = useRowBits(props);

  return (
    <motion.div variants={snapIn} data-mkt-row={asset.ticker} className="scroll-mt-28">
      <div
        {...rowKeyProps(onToggle, expanded)}
        className="cursor-pointer border-b border-hairline px-2 py-2 transition-colors duration-150 hover:bg-raised"
      >
        <div className="flex items-center gap-2">
          {note && <ConflictBolt note={note} tab={tab} />}
          <span className="shrink-0 font-mono text-[13px] font-bold tabular-nums text-bone">
            {asset.ticker}
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-field">
            {asset.name}
          </span>
          <Sparkline series={asset.series} width={64} height={20} animate={false} />
        </div>
        <div className="mt-1.5 flex items-center gap-2.5">
          <span
            key={cellKey}
            className={cn("font-mono text-[13px] tabular-nums text-bone", flashCls)}
          >
            {fmtPrice(asset.price)}
          </span>
          <span
            key={cellKey}
            className={cn("font-mono text-[11px] tabular-nums", flashCls)}
            style={{ color: dirColor }}
          >
            {fmtSigned(asset.change)}
          </span>
          <span key={cellKey} className={flashCls}>
            <ChangeChip changePct={asset.changePct} />
          </span>
          <span className="flex-1" />
          <Chevron expanded={expanded} />
        </div>
      </div>
      <AssetDrawer {...props} />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Compact row (BIG TECH below xl): ticker · price · chip · micro-spark */
/* ------------------------------------------------------------------ */

export function AssetRowCompact(props: AssetRowProps) {
  const { asset, expanded, onToggle } = props;
  const { note, tab, flashCls, cellKey } = useRowBits(props);

  return (
    <motion.div variants={snapIn} data-mkt-row={asset.ticker} className="scroll-mt-28">
      <div
        {...rowKeyProps(onToggle, expanded)}
        className="flex h-10 cursor-pointer items-center gap-2 border-b border-hairline px-2 transition-colors duration-150 hover:bg-raised"
      >
        {note && <ConflictBolt note={note} tab={tab} />}
        <span className="w-[74px] shrink-0 truncate font-mono text-[12px] font-bold tabular-nums text-bone">
          {asset.ticker}
        </span>
        <span
          key={cellKey}
          className={cn(
            "min-w-0 flex-1 truncate text-right font-mono text-[12px] tabular-nums text-bone",
            flashCls,
          )}
        >
          {fmtPrice(asset.price)}
        </span>
        <span key={cellKey} className={cn("shrink-0", flashCls)}>
          <ChangeChip changePct={asset.changePct} className="px-1 text-[10px]" />
        </span>
        <Sparkline
          series={asset.series}
          width={48}
          height={16}
          animate={false}
          className="hidden shrink-0 min-[420px]:block"
        />
        <Chevron expanded={expanded} />
      </div>
      <AssetDrawer {...props} />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Expanded drawer (markets.md §3)                                     */
/* ------------------------------------------------------------------ */

function Stat({
  label,
  title,
  children,
  className,
}: {
  label: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={snapIn} title={title} className={className}>
      <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint">
        {label}
      </p>
      <div className="mt-1 font-mono text-[13px] tabular-nums text-field">{children}</div>
    </motion.div>
  );
}

export function AssetDrawer(props: AssetRowProps) {
  const { asset, expanded, asOf, isStooq } = props;
  const { dir, dirColor, note, tab } = useRowBits(props);
  const glyph = dir === "up" ? "▲" : dir === "down" ? "▼" : "●";
  const effAsOf = isStooq ? asOf : new Date(asset.asOf);
  const high = asset.series.length > 0 ? Math.max(...asset.series) : asset.price;
  const low = asset.series.length > 0 ? Math.min(...asset.series) : asset.price;

  return (
    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          key="drawer"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_EXPO }}
          className="overflow-hidden border-b border-hairline bg-void/50"
        >
          <div className="grid gap-4 p-3 md:grid-cols-[minmax(0,1fr)_240px] md:p-4">
            <div className="min-w-0">
              <AssetChart asset={asset} />
            </div>
            <motion.div
              className="grid grid-cols-2 content-start gap-x-3 gap-y-4"
              variants={staggerParent(0.04, 0.1)}
              initial="hidden"
              animate="show"
            >
              <Stat label="PRICE">
                <span className="text-[15px] font-semibold text-bone">
                  {fmtPrice(asset.price)}
                </span>
              </Stat>
              <Stat label="PREV CLOSE">{fmtPrice(asset.prevClose)}</Stat>
              <Stat label="Δ / Δ%">
                <span style={{ color: dirColor }}>
                  <span aria-hidden className="mr-1 text-[9px]">
                    {glyph}
                  </span>
                  {fmtSigned(asset.change)} / {fmtSigned(asset.changePct)}%
                </span>
              </Stat>
              <Stat label="SERIES HIGH">{fmtPrice(high)}</Stat>
              <Stat label="SERIES LOW">{fmtPrice(low)}</Stat>
              <Stat label="AS OF" title={effAsOf.toISOString()}>
                {formatAsOf(effAsOf)}
              </Stat>
            </motion.div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-3 py-2.5 md:px-4">
            {note ? (
              <span
                className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-phosphor"
                title={note}
              >
                <span aria-hidden>⚡</span> CONFLICT SENSITIVE — {note}
              </span>
            ) : (
              <span />
            )}
            <Link
              to={`/wire?tab=${tab}`}
              title={`Open wire feed: ${WIRE_TAB_LABELS[tab]}`}
              className="inline-flex items-center gap-1 rounded-[2px] border border-hairline-strong px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-bone transition-colors duration-150 hover:border-phosphor hover:text-phosphor"
            >
              RELATED HEADLINES →
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
