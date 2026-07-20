/**
 * WIRE — Section 1: page header strip (wire.md).
 * Left: display-lg "CONFLICT WIRE" + GDELT kicker. Right: status cluster —
 * big LED + LIVE/DELAYED, last fetch HH:MM:SS UTC (flash-update), articles in
 * view, 40px CountdownRing (+24px on mobile), AUTO 60S switch, refresh button.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { secondsUntilNextSlot } from "@/lib/gdelt";
import { fmtUtcTime } from "@/lib/markets";
import { exactUtcTitle } from "@/hooks/useRelativeTime";
import type { GdeltFeedStatus } from "@/hooks/useGdeltFeed";
import { CountdownRing } from "@/components/CountdownRing";
import { Badge } from "@/components/StatusLED";
import { Switch } from "@/components/ui/switch";

const EASE_SNAP = [0.22, 1, 0.36, 1] as [number, number, number, number];

const clusterParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

const clusterItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_SNAP } },
};

const LED_COLORS: Record<string, string> = {
  green: "#3DDC84",
  amber: "#FFB000",
  red: "#FF4A3D",
  field: "#969B8A",
};

export function WireHeader({
  status,
  asOf,
  fetchKey,
  articleCount,
  secondsRemaining,
  auto,
  onAutoChange,
  onRefreshNow,
}: {
  status: GdeltFeedStatus;
  asOf: Date | null;
  fetchKey: number;
  articleCount: number;
  secondsRemaining: number;
  auto: boolean;
  onAutoChange: (v: boolean) => void;
  onRefreshNow: () => void;
}) {
  const [shake, setShake] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const tone =
    status === "live"
      ? "green"
      : status === "delayed"
        ? "amber"
        : status === "error"
          ? "red"
          : "field";
  const statusLabel =
    status === "live"
      ? "LIVE"
      : status === "delayed"
        ? "DELAYED"
        : status === "error"
          ? "ERROR"
          : "ACQ";
  const ledColor = LED_COLORS[tone];
  const slotWait = secondsUntilNextSlot();

  const handleRefresh = () => {
    if (secondsUntilNextSlot() > 0) {
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
      return;
    }
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 700);
    onRefreshNow();
  };

  return (
    <header className="mx-auto max-w-content px-4 pt-5 md:px-6 md:pt-6 xl:px-10">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        {/* Title block — snap-in 0.3s */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_SNAP }}
        >
          <p className="fp-label text-phosphor">
            GDELT DOC 2.1 // GLOBAL NEWS SCAN // ENGLISH-LANGUAGE SOURCES
          </p>
          <h1 className="mt-1.5 font-display text-[clamp(30px,4.5vw,56px)] font-bold uppercase leading-none text-bone">
            Conflict Wire
          </h1>
        </motion.div>

        {/* Status cluster — stagger 0.04 */}
        <motion.div
          className="flex flex-wrap items-center gap-x-5 gap-y-3"
          variants={clusterParent}
          initial="hidden"
          animate="show"
        >
          {/* Big LED + LIVE/DELAYED */}
          <motion.div variants={clusterItem} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="inline-block size-2.5 rounded-full animate-led-pulse transition-[background-color] duration-200"
              style={{ backgroundColor: ledColor, boxShadow: `0 0 8px ${ledColor}66` }}
            />
            <span
              className="font-mono text-[14px] font-medium uppercase tracking-[0.12em] transition-colors duration-200"
              style={{ color: ledColor }}
            >
              {statusLabel}
            </span>
          </motion.div>

          {/* DELAYED — SHOWING CACHE badge (slides in from right) */}
          <AnimatePresence>
            {status === "delayed" && (
              <motion.span
                key="cache-badge"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.25 }}
              >
                <Badge variant="delayed">DELAYED — SHOWING CACHE</Badge>
              </motion.span>
            )}
          </AnimatePresence>

          {/* Last successful fetch */}
          <motion.div variants={clusterItem} className="flex flex-col leading-none">
            <span className="fp-label">Last fetch UTC</span>
            <span
              key={`asof-${fetchKey}`}
              title={asOf ? exactUtcTitle(asOf) : undefined}
              className={cn(
                "mt-1.5 font-mono text-[13px] tabular-nums text-bone",
                fetchKey > 0 && "animate-flash-update",
              )}
            >
              {asOf ? `${fmtUtcTime(asOf)} UTC` : "—"}
            </span>
          </motion.div>

          {/* Articles in current view */}
          <motion.div variants={clusterItem} className="flex flex-col leading-none">
            <span className="fp-label">In view</span>
            <span
              key={`count-${fetchKey}`}
              className={cn(
                "mt-1.5 font-mono text-[13px] tabular-nums text-bone",
                fetchKey > 0 && "animate-flash-update",
              )}
            >
              {articleCount}
            </span>
          </motion.div>

          {/* Ring + AUTO switch + refresh */}
          <motion.div variants={clusterItem} className="flex items-center gap-2.5">
            <motion.span
              key={`ring-${fetchKey}`}
              initial={fetchKey > 0 ? { opacity: 0.3, scale: 0.9 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="inline-flex"
            >
              <CountdownRing
                secondsRemaining={secondsRemaining}
                size={40}
                onRefresh={onRefreshNow}
                className="hidden md:inline-flex"
              />
              <CountdownRing
                secondsRemaining={secondsRemaining}
                size={24}
                onRefresh={onRefreshNow}
                className="md:hidden"
              />
            </motion.span>
            <label className="flex cursor-pointer items-center gap-2">
              <Switch
                checked={auto}
                onCheckedChange={onAutoChange}
                aria-label="Auto refresh every 60 seconds"
              />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-field">
                AUTO 60S
              </span>
            </label>
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh wire now (R)"
              title={
                slotWait > 0 ? `RATE LIMIT — NEXT SLOT IN ${slotWait}s` : "Refresh now (R)"
              }
              className={cn(
                "flex size-8 items-center justify-center rounded-[2px] border border-hairline-strong text-bone transition-colors hover:border-phosphor hover:text-phosphor active:scale-95",
                shake && "animate-ring-shake",
              )}
            >
              <RefreshCw
                size={14}
                className={cn("transition-transform duration-700", spinning && "rotate-[360deg]")}
              />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </header>
  );
}
