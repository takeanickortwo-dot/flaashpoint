/**
 * useWireBoard — all five preset GDELT feeds for dashboard surfaces (home).
 *
 * Budget discipline (design.md §9): everything goes through the global 5s
 * queue. On mount all feeds are fetched once (queue-paced, ~5s apart);
 * afterwards feeds refresh round-robin, one per 60s cycle. The breaking
 * feed's timelinevol histogram is fetched on mount and once per cycle.
 * Every feed boots from localStorage cache with DELAYED status.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GDELT_FEEDS,
  fetchGdeltFeed,
  fetchGdeltTimeline,
  readTimelineCache,
  readWireCache,
  writeTimelineCache,
  writeWireCache,
} from "@/lib/gdelt";
import type { GdeltArticle, GdeltFeedId, GdeltTimelinePoint } from "@/lib/gdelt";
import {
  REFRESH_EVENT,
  getRefreshCycleState,
  subscribeRefreshCycle,
} from "@/lib/refreshCycle";
import { reportFeedStatus, unreportFeedStatus } from "@/lib/feedStatus";

export type WireStatus = "loading" | "live" | "delayed" | "error";

export interface WireFeedState {
  articles: GdeltArticle[];
  asOf: Date | null;
  status: WireStatus;
  /** Increments per successful fetch (flash-update trigger). */
  fetchKey: number;
}

export interface WireBoard {
  feeds: Record<GdeltFeedId, WireFeedState>;
  /** breaking-feed timelinevol histogram (24h). */
  timeline: GdeltTimelinePoint[];
  timelineAsOf: Date | null;
  /** Concatenated articles across all feeds (hotspot tally input). */
  allArticles: GdeltArticle[];
  refreshFeed: (id: GdeltFeedId) => void;
}

const FEED_IDS = GDELT_FEEDS.map((f) => f.id);

function initialFeeds(): Record<GdeltFeedId, WireFeedState> {
  const out = {} as Record<GdeltFeedId, WireFeedState>;
  for (const id of FEED_IDS) {
    const cache = readWireCache(id);
    out[id] = {
      articles: cache?.articles ?? [],
      asOf: cache ? new Date(cache.fetchedAt) : null,
      status: cache ? "delayed" : "loading",
      fetchKey: 0,
    };
  }
  return out;
}

export function useWireBoard(opts: { autoRefresh?: boolean } = {}): WireBoard {
  const { autoRefresh = true } = opts;
  const [feeds, setFeeds] = useState<Record<GdeltFeedId, WireFeedState>>(initialFeeds);
  const [timeline, setTimeline] = useState<GdeltTimelinePoint[]>(
    () => readTimelineCache("breaking")?.points ?? [],
  );
  const [timelineAsOf, setTimelineAsOf] = useState<Date | null>(() => {
    const c = readTimelineCache("breaking");
    return c ? new Date(c.fetchedAt) : null;
  });
  const roundRobin = useRef(0);
  const mounted = useRef(false);

  const loadFeed = useCallback(async (id: GdeltFeedId) => {
    try {
      const articles = await fetchGdeltFeed(id);
      writeWireCache(id, articles);
      setFeeds((prev) => ({
        ...prev,
        [id]: { articles, asOf: new Date(), status: "live", fetchKey: prev[id].fetchKey + 1 },
      }));
      reportFeedStatus(`board:${id}`, "live");
    } catch {
      setFeeds((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: prev[id].articles.length > 0 ? "delayed" : "error",
        },
      }));
      reportFeedStatus(`board:${id}`, "delayed");
    }
  }, []);

  const loadTimeline = useCallback(async () => {
    try {
      const query = GDELT_FEEDS.find((f) => f.id === "breaking")!.query;
      const points = await fetchGdeltTimeline(query);
      if (points.length > 0) {
        writeTimelineCache("breaking", points);
        setTimeline(points);
        setTimelineAsOf(new Date());
      }
    } catch {
      /* keep cached timeline */
    }
  }, []);

  // Mount: fetch every feed once (queue serializes at 5s) + breaking timeline.
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    // Deferred: network layer, not a synchronous render cascade.
    const id = window.setTimeout(() => {
      FEED_IDS.forEach((fid) => void loadFeed(fid));
      void loadTimeline();
    }, 0);
    return () => {
      window.clearTimeout(id);
      FEED_IDS.forEach((fid) => unreportFeedStatus(`board:${fid}`));
    };
  }, [loadFeed, loadTimeline]);

  // 60s cycle: round-robin one feed per cycle + refresh the timeline.
  useEffect(() => {
    if (!autoRefresh) return;
    let lastCycle = getRefreshCycleState().cycleCount;
    return subscribeRefreshCycle(() => {
      const { cycleCount } = getRefreshCycleState();
      if (cycleCount === lastCycle) return;
      lastCycle = cycleCount;
      const id = FEED_IDS[roundRobin.current % FEED_IDS.length];
      roundRobin.current += 1;
      void loadFeed(id);
      void loadTimeline();
    });
  }, [loadFeed, loadTimeline, autoRefresh]);

  // Manual refresh: re-fetch all feeds (queue-paced) + timeline.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      FEED_IDS.forEach((id) => void loadFeed(id));
      void loadTimeline();
    };
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, [loadFeed, loadTimeline]);

  const refreshFeed = useCallback((id: GdeltFeedId) => void loadFeed(id), [loadFeed]);

  const allArticles = FEED_IDS.flatMap((id) => feeds[id].articles);

  return { feeds, timeline, timelineAsOf, allArticles, refreshFeed };
}
