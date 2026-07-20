/**
 * Canonical hotspot set + client-side keyword tally (design.md §9, hotspots.md).
 * Mention counts come from case-insensitive keyword matches over fetched wire titles.
 */

import type { GdeltArticle } from "@/lib/gdelt";

export interface Hotspot {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  linkedAssets: string[];
  /** GDELT query for on-demand region headline fetches (hotspots.md table). */
  query: string;
  /** Tally keywords (case-insensitive substring match on titles). */
  keywords: string[];
}

export const HOTSPOTS: Hotspot[] = [
  {
    slug: "ukraine",
    name: "Ukraine / Russia",
    lat: 49.0,
    lng: 32.0,
    linkedAssets: ["NG=F", "CL=F"],
    query: "(Ukraine OR Kyiv OR Donbas) AND (strike OR missile OR offensive)",
    keywords: ["ukraine", "kyiv", "russia", "donbas"],
  },
  {
    slug: "israel-gaza",
    name: "Israel / Gaza",
    lat: 31.4,
    lng: 34.4,
    linkedAssets: ["CL=F", "GC=F"],
    query: "(Gaza OR Israel OR ceasefire) AND (strike OR rocket OR raid)",
    keywords: ["israel", "gaza", "lebanon", "hezbollah", "ceasefire"],
  },
  {
    slug: "iran",
    name: "Iran",
    lat: 32.0,
    lng: 53.0,
    linkedAssets: ["BZ=F", "CL=F", "GC=F"],
    query: "(Iran OR Tehran) AND (nuclear OR missile OR sanctions)",
    keywords: ["iran", "tehran"],
  },
  {
    slug: "red-sea",
    name: "Red Sea / Bab el-Mandeb",
    lat: 13.5,
    lng: 42.5,
    linkedAssets: ["BZ=F", "CL=F"],
    query: "(Red Sea OR Houthi OR shipping) AND (attack OR vessel)",
    keywords: ["red sea", "houthi", "bab el-mandeb"],
  },
  {
    slug: "hormuz",
    name: "Strait of Hormuz",
    lat: 26.5,
    lng: 56.3,
    linkedAssets: ["BZ=F", "CL=F"],
    query: '"Strait of Hormuz" OR (tanker AND seizure)',
    keywords: ["hormuz", "strait of hormuz"],
  },
  {
    slug: "taiwan",
    name: "Taiwan Strait",
    lat: 24.5,
    lng: 119.5,
    linkedAssets: ["NVDA", "AVGO", "AAPL"],
    query: "(Taiwan OR Taipei) AND (China OR drills OR blockade)",
    keywords: ["taiwan", "taipei", "china"],
  },
  {
    slug: "korea",
    name: "Korean Peninsula",
    lat: 39.0,
    lng: 127.0,
    linkedAssets: ["^GSPC", "GC=F"],
    query: "(North Korea OR Pyongyang) AND (missile OR launch OR ICBM)",
    keywords: ["north korea", "pyongyang"],
  },
  {
    slug: "sudan-sahel",
    name: "Sudan / Sahel",
    lat: 15.0,
    lng: 30.0,
    linkedAssets: ["GC=F"],
    query: "(Sudan OR Sahel OR Khartoum) AND (conflict OR clashes)",
    keywords: ["sudan", "sahel", "khartoum"],
  },
];

/** Extra tally-only keywords from design.md §9 (no map marker). */
const EXTRA_KEYWORDS: { label: string; keywords: string[] }[] = [
  { label: "NATO", keywords: ["nato"] },
];

export interface HotspotTally {
  slug: string;
  label: string;
  count: number;
}

/**
 * Case-insensitive keyword tally over article titles (design.md §9 list:
 * Ukraine, Russia, Iran, Israel, Gaza, Lebanon, Taiwan, China, Red Sea,
 * Hormuz, NATO, North Korea, Sudan, Sahel).
 */
export function tallyHotspots(articles: GdeltArticle[], limit = 10): HotspotTally[] {
  const counts = new Map<string, number>();
  const bump = (slug: string, n = 1) => counts.set(slug, (counts.get(slug) ?? 0) + n);

  for (const a of articles) {
    const title = (a.title ?? "").toLowerCase();
    if (!title) continue;
    for (const h of HOTSPOTS) {
      if (h.keywords.some((k) => title.includes(k))) bump(h.slug);
    }
    for (const e of EXTRA_KEYWORDS) {
      if (e.keywords.some((k) => title.includes(k))) bump(e.label.toLowerCase());
    }
  }

  const labelOf = (slug: string) =>
    HOTSPOTS.find((h) => h.slug === slug)?.name.split(" /")[0].toUpperCase() ??
    slug.toUpperCase();

  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, label: labelOf(slug), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
