/**
 * WIRE — Section 3a: article feed panel (wire.md).
 * Rows: [relative time] [country badge] [title] [domain] [ArrowUpRight];
 * non-English rows get a LANG badge. Brand-new rows vs cache get a 2px amber
 * left bar for 3s. States: 6 skeleton rows (first load), empty-wire.svg for
 * empty results / GDELT unreachable. aria-live="polite" on the list.
 */

import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseSeendate } from "@/lib/gdelt";
import type { GdeltArticle } from "@/lib/gdelt";
import { relativeTimeLabel, exactUtcTitle } from "@/hooks/useRelativeTime";
import type { GdeltFeedStatus } from "@/hooks/useGdeltFeed";
import { Panel } from "@/components/Panel";
import { ScrollArea } from "@/components/ui/scroll-area";

const EASE_SNAP = [0.22, 1, 0.36, 1] as [number, number, number, number];

const listParent: Variants = {
  hidden: { opacity: 0.4 },
  show: { opacity: 1, transition: { duration: 0.15, staggerChildren: 0.03 } },
};

const rowItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_SNAP } },
};

/** Relative time tone per wire.md (<15m amber, <1h bone, else field). */
function timeTone(date: Date | null): string {
  if (!date) return "text-field";
  const age = Date.now() - date.getTime();
  if (age < 15 * 60 * 1000) return "text-phosphor";
  if (age < 60 * 60 * 1000) return "text-bone";
  return "text-field";
}

const LANG_CODES: Record<string, string> = {
  french: "FR",
  german: "DE",
  spanish: "ES",
  russian: "RU",
  arabic: "AR",
  chinese: "ZH",
  portuguese: "PT",
  italian: "IT",
  ukrainian: "UK",
  hebrew: "HE",
  persian: "FA",
  farsi: "FA",
  turkish: "TR",
  korean: "KO",
  japanese: "JA",
  hindi: "HI",
  dutch: "NL",
  polish: "PL",
  swedish: "SV",
};

/** 2-letter LANG badge code for non-English rows, null for English/unknown. */
function langCode(language: string): string | null {
  const l = language.trim().toLowerCase();
  if (!l || l === "english") return null;
  return LANG_CODES[l] ?? l.slice(0, 2).toUpperCase();
}

function ArticleRow({
  article,
  isNew,
}: {
  article: GdeltArticle;
  isNew: boolean;
}) {
  const seen = parseSeendate(article.seendate);
  const lang = langCode(article.language);
  return (
    <motion.li variants={rowItem}>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        title={article.domain ? `${article.domain} — open source` : "Open source"}
        className={cn(
          "group flex h-14 cursor-pointer items-center gap-2.5 border-b border-hairline px-3 transition-colors duration-150 last:border-b-0 hover:bg-raised md:h-16",
          isNew && "border-l-2 border-l-phosphor",
        )}
      >
        <span
          className={cn(
            "w-16 shrink-0 font-mono text-[12px] tabular-nums",
            timeTone(seen),
          )}
          title={seen ? exactUtcTitle(seen) : undefined}
        >
          {seen ? relativeTimeLabel(seen) : "—"}
        </span>
        {article.sourcecountry && (
          <span className="hidden shrink-0 rounded-[2px] border border-hairline px-1 py-px font-mono text-[9px] uppercase tracking-[0.1em] text-field sm:block">
            {article.sourcecountry.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className="line-clamp-1 min-w-0 flex-1 font-sans text-[13px] font-medium leading-snug text-bone transition-colors duration-150 group-hover:text-phosphor md:line-clamp-2 md:text-[14px]">
          {article.title}
        </span>
        {lang && (
          <span className="shrink-0 rounded-[2px] border border-phosphor-dim px-1 py-px font-mono text-[9px] uppercase tracking-[0.1em] text-phosphor">
            {lang}
          </span>
        )}
        <span className="hidden w-44 shrink-0 truncate text-right font-mono text-[11px] text-field lg:block">
          {article.domain}
        </span>
        <ArrowUpRight
          size={13}
          aria-hidden
          className="shrink-0 text-phosphor opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        />
      </a>
    </motion.li>
  );
}

function SkeletonRows() {
  return (
    <div aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex h-14 items-center gap-3 border-b border-hairline px-3 last:border-b-0 md:h-16"
        >
          <div
            className="h-2.5 w-12 animate-pulse bg-hairline opacity-40"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
          <div
            className="h-2.5 flex-1 animate-pulse bg-hairline opacity-40"
            style={{ animationDelay: `${i * 0.12 + 0.05}s` }}
          />
          <div
            className="hidden h-2.5 w-24 animate-pulse bg-hairline opacity-40 lg:block"
            style={{ animationDelay: `${i * 0.12 + 0.1}s` }}
          />
        </div>
      ))}
    </div>
  );
}

export function WireFeedList({
  feedKey,
  feedLabel,
  queryPreview,
  status,
  asOf,
  articles,
  fetchKey,
  newUrls,
  error,
  secondsRemaining,
  onReset,
}: {
  feedKey: string;
  feedLabel: string;
  queryPreview: string;
  status: GdeltFeedStatus;
  asOf: Date | null;
  articles: GdeltArticle[];
  fetchKey: number;
  newUrls: ReadonlySet<string>;
  error: string | null;
  secondsRemaining: number;
  onReset: () => void;
}) {
  const led =
    status === "live" ? "green" : status === "error" ? "red" : status === "delayed" ? "amber" : "field";

  return (
    <Panel
      title={`WIRE // ${feedLabel}`}
      led={led}
      padded={false}
      className="h-full"
      bodyClassName="p-0"
      meta={
        <span className="flex min-w-0 items-center gap-2.5">
          {status === "delayed" && asOf && (
            <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-phosphor">
              CACHE {relativeTimeLabel(asOf)}
            </span>
          )}
          <span
            className="hidden max-w-[260px] truncate font-mono text-[10px] text-faint md:block"
            title={queryPreview}
          >
            {queryPreview}
          </span>
        </span>
      }
    >
      <ScrollArea className="lg:max-h-[70vh] [&_[data-slot=scroll-area-thumb]]:bg-hairline-strong">
        <div aria-live="polite" className="min-h-[380px]">
          {/* First load: skeleton rows */}
          {status === "loading" && articles.length === 0 && <SkeletonRows />}

          {/* GDELT unreachable, nothing cached */}
          {status === "error" && articles.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <img src="/empty-wire.svg" alt="" className="w-52 opacity-80" />
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-signal-red">
                GDELT UNREACHABLE — RETRY IN {secondsRemaining}S
              </p>
              {error && (
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Live but empty result set */}
          {status !== "loading" && status !== "error" && articles.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <img src="/empty-wire.svg" alt="" className="w-52 opacity-80" />
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-field">
                NO SIGNAL — 0 ARTICLES FOR QUERY
              </p>
              <button
                type="button"
                onClick={onReset}
                className="mt-1 rounded-[2px] border border-hairline-strong px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-bone transition-colors hover:border-phosphor hover:text-phosphor"
              >
                RESET TO BREAKING
              </button>
            </div>
          )}

          {/* Article rows — remount per fetch for the 40% fade + stagger */}
          {articles.length > 0 && (
            <AnimatePresence mode="wait">
              <motion.ul
                key={`${feedKey}:${fetchKey}`}
                variants={listParent}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0.4, transition: { duration: 0.15 } }}
              >
                {articles.map((a) => (
                  <ArticleRow key={a.url} article={a} isNew={newUrls.has(a.url)} />
                ))}
              </motion.ul>
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </Panel>
  );
}
