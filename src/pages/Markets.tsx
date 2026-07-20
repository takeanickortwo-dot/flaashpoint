/**
 * MARKETS — the full board (markets.md).
 * Section 1: page header + market status cluster (seed badge, as-of, stooq
 * refresh with silent fallback). Section 2: movers strip. Section 3: all 21
 * assets across 6 category panels with expandable chart drawers and
 * conflict-sensitivity tags. Section 4: "Reading the board" explainer.
 * Anchors: #<ticker> scrolls to, expands, and flash-updates that asset row.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { useMarketData } from "@/hooks/useMarketData";
import { Badge } from "@/components/StatusLED";
import { CategoryPanel } from "@/components/markets/CategoryPanel";
import { MoversStrip } from "@/components/markets/MoversStrip";
import { StatusCluster } from "@/components/markets/StatusCluster";
import type { StooqStatus } from "@/components/markets/StatusCluster";
import { snapIn, staggerParent } from "@/components/markets/motion";
import { SEED_MARKET_DATA } from "@/lib/markets";
import type { MarketAsset, MarketCategory } from "@/lib/markets";

/* ------------------------------------------------------------------ */
/* Board layout (markets.md §3): two per row at 6 cols, BIG TECH wide. */
/* FX & DOLLAR spans 12 so the single-instrument board tiles cleanly   */
/* with BIG TECH's 12-col two-column table (no half-empty grid row).   */
/* ------------------------------------------------------------------ */

const PANELS: { category: MarketCategory; title: string; war?: boolean; span: string }[] = [
  { category: "indices", title: "INDICES", span: "xl:col-span-6" },
  { category: "futures", title: "FUTURES", span: "xl:col-span-6" },
  { category: "energy", title: "ENERGY", war: true, span: "xl:col-span-6" },
  { category: "metals", title: "METALS", span: "xl:col-span-6" },
  { category: "fx", title: "FX & DOLLAR", span: "xl:col-span-12" },
  { category: "bigtech", title: "BIG TECH", span: "xl:col-span-12" },
];

const EXPLAINER: { glyph: string; title: string; body: string }[] = [
  {
    glyph: "⚡",
    title: "TAG",
    body: "Marks assets whose prices historically react to conflict headlines. Hover any tag for its linkage.",
  },
  {
    glyph: "◆",
    title: "SEED DATA",
    body: "Baseline snapshot embedded at build time (Jul 17 2026). The app attempts a delayed stooq refresh in-browser and falls back silently.",
  },
  {
    glyph: "▲▼",
    title: "COLOR LAW",
    body: "Green = up, red = down vs previous close. The VIX is labeled FEAR because its rise signals stress, not gain.",
  },
];

export default function Markets() {
  const { assets, source, asOf, refreshKey, refresh } = useMarketData();
  const location = useLocation();
  const navigate = useNavigate();

  /* One expanded row per panel; flash bookkeeping for anchor targets. */
  const [expanded, setExpanded] = useState<Partial<Record<MarketCategory, string | null>>>({});
  const [flash, setFlash] = useState<{ ticker: string | null; key: number }>({
    ticker: null,
    key: 0,
  });

  const toggleRow = useCallback((category: MarketCategory, ticker: string) => {
    setExpanded((prev) => ({ ...prev, [category]: prev[category] === ticker ? null : ticker }));
  }, []);

  /* ---------------------------- anchor ---------------------------- */
  const lastAnchor = useRef<string>("");

  const applyAnchor = useCallback(
    (hash: string) => {
      const raw = hash.replace(/^#/, "");
      if (!raw) return;
      let ticker = raw;
      try {
        ticker = decodeURIComponent(raw);
      } catch {
        /* keep raw */
      }
      const asset = assets.find((a) => a.ticker === ticker);
      if (!asset) return;
      setExpanded((prev) => ({ ...prev, [asset.category]: asset.ticker }));
      setFlash((f) => ({ ticker: asset.ticker, key: f.key + 1 }));
      window.setTimeout(() => {
        const els = document.querySelectorAll(`[data-mkt-row="${CSS.escape(asset.ticker)}"]`);
        const visible = Array.from(els).find(
          (e) => (e as HTMLElement).offsetParent !== null,
        );
        ((visible as HTMLElement | undefined) ?? (els[0] as HTMLElement | undefined))?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    },
    [assets],
  );

  useEffect(() => {
    if (!location.hash || location.hash === lastAnchor.current) return;
    lastAnchor.current = location.hash;
    applyAnchor(location.hash);
  }, [location.hash, applyAnchor]);

  const handleSelect = useCallback(
    (ticker: string) => {
      const enc = `#${encodeURIComponent(ticker)}`;
      if (location.hash === enc) {
        applyAnchor(enc);
        return;
      }
      lastAnchor.current = enc; // applyAnchor below covers the action
      applyAnchor(enc);
      navigate(enc);
    },
    [location.hash, applyAnchor, navigate],
  );

  /* --------------------- stooq status machine --------------------- */
  const [checking, setChecking] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<Date | null>(null);
  const [outcome, setOutcome] = useState<"ok" | "unavailable" | null>(null);
  const [spinCount, setSpinCount] = useState(0);
  const refreshKeyRef = useRef(refreshKey);
  const failTimer = useRef<number | null>(null);

  // A successful refresh (auto or manual) flips status to OK.
  useEffect(() => {
    if (refreshKey !== refreshKeyRef.current) {
      refreshKeyRef.current = refreshKey;
      setOutcome("ok");
      setChecking(false);
      if (failTimer.current !== null) {
        window.clearTimeout(failTimer.current);
        failTimer.current = null;
      }
    }
  }, [refreshKey]);

  useEffect(
    () => () => {
      if (failTimer.current !== null) window.clearTimeout(failTimer.current);
    },
    [],
  );

  const onRetry = useCallback(() => {
    if (checking) return;
    setSpinCount((c) => c + 1);
    setChecking(true);
    setLastAttempt(new Date());
    refresh();
    // tryStooqRefresh is fire-and-forget via the hook; if refreshKey has not
    // moved within 12s the attempt is treated as UNAVAILABLE (amber LED).
    failTimer.current = window.setTimeout(() => {
      failTimer.current = null;
      setChecking(false);
      setOutcome((prev) => prev ?? "unavailable");
    }, 12000);
  }, [checking, refresh]);

  const status: StooqStatus = checking
    ? "checking"
    : source === "stooq"
      ? "ok"
      : outcome === "unavailable"
        ? "unavailable"
        : "idle";

  /* --------------------------- derived ---------------------------- */
  const byCategory = useMemo(() => {
    const m = new Map<MarketCategory, MarketAsset[]>();
    for (const a of assets) {
      const arr = m.get(a.category) ?? [];
      arr.push(a);
      m.set(a.category, arr);
    }
    return m;
  }, [assets]);

  const { gainers, losers, vix } = useMemo(() => {
    const nonVix = assets.filter((a) => a.ticker !== "^VIX");
    const gainers = nonVix
      .filter((a) => a.changePct > 0)
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 3);
    const losers = nonVix
      .filter((a) => a.changePct < 0)
      .sort((a, b) => a.changePct - b.changePct)
      .slice(0, 3);
    return { gainers, losers, vix: assets.find((a) => a.ticker === "^VIX") };
  }, [assets]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Section 1 — page header + market status strip */}
      <header className="mx-auto max-w-content px-4 pb-6 pt-8 md:px-6 md:pb-7 md:pt-10 xl:px-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <motion.p
              className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-phosphor"
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 0.4 }}
            >
              ▸ CONFLICT-SENSITIVE ASSETS // SNAPSHOT + OPTIONAL DELAYED REFRESH
            </motion.p>
            <motion.h1
              className="mt-2 font-display text-[clamp(30px,4.5vw,56px)] font-bold uppercase leading-none text-bone"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            >
              Markets
            </motion.h1>
          </div>
          <StatusCluster
            source={source}
            asOf={asOf}
            status={status}
            lastAttempt={lastAttempt}
            checking={checking}
            spinCount={spinCount}
            onRetry={onRetry}
          />
        </div>
      </header>

      {/* Section 2 — movers strip */}
      <MoversStrip gainers={gainers} losers={losers} vix={vix} onSelect={handleSelect} />

      {/* Section 3 — category panels */}
      <section className="mx-auto max-w-content px-4 py-5 md:px-6 md:py-7 xl:px-10">
        <div className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-12">
          {PANELS.map((p) => (
            <CategoryPanel
              key={p.category}
              category={p.category}
              title={p.title}
              tag={
                p.war ? (
                  <Badge variant="conflict">
                    <span aria-hidden>⚡</span> WAR PREMIUM
                  </Badge>
                ) : undefined
              }
              assets={byCategory.get(p.category) ?? []}
              expandedTicker={expanded[p.category] ?? null}
              onToggle={(t) => toggleRow(p.category, t)}
              flashedTicker={flash.ticker}
              flashKey={flash.key}
              refreshKey={refreshKey}
              source={source}
              asOf={asOf}
              className={p.span}
            />
          ))}
        </div>
      </section>

      {/* Section 4 — reading the board */}
      <section className="mx-auto max-w-content px-4 pb-6 md:px-6 xl:px-10">
        <motion.div
          className="grid gap-0 border-t border-hairline pt-5 md:grid-cols-3 md:divide-x md:divide-hairline"
          variants={staggerParent(0.08, 0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {EXPLAINER.map((b, i) => (
            <motion.div
              key={b.title}
              variants={snapIn}
              className={
                i > 0
                  ? "border-t border-hairline py-4 md:border-t-0 md:px-5 md:py-0"
                  : "py-4 md:px-5 md:py-0 md:pl-0"
              }
            >
              <p className="flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-phosphor">
                <span aria-hidden>{b.glyph}</span>
                {b.title}
              </p>
              <p className="mt-2 font-sans text-[13px] leading-[1.6] text-field">{b.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* board meta (footer is shared via Layout) */}
      <div className="mx-auto flex max-w-content justify-end px-4 pb-8 md:px-6 xl:px-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
          {assets.length} ASSETS // 6 BOARDS // SNAPSHOT {SEED_MARKET_DATA.asOf.slice(0, 10)}
        </span>
      </div>
    </motion.div>
  );
}
