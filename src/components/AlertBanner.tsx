/**
 * AlertBanner (design.md §8.11) — panel--alert strip.
 * Blinking FLASH label, rotating top-3 breaking headlines every 8s
 * (crossfade 0.3s), domain + relative time, prev/next chevrons, close X
 * (persists per-session in localStorage). Collapses to 0 height when empty.
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseSeendate } from "@/lib/gdelt";
import type { GdeltArticle } from "@/lib/gdelt";
import { relativeTimeLabel, exactUtcTitle } from "@/hooks/useRelativeTime";

const DISMISS_KEY = "flashpoint:alert-dismissed";

export function AlertBanner({
  articles,
  className,
  rotateMs = 8000,
}: {
  /** Breaking-feed articles; top 3 are rotated. */
  articles: GdeltArticle[];
  className?: string;
  rotateMs?: number;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const top = useMemo(() => articles.slice(0, 3), [articles]);

  useEffect(() => {
    if (paused || top.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % top.length);
    }, rotateMs);
    return () => window.clearInterval(id);
  }, [paused, top.length, rotateMs]);

  if (dismissed || top.length === 0) return null;

  // Keep index in range when the article set changes (derived, no effect needed).
  const safeIndex = index % top.length;
  const article = top[safeIndex];
  const seen = parseSeendate(article.seendate);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* session persistence is best-effort */
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "relative flex h-12 items-center gap-3 overflow-hidden rounded-[2px] border border-hairline border-l-2 border-l-signal-red bg-[rgba(255,74,61,0.08)] px-3",
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="flex shrink-0 animate-blink-hard items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-signal-red">
        <span aria-hidden className="inline-block size-1.5 bg-signal-red" />
        FLASH
      </span>

      <div className="relative min-w-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.a
            key={article.url}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="block truncate font-sans text-sm font-medium text-bone hover:text-phosphor"
          >
            {article.title}
          </motion.a>
        </AnimatePresence>
      </div>

      <span
        className="hidden shrink-0 font-mono text-[11px] text-field sm:block"
        title={seen ? exactUtcTitle(seen) : undefined}
      >
        {article.domain}
        {seen ? ` · ${relativeTimeLabel(seen)}` : ""}
      </span>

      {top.length > 1 && (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="Previous alert"
            onClick={() => setIndex((i) => (i - 1 + top.length) % top.length)}
            className="flex size-6 items-center justify-center rounded-[2px] text-field transition-colors hover:bg-raised hover:text-bone"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            aria-label="Next alert"
            onClick={() => setIndex((i) => (i + 1) % top.length)}
            className="flex size-6 items-center justify-center rounded-[2px] text-field transition-colors hover:bg-raised hover:text-bone"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      <button
        type="button"
        aria-label="Dismiss alert banner"
        onClick={dismiss}
        className="flex size-6 shrink-0 items-center justify-center rounded-[2px] text-field transition-colors hover:bg-raised hover:text-bone"
      >
        <X size={14} />
      </button>
    </div>
  );
}
