/**
 * StatusCluster — market status strip for the Markets header (markets.md §1).
 * Bracketed panel with three rows: SOURCE (seed badge / DELAYED QUOTES
 * (STOOQ)), AS OF (UTC stamp), STOOQ REFRESH (LED + IDLE/CHECKING/OK/
 * UNAVAILABLE + last attempt + ghost RETRY button; icon rotates 360°/0.6s,
 * LED pulses amber during flight). Silent fallback — never blocks render.
 */

import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Panel } from "@/components/Panel";
import { Badge, SeedDataBadge, StatusLED } from "@/components/StatusLED";
import type { LedTone } from "@/components/StatusLED";
import { snapIn, staggerParent } from "@/components/markets/motion";
import { fmtUtcTime, formatAsOf } from "@/lib/markets";

export type StooqStatus = "idle" | "checking" | "ok" | "unavailable";

const STATUS_META: Record<StooqStatus, { tone: LedTone; label: string; pulse: boolean }> = {
  idle: { tone: "field", label: "IDLE", pulse: false },
  checking: { tone: "amber", label: "CHECKING…", pulse: true },
  ok: { tone: "green", label: "OK", pulse: true },
  unavailable: { tone: "amber", label: "UNAVAILABLE", pulse: true },
};

function StatusRow({
  label,
  title,
  children,
}: {
  label: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={snapIn}
      title={title}
      className="flex items-center justify-between gap-3 border-b border-hairline px-3 py-2.5 last:border-b-0"
    >
      <span className="shrink-0 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-field">
        {label}
      </span>
      <span className="flex min-w-0 items-center justify-end gap-2">{children}</span>
    </motion.div>
  );
}

export function StatusCluster({
  source,
  asOf,
  status,
  lastAttempt,
  checking,
  spinCount,
  onRetry,
}: {
  source: "seed" | "stooq";
  asOf: Date;
  status: StooqStatus;
  lastAttempt: Date | null;
  checking: boolean;
  /** Increments per retry click — drives the 360° icon spin. */
  spinCount: number;
  onRetry: () => void;
}) {
  const meta = STATUS_META[status];

  return (
    <Panel
      variant="bracketed"
      padded={false}
      className="w-full lg:w-[430px] lg:shrink-0"
      bodyClassName="py-0.5"
    >
      <motion.div variants={staggerParent(0.05, 0.15)} initial="hidden" animate="show">
        <StatusRow label="SOURCE">
          <span className="truncate font-mono text-[11px] uppercase tracking-[0.08em] text-bone">
            Yahoo Finance snapshot
          </span>
          {source === "stooq" ? (
            <Badge variant="delayed">DELAYED QUOTES (STOOQ)</Badge>
          ) : (
            <SeedDataBadge />
          )}
        </StatusRow>

        <StatusRow label="AS OF" title={asOf.toISOString()}>
          <span
            key={asOf.getTime()}
            className="animate-flash-update font-mono text-[13px] font-medium tabular-nums text-bone"
          >
            {formatAsOf(asOf)}
          </span>
        </StatusRow>

        <StatusRow
          label="STOOQ REFRESH"
          title={
            status === "unavailable"
              ? "Falling back to seed snapshot — display unchanged."
              : "Best-effort delayed quotes from stooq.com"
          }
        >
          <StatusLED tone={meta.tone} label={meta.label} pulse={meta.pulse} />
          <span className="hidden font-mono text-[10px] tabular-nums text-faint min-[420px]:inline">
            LAST {lastAttempt ? `${fmtUtcTime(lastAttempt)} UTC` : "—"}
          </span>
          <button
            type="button"
            onClick={onRetry}
            disabled={checking}
            aria-label="Retry stooq delayed refresh"
            title="Retry stooq delayed refresh (silent fallback to seed)"
            className="inline-flex h-7 items-center gap-1.5 rounded-[2px] border border-hairline-strong px-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-bone transition-colors duration-150 hover:border-phosphor hover:text-phosphor disabled:cursor-wait disabled:opacity-60"
          >
            <motion.span
              className="inline-flex"
              animate={{ rotate: spinCount * 360 }}
              transition={{ duration: 0.6, ease: "linear" }}
            >
              <RefreshCw size={12} aria-hidden />
            </motion.span>
            RETRY
          </button>
        </StatusRow>
      </motion.div>
    </Panel>
  );
}
