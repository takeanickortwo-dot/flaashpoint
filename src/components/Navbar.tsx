/**
 * Navbar (design.md §8.1) — sticky top-0 z-50, 56px, console bg.
 * Logo + FLASHPOINT wordmark, nav links, dual UTC/local clock, global
 * LIVE/DELAYED pill, countdown ring + manual refresh, mobile drawer.
 */

import { useState, useSyncExternalStore } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUtcClock } from "@/hooks/useUtcClock";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { CountdownRing } from "@/components/CountdownRing";
import { StatusLED } from "@/components/StatusLED";
import {
  getGlobalFeedStatus,
  subscribeFeedStatus,
} from "@/lib/feedStatus";
import { secondsUntilNextSlot } from "@/lib/gdelt";

export const NAV_LINKS = [
  { to: "/", label: "COMMAND DECK" },
  { to: "/wire", label: "WIRE" },
  { to: "/markets", label: "MARKETS" },
  { to: "/hotspots", label: "HOTSPOTS" },
  { to: "/about", label: "BRIEFING" },
] as const;

function GlobalStatusPill() {
  const status = useSyncExternalStore(subscribeFeedStatus, getGlobalFeedStatus, getGlobalFeedStatus);
  const label = status === "live" ? "LIVE" : status === "error" ? "ERROR" : status === "idle" ? "STANDBY" : "DELAYED";
  const tone = status === "live" ? "green" : status === "error" ? "red" : status === "idle" ? "field" : "amber";
  return (
    <span className="flex items-center gap-1.5 rounded-[2px] border border-hairline px-2 py-1">
      <StatusLED tone={tone} />
      <span
        className={cn(
          "font-mono text-[10px] font-medium uppercase tracking-[0.16em]",
          tone === "green" && "text-signal-green",
          tone === "amber" && "text-phosphor",
          tone === "red" && "text-signal-red",
          tone === "field" && "text-field",
        )}
      >
        {label}
      </span>
    </span>
  );
}

export function Navbar() {
  const { utc, local, tzLabel } = useUtcClock();
  const { secondsRemaining, refreshNow } = useRefreshCountdown();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const location = useLocation();

  // Close drawer on route change (render-time state adjustment pattern).
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setDrawerOpen(false);
  }

  const handleRefresh = () => {
    if (secondsUntilNextSlot() > 0) return;
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 700);
    refreshNow();
  };

  return (
    <header className="relative z-50 h-14 border-b border-hairline bg-console">
      <div className="mx-auto flex h-full max-w-content items-center gap-4 px-4 md:px-6 xl:px-10">
        {/* Logo + wordmark */}
        <Link to="/" className="group flex shrink-0 items-center gap-2.5">
          <img src="/logo.svg" alt="FLASHPOINT logo" width={22} height={22} className="shrink-0" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-bold uppercase tracking-[0.12em] text-bone transition-[letter-spacing] duration-200 group-hover:tracking-[0.18em] group-hover:text-phosphor">
              Flashpoint
            </span>
            <span className="mt-1 hidden font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-faint md:block">
              Global Conflict &amp; Markets Monitor
            </span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav aria-label="Primary" className="ml-2 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "group relative px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-150",
                  isActive ? "text-phosphor" : "text-field hover:text-bone",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-3 -bottom-px h-0.5 origin-left bg-phosphor transition-transform duration-150",
                      isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden flex-col items-end leading-none sm:flex" aria-label="Clocks">
            <span className="font-mono text-[13px] font-medium tabular-nums text-bone">
              {utc} <span className="text-[10px] text-faint">UTC</span>
            </span>
            <span className="mt-1 font-mono text-[11px] tabular-nums text-field">
              {local} {tzLabel}
            </span>
          </div>

          <GlobalStatusPill />

          <div className="flex items-center gap-1.5">
            <CountdownRing secondsRemaining={secondsRemaining} size={24} onRefresh={handleRefresh} />
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh data now"
              title="Refresh now"
              className="flex size-8 items-center justify-center rounded-[2px] border border-hairline-strong text-bone transition-colors hover:border-phosphor hover:text-phosphor active:scale-95"
            >
              <RefreshCw
                size={14}
                className={cn("transition-transform duration-700", spinning && "rotate-[360deg]")}
              />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((o) => !o)}
            className="flex size-8 items-center justify-center rounded-[2px] border border-hairline-strong text-bone transition-colors hover:border-phosphor hover:text-phosphor md:hidden"
          >
            {drawerOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.nav
            aria-label="Mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 top-14 overflow-hidden border-b border-hairline bg-console md:hidden"
          >
            <div className="flex flex-col px-4 py-2">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                >
                  <NavLink
                    to={link.to}
                    end={link.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "block border-b border-hairline py-3 font-mono text-[12px] font-medium uppercase tracking-[0.14em] last:border-b-0",
                        isActive ? "text-phosphor" : "text-field",
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                </motion.div>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
