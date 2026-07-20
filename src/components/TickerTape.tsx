/**
 * TickerTape (design.md §8.2) — 36px marquee of all 21 assets.
 * TICKER · price · ▲/▼ chip, ◆ separators, duplicated 2× for a seamless
 * 48s loop, pause on hover, click → /markets#<ticker>. Fixed "MKT 24H"
 * chip + as-of masks the left edge. Stooq-updated values flash-update.
 */

import { memo } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { useMarketData } from "@/hooks/useMarketData";
import { ChangeChip } from "@/components/ChangeChip";
import { formatAsOf, fmtPrice } from "@/lib/markets";
import type { MarketAsset } from "@/lib/markets";

function TapeItem({ asset, refreshKey }: { asset: MarketAsset; refreshKey: number }) {
  return (
    <Link
      to={`/markets#${encodeURIComponent(asset.ticker)}`}
      className="group/item flex shrink-0 items-center gap-2 px-3 py-1 transition-colors hover:bg-raised"
    >
      <span className="font-mono text-[13px] font-bold tabular-nums text-bone group-hover/item:text-phosphor">
        {asset.ticker}
      </span>
      <span
        key={`${asset.ticker}-${refreshKey}`}
        className={cn(
          "font-mono text-[13px] tabular-nums text-field",
          refreshKey > 0 && "animate-flash-update",
        )}
      >
        {fmtPrice(asset.price)}
      </span>
      <ChangeChip changePct={asset.changePct} />
      <span aria-hidden className="pl-3 text-[6px] text-faint">
        ◆
      </span>
    </Link>
  );
}

const TapeRow = memo(function TapeRow({
  assets,
  refreshKey,
  ariaHidden,
}: {
  assets: MarketAsset[];
  refreshKey: number;
  ariaHidden?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {assets.map((a) => (
        <TapeItem key={a.ticker} asset={a} refreshKey={refreshKey} />
      ))}
    </div>
  );
});

export function TickerTape() {
  const { assets, asOf, source, refreshKey } = useMarketData();

  return (
    <div
      className="group relative z-40 h-9 cursor-default overflow-hidden border-b border-hairline bg-void max-md:h-8"
      aria-label="Market ticker tape — 24 hour snapshot"
    >
      {/* Fixed left chip masking scroll-under */}
      <div className="absolute inset-y-0 left-0 z-10 flex items-center gap-2 border-r border-hairline bg-console px-3">
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-phosphor">
          MKT 24H
        </span>
        <span className="hidden font-mono text-[10px] tabular-nums text-faint lg:block">
          {formatAsOf(asOf)}
          {source === "stooq" ? " · STOOQ" : ""}
        </span>
      </div>

      {/* Marquee (paused on hover; reduced-motion → static scroll strip) */}
      <div className="flex h-full items-center overflow-hidden pl-28 max-lg:pl-24 motion-reduce:overflow-x-auto">
        <div className="flex w-max animate-tape-scroll group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          <TapeRow assets={assets} refreshKey={refreshKey} />
          <TapeRow assets={assets} refreshKey={refreshKey} ariaHidden />
        </div>
      </div>
    </div>
  );
}
