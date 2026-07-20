/**
 * WIRE — Section 2: sticky control bar (wire.md).
 * Feed tabs (BREAKING/ESCALATION/ENERGY WAR/SANCTIONS/NUCLEAR + ephemeral
 * CUSTOM), timespan segmented control (1H/6H/24H/48H/1W), sort toggle
 * (RELEVANCE/NEWEST), custom GDELT query input with ▸ prefix + RUN button.
 * Sticky under the nav+tape unit (56+32px mobile, 56+36px desktop).
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GDELT_FEEDS } from "@/lib/gdelt";
import type { GdeltFeedId, GdeltSort, GdeltTimespan } from "@/lib/gdelt";

export type WireTab = GdeltFeedId | "custom";

const TIMESPANS: GdeltTimespan[] = ["1h", "6h", "24h", "48h", "1w"];

const SORTS: { id: GdeltSort; label: string }[] = [
  { id: "hybridrel", label: "RELEVANCE" },
  { id: "datedesc", label: "NEWEST" },
];

/** Lightweight client-side sanity check before burning a queue slot. */
function validateQuery(q: string): string | null {
  const t = q.trim();
  if (t.length < 2) return "QUERY EMPTY — ENTER KEYWORDS OR A GDELT EXPRESSION";
  let depth = 0;
  let inQuote = false;
  for (const ch of t) {
    if (ch === '"') inQuote = !inQuote;
    else if (!inQuote && ch === "(") depth += 1;
    else if (!inQuote && ch === ")") depth -= 1;
    if (depth < 0) return "UNBALANCED PARENTHESES";
  }
  if (inQuote || depth !== 0) return "UNBALANCED OPERATORS — CHECK ( ) AND QUOTES";
  return null;
}

export function WireControlBar({
  active,
  counts,
  customQuery,
  customCount,
  onSelect,
  timespan,
  onTimespan,
  sort,
  onSort,
  onRun,
}: {
  active: WireTab;
  counts: Record<GdeltFeedId, number>;
  customQuery: string | null;
  customCount: number;
  onSelect: (tab: WireTab) => void;
  timespan: GdeltTimespan;
  onTimespan: (t: GdeltTimespan) => void;
  sort: GdeltSort;
  onSort: (s: GdeltSort) => void;
  onRun: (query: string) => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    const err = validateQuery(input);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onRun(input.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-[88px] z-40 mt-5 border-b border-hairline bg-console md:top-[92px]"
    >
      <div className="mx-auto max-w-content px-4 md:px-6 xl:px-10">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-2">
          {/* Feed tabs */}
          <div
            role="tablist"
            aria-label="GDELT feeds"
            className="-mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto px-1"
          >
            {GDELT_FEEDS.map((f, i) => {
              const isActive = active === f.id;
              return (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelect(f.id)}
                  title={`${f.query} — key ${i + 1}`}
                  className={cn(
                    "relative shrink-0 px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors duration-150",
                    isActive ? "text-phosphor" : "text-field hover:text-bone",
                  )}
                >
                  {f.label}
                  <span className="ml-1 text-[10px] tabular-nums text-faint">
                    ({counts[f.id]})
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="wire-tab-underline"
                      className="absolute inset-x-2 bottom-0 h-0.5 bg-phosphor"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              );
            })}
            {/* Ephemeral CUSTOM tab — amber dashed underline */}
            {customQuery !== null && (
              <button
                role="tab"
                aria-selected={active === "custom"}
                onClick={() => onSelect("custom")}
                title={customQuery}
                className={cn(
                  "relative shrink-0 px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors duration-150",
                  active === "custom" ? "text-phosphor" : "text-field hover:text-bone",
                )}
              >
                CUSTOM
                <span className="ml-1 text-[10px] tabular-nums text-faint">
                  ({customCount})
                </span>
                {active === "custom" && (
                  <motion.span
                    layoutId="wire-tab-underline"
                    className="absolute inset-x-2 bottom-0 border-t-2 border-dashed border-phosphor"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </button>
            )}
          </div>

          {/* Timespan segmented control */}
          <div
            role="group"
            aria-label="Timespan"
            className="flex shrink-0 items-center gap-0.5"
          >
            {TIMESPANS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={timespan === t}
                onClick={() => onTimespan(t)}
                className={cn(
                  "rounded-[2px] border px-2.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors duration-150",
                  timespan === t
                    ? "border-phosphor-dim text-phosphor"
                    : "border-transparent text-field hover:text-bone",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Sort toggle */}
          <div role="group" aria-label="Sort order" className="flex shrink-0 items-center gap-0.5">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={sort === s.id}
                onClick={() => onSort(s.id)}
                className={cn(
                  "rounded-[2px] border px-2.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors duration-150",
                  sort === s.id
                    ? "border-phosphor-dim text-phosphor"
                    : "border-transparent text-field hover:text-bone",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Custom query */}
          <form
            className="w-full min-w-0 md:w-auto"
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
          >
            <div className="flex items-stretch gap-2">
              <div
                className={cn(
                  "flex h-9 flex-1 items-center gap-1.5 rounded-[2px] border bg-void px-3 transition-colors duration-150 md:w-80 md:flex-none",
                  error
                    ? "border-signal-red"
                    : "border-hairline focus-within:border-phosphor",
                )}
              >
                <span aria-hidden className="shrink-0 text-[11px] text-phosphor">
                  ▸
                </span>
                <input
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. (ceasefire OR talks) AND ukraine"
                  aria-label="Custom GDELT query"
                  aria-invalid={error !== null}
                  spellCheck={false}
                  className="w-full min-w-0 bg-transparent font-mono text-[12px] text-bone caret-phosphor placeholder:text-faint focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="h-9 shrink-0 rounded-[2px] bg-phosphor px-4 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-void transition-all duration-150 hover:-translate-y-px hover:bg-[#FFC133] active:scale-[0.98]"
              >
                RUN
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-1.5 font-mono text-[11px] text-signal-red">
                {error}
              </p>
            )}
          </form>
        </div>
      </div>
    </motion.div>
  );
}
