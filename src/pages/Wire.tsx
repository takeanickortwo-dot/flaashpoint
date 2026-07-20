/**
 * CONFLICT WIRE — /wire (design/wire.md).
 * Full-screen live GDELT newswire: 5 tabbed preset feeds + ephemeral CUSTOM
 * query tab, timespan/sort controls, timelinevol intensity chart, theme bars,
 * hotspot tally, honest LIVE/DELAYED status rail with 60s auto-refresh.
 * Deep link: ?tab=<feedId>. All GDELT traffic flows through the lib's
 * sequential ≥5s queue — no parallel requests are ever fired.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { motion } from "framer-motion";
import {
  GDELT_FEEDS,
  fetchGdeltFeed,
  fetchGdeltTimeline,
  readTimelineCache,
  readWireCache,
  secondsUntilNextSlot,
  writeTimelineCache,
  writeWireCache,
} from "@/lib/gdelt";
import type {
  GdeltArticle,
  GdeltFeedId,
  GdeltSort,
  GdeltTimespan,
  GdeltTimelinePoint,
} from "@/lib/gdelt";
import { requestManualRefresh } from "@/lib/refreshCycle";
import { useGdeltFeed } from "@/hooks/useGdeltFeed";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { WireHeader } from "@/components/wire/WireHeader";
import { WireControlBar } from "@/components/wire/WireControlBar";
import type { WireTab } from "@/components/wire/WireControlBar";
import { WireFeedList } from "@/components/wire/WireFeedList";
import { IntelRail } from "@/components/wire/IntelRail";

const EASE_SNAP = [0.22, 1, 0.36, 1] as [number, number, number, number];

const FEED_IDS = GDELT_FEEDS.map((f) => f.id);

function isFeedId(v: string | null): v is GdeltFeedId {
  return FEED_IDS.some((id) => id === v);
}

/* ------------------------------------------------------------------ */
/* Theme counts — cache-seeded per-feed article counts for tab badges  */
/* and the R2 bars. Mount-time warmup pulls non-active preset feeds    */
/* once through the 5s queue (skipped when cache < 60s); afterwards    */
/* only the ACTIVE tab fetches, per wire.md data behavior.             */
/* ------------------------------------------------------------------ */

function useThemeCounts(active: WireTab) {
  const [counts, setCounts] = useState<Record<GdeltFeedId, number>>(() => {
    const out = {} as Record<GdeltFeedId, number>;
    for (const id of FEED_IDS) out[id] = readWireCache(id)?.articles.length ?? 0;
    return out;
  });

  // The active feed's count is merged live at render time (see below).
  const activeAtMount = useRef(active);
  useEffect(() => {
    const skip = activeAtMount.current;
    const timer = window.setTimeout(() => {
      for (const id of FEED_IDS) {
        if (id === skip) continue;
        const cache = readWireCache(id);
        if (cache && Date.now() - cache.fetchedAt < 60_000) continue; // still fresh
        void (async () => {
          try {
            const fresh = await fetchGdeltFeed(id);
            writeWireCache(id, fresh);
            setCounts((prev) => ({ ...prev, [id]: fresh.length }));
          } catch {
            /* cached counts stay */
          }
        })();
      }
    }, 1500); // active feed + timeline get the first queue slots
    return () => window.clearTimeout(timer);
  }, []);

  return counts;
}

/* ------------------------------------------------------------------ */
/* Timelinevol — fetched once per tab activation (per timespan),       */
/* cached in localStorage alongside articles, through the 5s queue.    */
/* ------------------------------------------------------------------ */

function useWireTimeline(feedKey: string, query: string, timespan: GdeltTimespan) {
  const cacheKey = `${feedKey}::${timespan}`;
  const [cache, setCache] = useState<{ key: string; points: GdeltTimelinePoint[] }>(() => ({
    key: cacheKey,
    points: readTimelineCache(cacheKey)?.points ?? [],
  }));
  const fetchedFor = useRef<string | null>(null);

  // Render-time state adjustment: boot the new tab's timeline from cache.
  if (cache.key !== cacheKey) {
    setCache({ key: cacheKey, points: readTimelineCache(cacheKey)?.points ?? [] });
  }

  useEffect(() => {
    if (fetchedFor.current === cacheKey) return; // once per activation
    fetchedFor.current = cacheKey;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const fresh = await fetchGdeltTimeline(query, { timespan });
          if (cancelled || fresh.length === 0) return;
          writeTimelineCache(cacheKey, fresh);
          setCache({ key: cacheKey, points: fresh });
        } catch {
          /* cached timeline stays */
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cacheKey, query, timespan]);

  return cache.points;
}

/* ------------------------------------------------------------------ */
/* New-row tracking — diff each successful fetch against the previous  */
/* article set; brand-new URLs get a 2px amber left bar for 3s.        */
/* ------------------------------------------------------------------ */

function useNewUrls(articles: GdeltArticle[], fetchKey: number): ReadonlySet<string> {
  const seen = useRef<Set<string>>(new Set());
  const lastFetchKey = useRef(0);
  const [newUrls, setNewUrls] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (fetchKey === lastFetchKey.current) {
      // Tab switch / cache reseed without a completed fetch: reset baseline.
      // (Stale marks can't match another feed's URLs; the 3s timer clears them.)
      seen.current = new Set(articles.map((a) => a.url));
      return;
    }
    lastFetchKey.current = fetchKey;
    const fresh = articles.filter((a) => !seen.current.has(a.url)).map((a) => a.url);
    seen.current = new Set(articles.map((a) => a.url));
    if (fresh.length === 0) return;
    setNewUrls(new Set(fresh));
    const t = window.setTimeout(() => setNewUrls(new Set()), 3000);
    return () => window.clearTimeout(t);
  }, [articles, fetchKey]);

  return newUrls;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Wire() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [active, setActive] = useState<WireTab>(() => {
    const t = searchParams.get("tab");
    return isFeedId(t) ? t : "breaking";
  });
  const [customQuery, setCustomQuery] = useState<string | null>(null);
  const [timespan, setTimespan] = useState<GdeltTimespan>("24h");
  const [sort, setSort] = useState<GdeltSort>("hybridrel");
  const [auto, setAuto] = useState(true);

  const feedKey = active === "custom" ? (customQuery ?? "breaking") : active;
  const presetFeed = GDELT_FEEDS.find((f) => f.id === active);
  const feedLabel = active === "custom" ? "CUSTOM" : (presetFeed?.label ?? "BREAKING");
  const query = active === "custom" ? (customQuery ?? "") : (presetFeed?.query ?? "");

  const { articles, status, asOf, error, fetchKey, refresh } = useGdeltFeed(feedKey, {
    timespan,
    sort,
    autoRefresh: auto,
  });

  const counts = useThemeCounts(active);
  // Merge the live active-feed count over cache/warmup counts.
  const displayCounts: Record<GdeltFeedId, number> = isFeedId(active)
    ? { ...counts, [active]: articles.length }
    : counts;
  const timelinePoints = useWireTimeline(feedKey, query, timespan);
  const newUrls = useNewUrls(articles, fetchKey);
  const { secondsRemaining, refreshNow } = useRefreshCountdown();

  const selectTab = useCallback(
    (tab: WireTab) => {
      if (tab === "custom") {
        if (customQuery !== null) setActive("custom");
        return;
      }
      setCustomQuery(null); // ephemeral CUSTOM tab dissolves on preset pick
      setActive(tab);
    },
    [customQuery],
  );

  const runCustom = useCallback(
    (q: string) => {
      if (active === "custom" && q === customQuery) {
        refresh(); // same query re-run → explicit refetch through the queue
        return;
      }
      setCustomQuery(q);
      setActive("custom");
    },
    [active, customQuery, refresh],
  );

  // Keep the deep-link param in sync (?tab=<feedId>).
  useEffect(() => {
    if (searchParams.get("tab") !== active) {
      setSearchParams({ tab: active }, { replace: true });
    }
  }, [active, searchParams, setSearchParams]);

  // Keyboard: 1–5 jump feeds, ←/→ move through tabs, R = refresh.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key >= "1" && e.key <= "5") {
        const idx = Number(e.key) - 1;
        if (idx < FEED_IDS.length) selectTab(FEED_IDS[idx]);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const tabs: WireTab[] = [
          ...FEED_IDS,
          ...(customQuery !== null ? (["custom"] as WireTab[]) : []),
        ];
        const idx = tabs.indexOf(active);
        const next =
          e.key === "ArrowRight"
            ? tabs[(idx + 1) % tabs.length]
            : tabs[(idx - 1 + tabs.length) % tabs.length];
        selectTab(next);
        e.preventDefault();
        return;
      }
      if (e.key === "r" || e.key === "R") {
        if (secondsUntilNextSlot() === 0) requestManualRefresh();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, customQuery, selectTab]);

  const customCount = active === "custom" ? articles.length : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <WireHeader
        status={status}
        asOf={asOf}
        fetchKey={fetchKey}
        articleCount={articles.length}
        secondsRemaining={secondsRemaining}
        auto={auto}
        onAutoChange={setAuto}
        onRefreshNow={refreshNow}
      />

      <WireControlBar
        active={active}
        counts={displayCounts}
        customQuery={customQuery}
        customCount={customCount}
        onSelect={selectTab}
        timespan={timespan}
        onTimespan={setTimespan}
        sort={sort}
        onSort={setSort}
        onRun={runCustom}
      />

      <div className="mx-auto max-w-content px-4 py-4 md:px-6 md:py-5 xl:px-10">
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-12">
          {/* 3a — article feed (8 cols; below rail on mobile) */}
          <motion.div
            className="order-2 lg:order-1 lg:col-span-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_SNAP, delay: 0.1 }}
          >
            <WireFeedList
              feedKey={feedKey}
              feedLabel={feedLabel}
              queryPreview={query}
              status={status}
              asOf={asOf}
              articles={articles}
              fetchKey={fetchKey}
              newUrls={newUrls}
              error={error}
              secondsRemaining={secondsRemaining}
              onReset={() => selectTab("breaking")}
            />
          </motion.div>

          {/* 3b — intelligence rail (4 cols; horizontal strip above on mobile) */}
          <motion.div
            className="order-1 lg:order-2 lg:col-span-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_SNAP, delay: 0.18 }}
          >
            <IntelRail
              points={timelinePoints}
              timespan={timespan}
              redrawKey={`${feedKey}:${timespan}`}
              counts={displayCounts}
              active={active}
              onSelectFeed={selectTab}
              articles={articles}
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
