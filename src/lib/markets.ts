/**
 * Market data layer (design.md §9).
 *
 * - Always render from the embedded seed (21 assets, as of 2026-07-17 04:00 UTC).
 * - `tryStooqRefresh()` is a progressive enhancement: attempts a delayed stooq CSV
 *   quote pull and SILENTLY falls back to seed on any error. It never blocks render.
 * - Escalation Index calculator per the design contract formula.
 */

import { SEED_MARKET_DATA } from "@/data/seedMarketData";
import type { MarketAsset, MarketCategory } from "@/data/seedMarketData";

export type { MarketAsset, MarketCategory };
export { SEED_MARKET_DATA };

export const MARKET_CATEGORIES: { id: MarketCategory; label: string }[] = [
  { id: "indices", label: "INDICES" },
  { id: "futures", label: "FUTURES" },
  { id: "energy", label: "ENERGY" },
  { id: "metals", label: "METALS" },
  { id: "fx", label: "FX + DOLLAR" },
  { id: "bigtech", label: "BIG TECH" },
];

/** All seed assets, in seed order. */
export function getSeedAssets(): MarketAsset[] {
  return SEED_MARKET_DATA.assets;
}

export function getAsset(ticker: string): MarketAsset | undefined {
  return SEED_MARKET_DATA.assets.find((a) => a.ticker === ticker);
}

export function getAssetsByCategory(category: MarketCategory): MarketAsset[] {
  return SEED_MARKET_DATA.assets.filter((a) => a.category === category);
}

/** Human as-of label, e.g. "Jul 17 2026 · 04:00 UTC". */
export const MARKET_ASOF_LABEL = formatAsOf(new Date(SEED_MARKET_DATA.asOf));

/* ------------------------------------------------------------------ */
/* Formatting helpers (design.md §9)                                   */
/* ------------------------------------------------------------------ */

/** Price/number: en-US, 2 decimals, tabular-nums applied via CSS. */
export function fmtPrice(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Signed absolute change, e.g. "+2.83" / "-76.08". */
export function fmtSigned(n: number, decimals = 2): string {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${n > 0 ? "+" : n < 0 ? "-" : ""}${abs}`;
}

/** Signed percent, 2 decimals, e.g. "+3.58%" / "-1.40%". */
export function fmtPct(n: number): string {
  return `${fmtSigned(n)}%`;
}

export type Direction = "up" | "down" | "flat";

/** Semantic direction: unchanged when |Δ%| < 0.01 (design.md §2). */
export function dirOf(changePct: number): Direction {
  if (Math.abs(changePct) < 0.01) return "flat";
  return changePct > 0 ? "up" : "down";
}

/** "04:00:00" UTC. */
export function fmtUtcTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

/** "Jul 17 2026" UTC. */
export function fmtUtcDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Jul 17 2026 · 04:00 UTC". */
export function formatAsOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fmtUtcDate(d)} · ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

/** Local HH:MM:SS. */
export function fmtLocalTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour12: false });
}

/* ------------------------------------------------------------------ */
/* Stooq delayed refresh (best-effort, silent fallback)                */
/* ------------------------------------------------------------------ */

/** Seed ticker → stooq symbol (research: info.md; VIX has no stooq mapping). */
const STOOQ_SYMBOLS: Record<string, string> = {
  "^GSPC": "^spx",
  "^IXIC": "^ndx",
  "^DJI": "^dji",
  "ES=F": "es.f",
  "NQ=F": "nq.f",
  "YM=F": "ym.f",
  "CL=F": "cl.f",
  "BZ=F": "bz.f",
  "NG=F": "ng.f",
  "GC=F": "gc.f",
  "SI=F": "si.f",
  "DX-Y.NYB": "dx.f",
  AAPL: "aapl.us",
  MSFT: "msft.us",
  NVDA: "nvda.us",
  AMZN: "amzn.us",
  GOOGL: "googl.us",
  META: "meta.us",
  TSLA: "tsla.us",
  AVGO: "avgo.us",
};

export interface StooqRefreshResult {
  assets: MarketAsset[];
  fetchedAt: Date;
}

/**
 * Attempt a delayed quote refresh from stooq. Returns updated assets on success,
 * null on ANY failure (CORS, network, parse) — callers keep showing seed.
 * Never throws; never blocks render (call it fire-and-forget).
 */
export async function tryStooqRefresh(): Promise<StooqRefreshResult | null> {
  try {
    const entries = Object.entries(STOOQ_SYMBOLS);
    const syms = entries.map(([, s]) => s).join(",");
    const url = `https://stooq.com/q/l/?s=${syms}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return null;
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const iSym = header.indexOf("symbol");
    const iClose = header.indexOf("close");
    const iDate = header.indexOf("date");
    const iTime = header.indexOf("time");
    if (iSym < 0 || iClose < 0) return null;

    const byStooq = new Map<string, string>(
      entries.map(([ticker, stooq]) => [stooq.toLowerCase(), ticker]),
    );
    const seed = new Map(SEED_MARKET_DATA.assets.map((a) => [a.ticker, a]));
    const updated = new Map<string, MarketAsset>();
    let latest = 0;

    for (const line of lines.slice(1)) {
      const cols = line.split(",");
      const close = Number.parseFloat(cols[iClose]);
      const stooq = cols[iSym]?.trim().toLowerCase();
      const ticker = stooq ? byStooq.get(stooq) : undefined;
      if (!ticker || !Number.isFinite(close) || close <= 0) continue;
      const base = seed.get(ticker);
      if (!base) continue;
      const change = close - base.prevClose;
      const changePct = base.prevClose !== 0 ? (change / base.prevClose) * 100 : 0;
      updated.set(ticker, {
        ...base,
        price: close,
        change,
        changePct,
        series: [...base.series, close].slice(-24),
      });
      if (iDate >= 0) {
        const stamp = Date.parse(
          `${cols[iDate]}T${iTime >= 0 ? cols[iTime] : "00:00"}Z`,
        );
        if (Number.isFinite(stamp)) latest = Math.max(latest, stamp);
      }
    }

    if (updated.size === 0) return null;
    return {
      assets: SEED_MARKET_DATA.assets.map((a) => updated.get(a.ticker) ?? a),
      fetchedAt: new Date(latest || Date.now()),
    };
  } catch {
    return null; // silent fallback to seed
  }
}

/* ------------------------------------------------------------------ */
/* Escalation Index (design.md §9 — formula displayed on /about)       */
/* ------------------------------------------------------------------ */

export const ESCALATION_FORMULA =
  "0.55·norm(wire) + 0.25·norm(VIX,10→40) + 0.20·norm(|ΔWTI|,0→5%)";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const norm = (v: number, lo: number, hi: number) => clamp01((v - lo) / (hi - lo));

export type EscalationBand = "CALM" | "WATCH" | "TENSE" | "SEVERE" | "CRITICAL";

export const ESCALATION_BAND_COLORS: Record<EscalationBand, string> = {
  CALM: "#969B8A", // field
  WATCH: "#45C4B0", // teal
  TENSE: "#FFB000", // phosphor
  SEVERE: "#FF7A29",
  CRITICAL: "#FF4A3D", // signal-red
};

export function escalationBand(score: number): EscalationBand {
  if (score < 20) return "CALM";
  if (score < 40) return "WATCH";
  if (score < 60) return "TENSE";
  if (score < 80) return "SEVERE";
  return "CRITICAL";
}

export interface EscalationInput {
  /** Article counts from the breaking + escalation GDELT feeds (last fetch). */
  breakingCount: number;
  escalationCount: number;
  /** VIX level (seed or refreshed). */
  vix: number;
  /** Absolute WTI Δ% (seed or refreshed). */
  wtiChangePct: number;
}

/**
 * Escalation Index 0–100 =
 *   0.55·norm(breaking+escalation counts, 0→50)   (25 max per feed)
 * + 0.25·norm(VIX, 10→40)
 * + 0.20·norm(|WTI Δ%|, 0→5)
 */
export function computeEscalationIndex(input: EscalationInput): number {
  const wire = norm(input.breakingCount + input.escalationCount, 0, 50);
  const vix = norm(input.vix, 10, 40);
  const oil = norm(Math.abs(input.wtiChangePct), 0, 5);
  return Math.round((0.55 * wire + 0.25 * vix + 0.20 * oil) * 100);
}

/** Convenience: escalation from current seed values given live wire counts. */
export function escalationFromSeed(
  breakingCount: number,
  escalationCount: number,
): number {
  const vix = getAsset("^VIX");
  const wti = getAsset("CL=F");
  return computeEscalationIndex({
    breakingCount,
    escalationCount,
    vix: vix?.price ?? 18.77,
    wtiChangePct: wti?.changePct ?? 3.58,
  });
}
