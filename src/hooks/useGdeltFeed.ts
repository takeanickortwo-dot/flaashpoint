/**
 * useGdeltFeed — live GDELT feed with 60s auto-refresh (design.md §9).
 *
 * - Boots instantly from localStorage cache (status "delayed"), then fetches.
 * - Auto-refreshes on the shared 60s cycle and on manual refresh events.
 * - On error: keeps cached articles + "delayed" status; "error" only when
 *   there is nothing to show at all.
 * - All requests pass through the global 5s GDELT queue.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchGdeltArticles,
  readWireCache,
  writeWireCache,
  GDELT_FEEDS,
} from "@/lib/gdelt";
import type { GdeltArticle, GdeltFeedId, GdeltFetchOptions } from "@/lib/gdelt";
import { REFRESH_EVENT, subscribeRefreshCycle, getRefreshCycleState } from "@/lib/refreshCycle";
import { reportFeedStatus, unreportFeedStatus } from "@/lib/feedStatus";

export type GdeltFeedStatus = "loading" | "live" | "delayed" | "error";

export interface UseGdeltFeedResult {
  articles: GdeltArticle[];
  status: GdeltFeedStatus;
  /** Last successful fetch time (or cache time while delayed). */
  asOf: Date | null;
  error: string | null;
  /** Increments on every successful fetch — use to trigger flash-update. */
  fetchKey: number;
  /** Manual refetch (still passes through the 5s queue). */
  refresh: () => void;
}

export function useGdeltFeed(
  feedId: GdeltFeedId | string,
  opts: GdeltFetchOptions & { autoRefresh?: boolean } = {},
): UseGdeltFeedResult {
  const { timespan = "24h", maxrecords = 25, sort = "hybridrel", autoRefresh = true } = opts;

  const [articles, setArticles] = useState<GdeltArticle[]>(() => {
    return readWireCache(feedId)?.articles ?? [];
  });
  const [status, setStatus] = useState<GdeltFeedStatus>(() =>
    readWireCache(feedId) ? "delayed" : "loading",
  );
  const [asOf, setAsOf] = useState<Date | null>(() => {
    const c = readWireCache(feedId);
    return c ? new Date(c.fetchedAt) : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const inflight = useRef(false);
  const lastOpts = useRef({ timespan, maxrecords, sort });

  const run = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const feed = GDELT_FEEDS.find((f) => f.id === feedId);
      const query = feed ? feed.query : feedId; // custom query strings allowed
      const fresh = await fetchGdeltArticles(query, lastOpts.current);
      setArticles(fresh);
      setAsOf(new Date());
      setStatus("live");
      setError(null);
      setFetchKey((k) => k + 1);
      writeWireCache(feedId, fresh);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "GDELT fetch failed";
      setError(msg);
      setStatus((s) => (s === "live" || s === "delayed" ? "delayed" : "error"));
      setAsOf((prev) => {
        if (prev) return prev;
        const c = readWireCache(feedId);
        return c ? new Date(c.fetchedAt) : null;
      });
      setArticles((prev) =>
        prev.length > 0 ? prev : (readWireCache(feedId)?.articles ?? []),
      );
    } finally {
      inflight.current = false;
    }
  }, [feedId]);

  // Refetch when options change (timespan/sort) or feed changes.
  useEffect(() => {
    lastOpts.current = { timespan, maxrecords, sort };
    const cached = readWireCache(feedId);
    if (cached) {
      setArticles(cached.articles);
      setAsOf(new Date(cached.fetchedAt));
      setStatus("delayed");
    } else {
      setArticles([]);
      setAsOf(null);
      setStatus("loading");
    }
    void run();
  }, [feedId, timespan, maxrecords, sort, run]);

  // Auto-refresh on the shared 60s cycle.
  useEffect(() => {
    if (!autoRefresh) return;
    let lastCycle = getRefreshCycleState().cycleCount;
    const unsub = subscribeRefreshCycle(() => {
      const { cycleCount } = getRefreshCycleState();
      if (cycleCount !== lastCycle) {
        lastCycle = cycleCount;
        void run();
      }
    });
    return unsub;
  }, [autoRefresh, run]);

  // Manual refresh events (navbar refresh button / R key).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => void run();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, [run]);

  // Publish status to the global registry (navbar LIVE/DELAYED pill).
  useEffect(() => {
    if (status === "loading") return;
    reportFeedStatus(feedId, status);
    return () => unreportFeedStatus(feedId);
  }, [feedId, status]);

  const refresh = useCallback(() => void run(), [run]);

  return { articles, status, asOf, error, fetchKey, refresh };
}
