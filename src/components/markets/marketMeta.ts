/**
 * Markets-page metadata (markets.md §3):
 * conflict-sensitivity notes per ticker + wire-feed routing for
 * "RELATED HEADLINES →" links.
 */

import type { MarketAsset, MarketCategory } from "@/lib/markets";

/** ⚡ conflict-sensitivity linkage notes (hover tooltip + drawer footer). */
export const CONFLICT_NOTES: Record<string, string> = {
  "CL=F": "Supply risk — Hormuz/Red Sea",
  "BZ=F": "Supply risk — Hormuz/Red Sea",
  "NG=F": "Pipeline risk — Russia/Ukraine",
  "GC=F": "Safe-haven demand",
  "SI=F": "Safe-haven demand",
  "^VIX": "Fear gauge — volatility reprices escalation",
  "DX-Y.NYB": "Haven flows",
  NVDA: "Taiwan strait supply chain",
  AVGO: "Taiwan strait supply chain",
  AAPL: "China exposure",
  TSLA: "China exposure",
  MSFT: "Tariffs / export controls",
  AMZN: "Tariffs / export controls",
  GOOGL: "Tariffs / export controls",
  META: "Tariffs / export controls",
};

export type WireTab = "breaking" | "escalation" | "energy" | "sanctions" | "nuclear";

export const WIRE_TAB_LABELS: Record<WireTab, string> = {
  breaking: "BREAKING",
  escalation: "ESCALATION",
  energy: "ENERGY WAR",
  sanctions: "SANCTIONS",
  nuclear: "NUCLEAR",
};

const TAB_BY_CATEGORY: Record<MarketCategory, WireTab> = {
  indices: "breaking",
  futures: "breaking",
  energy: "energy",
  metals: "nuclear", // gold/silver safe-haven → NUCLEAR per markets.md
  fx: "nuclear", // DXY haven flows → NUCLEAR per markets.md
  bigtech: "sanctions",
};

/** markets.md §3: energy→ENERGY WAR; VIX→ESCALATION; gold/DXY→NUCLEAR;
 *  big tech→SANCTIONS; indices/futures→BREAKING. */
export function wireTabForAsset(asset: MarketAsset): WireTab {
  if (asset.ticker === "^VIX") return "escalation";
  return TAB_BY_CATEGORY[asset.category];
}
