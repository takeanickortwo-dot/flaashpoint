/**
 * useRegionDossiers — on-demand per-region GDELT headline fetches (hotspots.md §3).
 *
 * - NOTHING fetches on mount: a region fires exactly ONE GDELT artlist query
 *   (5 records) when the user clicks its map marker or the card's LOAD button.
 * - Every request passes through the global GDELT queue in @/lib/gdelt, which
 *   serializes requests with a ≥5s gap — dossier fetches are never parallel.
 * - Last result is cached in localStorage per slug (`flashpoint:wire:region:<slug>`)
 *   via the shared cache helpers; revisits boot from cache with DELAYED honesty.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchGdeltArticles,
  readWireCache,
  writeWireCache,
} from "@/lib/gdelt";
import type { GdeltArticle } from "@/lib/gdelt";
import { HOTSPOTS } from "@/lib/hotspots";
import { reportFeedStatus, unreportFeedStatus } from "@/lib/feedStatus";

export type DossierStatus = "idle" | "loading" | "live" | "delayed" | "error";

export interface Dossier {
  status: DossierStatus;
  articles: GdeltArticle[];
  /** Last successful fetch (or cache write) time — drives as-of + cache age. */
  asOf: Date | null;
  /** True when the shown articles come from localStorage, not a fresh fetch. */
  fromCache: boolean;
}

const cacheKey = (slug: string) => `region:${slug}`;

function initialDossiers(): Record<string, Dossier> {
  const out: Record<string, Dossier> = {};
  for (const h of HOTSPOTS) {
    const cache = readWireCache(cacheKey(h.slug));
    out[h.slug] = cache
      ? {
          status: "delayed",
          articles: cache.articles,
          asOf: new Date(cache.fetchedAt),
          fromCache: true,
        }
      : { status: "idle", articles: [], asOf: null, fromCache: false };
  }
  return out;
}

export function useRegionDossiers(): {
  dossiers: Record<string, Dossier>;
  load: (slug: string) => void;
} {
  const [dossiers, setDossiers] = useState<Record<string, Dossier>>(initialDossiers);
  const inflight = useRef(new Set<string>());

  const load = useCallback((slug: string) => {
    const hotspot = HOTSPOTS.find((h) => h.slug === slug);
    if (!hotspot || inflight.current.has(slug)) return;
    inflight.current.add(slug);
    setDossiers((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], status: "loading" },
    }));
    void (async () => {
      try {
        const articles = await fetchGdeltArticles(hotspot.query, { maxrecords: 5 });
        writeWireCache(cacheKey(slug), articles);
        setDossiers((prev) => ({
          ...prev,
          [slug]: { status: "live", articles, asOf: new Date(), fromCache: false },
        }));
      } catch {
        setDossiers((prev) => {
          const cur = prev[slug];
          if (cur.articles.length > 0) {
            return { ...prev, [slug]: { ...cur, status: "delayed" } };
          }
          const cache = readWireCache(cacheKey(slug));
          if (cache) {
            return {
              ...prev,
              [slug]: {
                status: "delayed",
                articles: cache.articles,
                asOf: new Date(cache.fetchedAt),
                fromCache: true,
              },
            };
          }
          return {
            ...prev,
            [slug]: { status: "error", articles: [], asOf: null, fromCache: false },
          };
        });
      } finally {
        inflight.current.delete(slug);
      }
    })();
  }, []);

  // Feed the navbar LIVE/DELAYED pill; balanced report/unreport per effect pass.
  useEffect(() => {
    for (const h of HOTSPOTS) {
      const st = dossiers[h.slug]?.status;
      if (st === "live" || st === "delayed" || st === "error") {
        reportFeedStatus(cacheKey(h.slug), st);
      }
    }
    return () => {
      for (const h of HOTSPOTS) unreportFeedStatus(cacheKey(h.slug));
    };
  }, [dossiers]);

  return { dossiers, load };
}
