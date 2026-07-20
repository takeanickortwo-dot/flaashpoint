/**
 * Footer (design.md §8.3) — 3 columns: mission + status LEDs · DATA SOURCES ·
 * CLOCKS; bottom disclaimer row. `compact` prop renders the single-row
 * variant used by Wire / Hotspots.
 */

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusLED } from "@/components/StatusLED";
import { useUtcClock } from "@/hooks/useUtcClock";
import { MARKET_ASOF_LABEL } from "@/lib/markets";

const DISCLAIMER =
  "FLASHPOINT aggregates publicly available news and delayed market data for informational purposes only. Nothing here is financial advice. News © respective publishers via GDELT.";

const SOURCES = [
  { label: "GDELT Project DOC 2.1", href: "https://www.gdeltproject.org/" },
  { label: "Yahoo Finance snapshot", href: "https://finance.yahoo.com/" },
  { label: "stooq.com", href: "https://stooq.com/" },
];

export function Footer({
  compact = false,
  note,
  className,
}: {
  compact?: boolean;
  /** Right-hand mono note on compact footers (page-specific). */
  note?: string;
  className?: string;
}) {
  const { utc, local, tzLabel } = useUtcClock();

  if (compact) {
    return (
      <footer className={cn("border-t border-hairline bg-void", className)}>
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-2 px-4 py-4 md:px-6 xl:px-10">
          <p className="max-w-2xl font-sans text-[13px] leading-relaxed text-faint">
            {DISCLAIMER}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
            {note ?? "GDELT DOC 2.1 // MAX 1 REQ / 5S // CACHE LOCAL"}
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className={cn("border-t border-hairline bg-void", className)}>
      <div className="mx-auto max-w-content px-4 py-8 md:px-6 xl:px-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Mission + status */}
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="" width={20} height={20} />
              <span className="font-display text-sm font-bold uppercase tracking-[0.12em] text-bone">
                Flashpoint
              </span>
            </div>
            <p className="mt-3 max-w-xs font-sans text-[13px] leading-relaxed text-field">
              One screen fusing live conflict wires with the markets wars actually
              move.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <StatusLED tone="green" label="GDELT" />
              <StatusLED tone="amber" label="MKT SEED" />
              <StatusLED tone="teal" label="CYCLE 60S" pulse={false} />
            </div>
          </div>

          {/* Data sources */}
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-bone">
              Data Sources
            </h3>
            <ul className="mt-3 space-y-2">
              {SOURCES.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-[12px] text-field transition-colors hover:text-phosphor"
                  >
                    {s.label}
                    <ExternalLink size={11} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Clocks */}
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-bone">
              Clocks
            </h3>
            <dl className="mt-3 space-y-2 font-mono text-[12px] tabular-nums">
              <div className="flex justify-between gap-4 border-b border-hairline pb-2">
                <dt className="text-faint">UTC</dt>
                <dd className="text-bone">{utc}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-hairline pb-2">
                <dt className="text-faint">LOCAL {tzLabel}</dt>
                <dd className="text-bone">{local}</dd>
              </div>
              <div className="flex justify-between gap-4 pb-1">
                <dt className="text-faint">MARKET AS-OF</dt>
                <dd className="text-field">{MARKET_ASOF_LABEL}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <p className="max-w-3xl font-sans text-[13px] leading-relaxed text-faint">
            {DISCLAIMER}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
            v1.0 // STATIC BUILD
          </p>
        </div>
      </div>
    </footer>
  );
}
