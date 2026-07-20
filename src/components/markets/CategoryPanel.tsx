/**
 * CategoryPanel — one market board (markets.md §3).
 * Header: h-section title · mean Δ% aggregate chip · right meta
 * (SEED DATA / DELAYED · STOOQ + as-of + member count).
 * Full table (md+) / card-lines (<md); BIG TECH renders a wide two-column
 * table at xl and a compact single-column list below xl.
 * One expanded row per panel (state owned by the page).
 */

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/Panel";
import { ChangeChip } from "@/components/ChangeChip";
import { Badge, SeedDataBadge } from "@/components/StatusLED";
import {
  AssetRowCard,
  AssetRowCompact,
  AssetRowFull,
  ROW_GRID,
} from "@/components/markets/AssetRow";
import type { AssetRowProps } from "@/components/markets/AssetRow";
import { EASE_SNAP, staggerParent } from "@/components/markets/motion";
import { formatAsOf } from "@/lib/markets";
import type { MarketAsset, MarketCategory } from "@/lib/markets";

const panelVar: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_SNAP },
  },
};

const TABLE_HEADERS = ["TICKER", "NAME", "PRICE", "Δ", "Δ%", "PREV CLOSE", "20D TREND", "⟨⟩"];

function TableHeader() {
  return (
    <div
      aria-hidden
      className={cn(
        "grid h-7 items-center gap-x-1.5 border-b border-hairline px-2",
        ROW_GRID,
      )}
    >
      {TABLE_HEADERS.map((h, i) => (
        <span
          key={h + i}
          className={cn(
            "truncate font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint",
            i >= 2 && i <= 6 && "text-right",
            i === 7 && "text-center",
          )}
        >
          {h}
        </span>
      ))}
    </div>
  );
}

export interface CategoryPanelProps {
  category: MarketCategory;
  title: string;
  tag?: React.ReactNode;
  assets: MarketAsset[];
  expandedTicker: string | null;
  onToggle: (ticker: string) => void;
  flashedTicker: string | null;
  flashKey: number;
  refreshKey: number;
  source: "seed" | "stooq";
  asOf: Date;
  className?: string;
}

export function CategoryPanel({
  category,
  title,
  tag,
  assets,
  expandedTicker,
  onToggle,
  flashedTicker,
  flashKey,
  refreshKey,
  source,
  asOf,
  className,
}: CategoryPanelProps) {
  const avg =
    assets.length > 0
      ? assets.reduce((s, a) => s + a.changePct, 0) / assets.length
      : 0;
  const isBigTech = category === "bigtech";
  const mid = Math.ceil(assets.length / 2);
  const leftHalf = isBigTech ? assets.slice(0, mid) : assets;
  const rightHalf = isBigTech ? assets.slice(mid) : [];

  const rowProps = (a: MarketAsset): AssetRowProps => ({
    asset: a,
    expanded: expandedTicker === a.ticker,
    onToggle: () => onToggle(a.ticker),
    flashed: flashedTicker === a.ticker,
    flashKey,
    refreshKey,
    asOf,
    isStooq: source === "stooq",
  });

  return (
    <motion.div
      variants={panelVar}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      className={className}
    >
      <Panel
        title={
          <span className="flex items-center gap-2">
            {title}
            <ChangeChip changePct={avg} />
            {tag}
          </span>
        }
        padded={false}
        bodyClassName="px-0 py-1"
        meta={
          <>
            {source === "stooq" ? (
              <Badge variant="delayed">DELAYED · STOOQ</Badge>
            ) : (
              <SeedDataBadge />
            )}
            <span
              className="hidden font-mono text-[10px] tabular-nums text-faint min-[1420px]:inline"
              title={asOf.toISOString()}
            >
              {formatAsOf(asOf)}
            </span>
            <span
              className="font-mono text-[10px] tabular-nums text-field"
              title={`${assets.length} assets on this board`}
            >
              {String(assets.length).padStart(2, "0")}
            </span>
          </>
        }
        className="h-full"
      >
        {isBigTech ? (
          <>
            {/* xl+: wide two-column table (4 + 4) */}
            <div className="hidden xl:grid xl:grid-cols-2 xl:gap-x-5 xl:px-1">
              <div>
                <TableHeader />
                <motion.div variants={staggerParent(0.03, 0.15)}>
                  {leftHalf.map((a) => (
                    <AssetRowFull key={a.ticker} {...rowProps(a)} />
                  ))}
                </motion.div>
              </div>
              <div>
                <TableHeader />
                <motion.div variants={staggerParent(0.03, 0.15)}>
                  {rightHalf.map((a) => (
                    <AssetRowFull key={a.ticker} {...rowProps(a)} />
                  ))}
                </motion.div>
              </div>
            </div>
            {/* below xl: compact single column (ticker · price · chip · spark) */}
            <div className="xl:hidden">
              <motion.div variants={staggerParent(0.03, 0.15)}>
                {assets.map((a) => (
                  <AssetRowCompact key={a.ticker} {...rowProps(a)} />
                ))}
              </motion.div>
            </div>
          </>
        ) : (
          <>
            <div className="hidden md:block">
              <TableHeader />
              <motion.div variants={staggerParent(0.03, 0.15)}>
                {assets.map((a) => (
                  <AssetRowFull key={a.ticker} {...rowProps(a)} />
                ))}
              </motion.div>
            </div>
            <div className="md:hidden">
              <motion.div variants={staggerParent(0.03, 0.15)}>
                {assets.map((a) => (
                  <AssetRowCard key={a.ticker} {...rowProps(a)} />
                ))}
              </motion.div>
            </div>
          </>
        )}
      </Panel>
    </motion.div>
  );
}
