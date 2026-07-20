/**
 * GDELT DOC 2.1 client (design.md §9, research info.md).
 *
 * - Base: https://api.gdeltproject.org/api/v2/doc/doc (CORS: Access-Control-Allow-Origin *).
 * - Rate limit: max 1 request / 5s — enforced globally by a sequential queue.
 * - Results cached in localStorage under `flashpoint:wire:<feedId>` (articles) and
 *   `flashpoint:timeline:<feedId>` (timelinevol) with fetch timestamps.
 */

export const GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

export const GDELT_MIN_GAP_MS = 5000;
export const GDELT_CYCLE_MS = 60000;

export interface GdeltArticle {
  url: string;
  title: string;
  domain: string;
  sourcecountry: string;
  language: string;
  seendate: string;
  socialimage?: string;
}

export type GdeltFeedId =
  | "breaking"
  | "escalation"
  | "energy"
  | "sanctions"
  | "nuclear";

export interface GdeltFeed {
  id: GdeltFeedId;
  label: string;
  /** Exact GDELT DOC 2.1 query string (verified in research — info.md). */
  query: string;
}

/** Standing preset queries — exact strings from the verified research notes. */
export const GDELT_FEEDS: GdeltFeed[] = [
  {
    id: "breaking",
    label: "BREAKING",
    query: "(war OR airstrike OR missile OR drone strike OR shelling OR ceasefire)",
  },
  {
    id: "escalation",
    label: "ESCALATION",
    query: '(invasion OR offensive OR mobilization OR "declares war" OR retaliation)',
  },
  {
    id: "energy",
    label: "ENERGY WAR",
    query:
      '(oil OR OPEC OR "strait of hormuz" OR refinery OR pipeline) AND (attack OR war OR sanctions)',
  },
  {
    id: "sanctions",
    label: "SANCTIONS",
    query: '(sanctions OR embargo OR tariffs OR "trade war" OR export controls)',
  },
  {
    id: "nuclear",
    label: "NUCLEAR",
    query: "(nuclear OR ICBM OR warhead OR NATO)",
  },
];

export type GdeltTimespan = "1h" | "6h" | "24h" | "48h" | "1w";
export type GdeltSort = "hybridrel" | "datedesc";

export interface GdeltFetchOptions {
  timespan?: GdeltTimespan;
  maxrecords?: number;
  sort?: GdeltSort;
}

export interface GdeltTimelinePoint {
  /** Raw date label from GDELT (usually YYYYMMDDHHMMSS, UTC). */
  date: string;
  value: number;
}

/* ------------------------------------------------------------------ */
/* Request queue — guarantees ≥5s between network requests.            */
/* ------------------------------------------------------------------ */

let queueTail: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Seconds until the queue would allow a new request (0 = slot free now). */
export function secondsUntilNextSlot(): number {
  const wait = GDELT_MIN_GAP_MS - (Date.now() - lastRequestAt);
  return Math.max(0, Math.ceil(wait / 1000));
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queueTail.then(async () => {
    const wait = GDELT_MIN_GAP_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    return task();
  });
  // Keep the chain alive even if a task rejects.
  queueTail = run.catch(() => undefined);
  return run;
}

/* ------------------------------------------------------------------ */
/* Parsing helpers                                                     */
/* ------------------------------------------------------------------ */

/** Parse GDELT `seendate` (YYYYMMDDHHMMSS, UTC) into a Date. */
export function parseSeendate(seendate: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(seendate.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const ms = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Defensive parse of the artlist payload. */
function parseArticles(payload: unknown): GdeltArticle[] {
  if (!payload || typeof payload !== "object") return [];
  const raw = (payload as { articles?: unknown }).articles;
  if (!Array.isArray(raw)) return [];
  const out: GdeltArticle[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    if (typeof a.url !== "string" || typeof a.title !== "string") continue;
    out.push({
      url: a.url,
      title: a.title,
      domain: typeof a.domain === "string" ? a.domain : "",
      sourcecountry: typeof a.sourcecountry === "string" ? a.sourcecountry : "",
      language: typeof a.language === "string" ? a.language : "",
      seendate: typeof a.seendate === "string" ? a.seendate : "",
      socialimage: typeof a.socialimage === "string" ? a.socialimage : undefined,
    });
  }
  return out;
}

/** Defensive parse of the timelinevol payload — GDELT's shape varies. */
function parseTimeline(payload: unknown): GdeltTimelinePoint[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  // Primary documented shape: { timeline: [{ date, value, norm? }, ...] }
  const candidates: unknown[] = [obj.timeline, obj.data, obj.series];
  for (const cand of candidates) {
    if (!Array.isArray(cand)) continue;
    const points: GdeltTimelinePoint[] = [];
    for (const item of cand) {
      if (Array.isArray(item) && item.length >= 2) {
        // [[date, value], ...]
        const [date, value] = item;
        if (typeof date === "string" && typeof value === "number") {
          points.push({ date, value });
        }
      } else if (item && typeof item === "object") {
        const p = item as Record<string, unknown>;
        const date =
          (typeof p.date === "string" && p.date) ||
          (typeof p.datetime === "string" && p.datetime) ||
          (typeof p.day === "string" && p.day) ||
          "";
        const value =
          (typeof p.value === "number" && p.value) ||
          (typeof p.count === "number" && p.count) ||
          (typeof p.volume === "number" && p.volume) ||
          NaN;
        if (date && Number.isFinite(value)) points.push({ date, value });
      }
    }
    if (points.length > 0) return points;
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Fetchers (always go through the 5s queue)                           */
/* ------------------------------------------------------------------ */

async function gdeltGet(params: Record<string, string>): Promise<unknown> {
  const url = `${GDELT_BASE}?${new URLSearchParams(params).toString()}`;
  return enqueue(async () => {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`GDELT HTTP ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error("GDELT returned non-JSON payload");
    }
  });
}

/**
 * Core article fetch. Query is URL-encoded via URLSearchParams.
 * Defaults: timespan 24h, maxrecords 25, sort hybridrel, mode artlist.
 */
export async function fetchGdeltArticles(
  query: string,
  opts: GdeltFetchOptions = {},
): Promise<GdeltArticle[]> {
  const { timespan = "24h", maxrecords = 25, sort = "hybridrel" } = opts;
  const payload = await gdeltGet({
    query,
    mode: "artlist",
    maxrecords: String(maxrecords),
    format: "json",
    sort,
    timespan,
  });
  return parseArticles(payload);
}

/** Fetch one preset feed by id. */
export async function fetchGdeltFeed(
  feedId: GdeltFeedId,
  opts: GdeltFetchOptions = {},
): Promise<GdeltArticle[]> {
  const feed = GDELT_FEEDS.find((f) => f.id === feedId);
  if (!feed) throw new Error(`Unknown GDELT feed: ${feedId}`);
  return fetchGdeltArticles(feed.query, opts);
}

/** Fetch the timelinevol histogram for an arbitrary query. */
export async function fetchGdeltTimeline(
  query: string,
  opts: Pick<GdeltFetchOptions, "timespan"> = {},
): Promise<GdeltTimelinePoint[]> {
  const { timespan = "24h" } = opts;
  const payload = await gdeltGet({
    query,
    mode: "timelinevol",
    format: "json",
    timespan,
  });
  return parseTimeline(payload);
}

/* ------------------------------------------------------------------ */
/* localStorage cache helpers                                          */
/* ------------------------------------------------------------------ */

export interface WireCacheEntry {
  fetchedAt: number; // epoch ms
  articles: GdeltArticle[];
}

export interface TimelineCacheEntry {
  fetchedAt: number;
  points: GdeltTimelinePoint[];
}

const canStore = () => typeof window !== "undefined" && !!window.localStorage;

export function readWireCache(feedId: string): WireCacheEntry | null {
  if (!canStore()) return null;
  try {
    const raw = window.localStorage.getItem(`flashpoint:wire:${feedId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WireCacheEntry;
    if (!parsed || typeof parsed.fetchedAt !== "number" || !Array.isArray(parsed.articles)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeWireCache(feedId: string, articles: GdeltArticle[]): void {
  if (!canStore()) return;
  try {
    const entry: WireCacheEntry = { fetchedAt: Date.now(), articles };
    window.localStorage.setItem(`flashpoint:wire:${feedId}`, JSON.stringify(entry));
  } catch {
    /* storage full/blocked — cache is best-effort */
  }
}

export function readTimelineCache(feedId: string): TimelineCacheEntry | null {
  if (!canStore()) return null;
  try {
    const raw = window.localStorage.getItem(`flashpoint:timeline:${feedId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimelineCacheEntry;
    if (!parsed || typeof parsed.fetchedAt !== "number" || !Array.isArray(parsed.points)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeTimelineCache(feedId: string, points: GdeltTimelinePoint[]): void {
  if (!canStore()) return;
  try {
    const entry: TimelineCacheEntry = { fetchedAt: Date.now(), points };
    window.localStorage.setItem(`flashpoint:timeline:${feedId}`, JSON.stringify(entry));
  } catch {
    /* best-effort */
  }
}
