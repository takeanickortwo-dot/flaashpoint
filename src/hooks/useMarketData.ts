/**
 * useMarketData — shared market board state (design.md §9).
 *
 * Always renders seed immediately. On first mount anywhere in the app, a
 * best-effort stooq CSV refresh is attempted (and retried every 5 min);
 * on success every subscribed surface updates + badge flips to DELAYED
 * (STOOQ). Any failure silently keeps the seed.
 */

import { useEffect, useSyncExternalStore } from "react";
import { SEED_MARKET_DATA, tryStooqRefresh } from "@/lib/markets";
import type { MarketAsset } from "@/lib/markets";

export type MarketSource = "seed" | "stooq";

interface MarketState {
  assets: MarketAsset[];
  source: MarketSource;
  asOf: Date;
  /** Increments on each successful stooq refresh (flash-update trigger). */
  refreshKey: number;
}

let state: MarketState = {
  assets: SEED_MARKET_DATA.assets,
  source: "seed",
  asOf: new Date(SEED_MARKET_DATA.asOf),
  refreshKey: 0,
};

const listeners = new Set<() => void>();
let started = false;
let timer: number | null = null;

function emit() {
  listeners.forEach((l) => l());
}

async function attemptRefresh() {
  const result = await tryStooqRefresh();
  if (result) {
    state = {
      assets: result.assets,
      source: "stooq",
      asOf: result.fetchedAt,
      refreshKey: state.refreshKey + 1,
    };
    emit();
  }
}

function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  void attemptRefresh();
  timer = window.setInterval(() => void attemptRefresh(), 5 * 60 * 1000);
}

export function useMarketData(): MarketState & { refresh: () => void } {
  useEffect(() => {
    ensureStarted();
    return () => {
      // Keep the interval alive app-wide; only stop if nothing listens.
      if (listeners.size === 0 && timer !== null) {
        window.clearInterval(timer);
        timer = null;
        started = false;
      }
    };
  }, []);

  const snapshot = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );

  return { ...snapshot, refresh: () => void attemptRefresh() };
}
