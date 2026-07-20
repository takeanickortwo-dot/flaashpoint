/**
 * COMMAND DECK — the flagship war-room screen (design/home.md).
 * Situation hero → flash alert → market grid → live wire preview →
 * intensity analytics → markets↔conflict correlation.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion, useInView } from "framer-motion";
import type { Variants } from "framer-motion";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

import { useUtcClock } from "@/hooks/useUtcClock";
import { useMarketData } from "@/hooks/useMarketData";
import { useWireBoard } from "@/hooks/useWireBoard";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { relativeTimeLabel, exactUtcTitle } from "@/hooks/useRelativeTime";

import {
  MARKET_ASOF_LABEL,
  computeEscalationIndex,
  escalationBand,
  ESCALATION_BAND_COLORS,
  fmtPct,
  fmtPrice,
} from "@/lib/markets";
import type { MarketAsset, MarketCategory } from "@/lib/markets";
import { GDELT_FEEDS, parseSeendate } from "@/lib/gdelt";
import type { GdeltArticle, GdeltFeedId } from "@/lib/gdelt";
import { tallyHotspots } from "@/lib/hotspots";

import { Panel } from "@/components/Panel";
import { AlertBanner } from "@/components/AlertBanner";
import { ChangeChip } from "@/components/ChangeChip";
import { Sparkline } from "@/components/Sparkline";
import { EscalationGauge } from "@/components/EscalationGauge";
import { CountdownRing } from "@/components/CountdownRing";
import { SectionHeader } from "@/components/SectionHeader";
import { Badge, SeedDataBadge, StatusLED } from "@/components/StatusLED";
import { Switch } from "@/components/ui/switch";

/* ------------------------------------------------------------------ */
/* Motion variants (design.md §6)                                      */
/* ------------------------------------------------------------------ */

const EASE_SNAP = [0.22, 1, 0.36, 1] as [number, number, number, number];
const EASE_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const snapIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_SNAP } },
};

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

/** Expo-out count-up on first paint / value change. */
function useCountUp(value: number, durationMs = 1200): number {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      const v = start + (value - start) * eased;
      setDisplay(v);
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return display;
}

/** Kinetic word-mask reveal: each word slides up from y:110% in an overflow mask. */
function KineticWords({
  text,
  className,
  delay = 0,
  stagger = 0.06,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const words = text.split(" ");
  return (
    <span className={cn("inline", className)}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block will-change-transform"
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.7, ease: EASE_EXPO, delay: delay + i * stagger }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Bucket article seendates into an N-slot histogram over the last 24h. */
function articleHistogram(articles: GdeltArticle[], buckets = 12): number[] {
  const now = Date.now();
  const span = 24 * 60 * 60 * 1000;
  const counts = new Array<number>(buckets).fill(0);
  for (const a of articles) {
    const d = parseSeendate(a.seendate);
    if (!d) continue;
    const age = now - d.getTime();
    if (age < 0 || age > span) continue;
    const idx = Math.min(buckets - 1, Math.floor(((span - age) / span) * buckets));
    counts[idx] += 1;
  }
  return counts;
}

/** Relative time tone per wire.md (<15m amber, <1h bone, else field). */
function timeTone(date: Date | null): string {
  if (!date) return "text-field";
  const age = Date.now() - date.getTime();
  if (age < 15 * 60 * 1000) return "text-phosphor";
  if (age < 60 * 60 * 1000) return "text-bone";
  return "text-field";
}

/* ------------------------------------------------------------------ */
/* Section 1 — Situation Hero                                          */
/* ------------------------------------------------------------------ */

function SitrepRow({
  label,
  children,
  to,
  delay = 0,
}: {
  label: string;
  children: React.ReactNode;
  to?: string;
  delay?: number;
}) {
  const inner = (
    <>
      <span
        aria-hidden
        className="absolute left-0 top-1/2 -translate-y-1/2 text-phosphor opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        ▸
      </span>
      <span className="fp-label transition-transform duration-150 group-hover:translate-x-2.5">
        {label}
      </span>
      <span className="flex items-center gap-2 text-right">{children}</span>
    </>
  );
  const cls =
    "group relative flex items-center justify-between gap-3 border-b border-hairline px-3 py-2.5 transition-colors duration-150 last:border-b-0 hover:bg-raised";
  return (
    <motion.div variants={snapIn} transition={{ delay }}>
      {to ? (
        <Link to={to} className={cls}>
          {inner}
        </Link>
      ) : (
        <div className={cls}>{inner}</div>
      )}
    </motion.div>
  );
}

function SituationHero({
  escalation,
  wireCount,
  timelineValues,
  feedStatus,
  feedAsOf,
  wti,
  brent,
  vix,
}: {
  escalation: number;
  wireCount: number;
  timelineValues: number[];
  feedStatus: "loading" | "live" | "delayed" | "error";
  feedAsOf: Date | null;
  wti?: MarketAsset;
  brent?: MarketAsset;
  vix?: MarketAsset;
}) {
  const { utc, utcDate } = useUtcClock();
  const heroRef = useRef<HTMLDivElement>(null);
  const inView = useInView(heroRef, { amount: 0.2 });
  const band = escalationBand(escalation);
  const bandColor = ESCALATION_BAND_COLORS[band];
  const escDisplay = useCountUp(escalation, 1200);

  return (
    <section ref={heroRef} className="relative overflow-hidden">
      {/* Reticle backdrop + radar sweep (sweep only while hero in viewport) */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 hidden -translate-y-1/2 md:block lg:right-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ duration: 1 }}
      >
        <div className="relative size-[520px]">
          <img src="/hero-reticle.svg" alt="" className="absolute inset-0 size-full" />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(255,176,0,0.08) 0deg 12deg, transparent 12deg 360deg)",
              animation: "sweep 6s linear infinite",
              animationPlayState: inView ? "running" : "paused",
            }}
          />
        </div>
      </motion.div>

      <div className="relative mx-auto grid max-w-content grid-cols-1 gap-10 px-4 py-10 md:px-6 md:py-14 lg:grid-cols-12 xl:px-10">
        {/* Left: kicker + kinetic headline + subline + CTAs */}
        <div className="lg:col-span-7">
          <motion.p
            className="fp-label text-phosphor"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 0.4 }}
          >
            ▸ LIVE SITUATION MONITOR // {utcDate.toUpperCase()}
          </motion.p>

          <h1 className="mt-5 font-display font-bold uppercase leading-[0.95] tracking-[-0.01em]">
            <span className="block text-[clamp(44px,7vw,88px)] text-bone">
              <KineticWords text="WAR MOVES MARKETS." delay={0.2} />
            </span>
            <span className="block text-[clamp(44px,7vw,88px)] text-phosphor">
              <KineticWords text="TRACK BOTH." delay={0.45} />
            </span>
            <span className="block text-[clamp(26px,4.2vw,53px)] text-field">
              <KineticWords text="IN REAL TIME." delay={0.7} />
            </span>
          </h1>

          <motion.p
            className="mt-6 max-w-[52ch] font-sans text-[15px] leading-[1.65] text-bone/85"
            variants={snapIn}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.9 }}
          >
            Live conflict wires from GDELT fused with oil, gold, index futures,
            the S&amp;P 500, the VIX, the dollar and big tech — one screen, no
            noise.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center gap-3"
            variants={snapIn}
            initial="hidden"
            animate="show"
            transition={{ delay: 1.05 }}
          >
            <Link
              to="/wire"
              className="inline-flex h-9 items-center gap-2 rounded-[2px] bg-phosphor px-4 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-void transition-all duration-150 hover:-translate-y-px hover:bg-[#FFC133] active:scale-[0.98]"
            >
              Open Conflict Wire
              <ArrowUpRight size={13} aria-hidden />
            </Link>
            <Link
              to="/markets"
              className="inline-flex h-9 items-center gap-2 rounded-[2px] border border-hairline-strong px-4 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-bone transition-all duration-150 hover:border-phosphor hover:text-phosphor active:scale-[0.98]"
            >
              View Markets
            </Link>
          </motion.div>
        </div>

        {/* Right: SITREP BOARD */}
        <div className="relative lg:col-span-5">
          <Panel
            variant="bracketed"
            title="SITREP BOARD"
            led="green"
            padded={false}
            meta={
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                UPDATING 60S
              </span>
            }
            className="relative z-10"
            bodyClassName="px-1.5 py-1.5"
          >
            <motion.div variants={staggerParent} initial="hidden" animate="show">
              <SitrepRow label="UTC TIME">
                <span className="font-mono text-xl font-semibold tabular-nums text-bone">
                  {utc}
                </span>
              </SitrepRow>

              <SitrepRow label="ESCALATION INDEX">
                <span
                  className="font-mono text-3xl font-bold tabular-nums"
                  style={{ color: bandColor }}
                >
                  {Math.round(escDisplay)}
                </span>
                <span
                  className="rounded-[2px] border px-1.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em]"
                  style={{ color: bandColor, borderColor: bandColor }}
                >
                  {band}
                </span>
              </SitrepRow>

              <SitrepRow label="WIRE VOLUME 24H" to="/wire">
                <span className="font-mono text-[13px] tabular-nums text-bone">
                  {wireCount} STORIES
                </span>
                <Sparkline
                  series={timelineValues}
                  width={72}
                  height={20}
                  stroke="#FFB000"
                  area
                />
              </SitrepRow>

              <SitrepRow label="WTI / BRENT" to="/markets#CL=F">
                <span className="font-mono text-[13px] tabular-nums text-bone">
                  ${wti ? fmtPrice(wti.price) : "—"}
                  <span className="text-signal-green"> {wti ? fmtPct(wti.changePct) : ""}</span>
                  <span className="text-faint"> / </span>${brent ? fmtPrice(brent.price) : "—"}
                  <span className="text-signal-green">
                    {" "}
                    {brent ? fmtPct(brent.changePct) : ""}
                  </span>
                </span>
              </SitrepRow>

              <SitrepRow label="VIX" to="/markets#%5EVIX">
                <span className="font-mono text-[13px] tabular-nums text-bone">
                  {vix ? fmtPrice(vix.price) : "—"}
                </span>
                {vix && <ChangeChip changePct={vix.changePct} />}
                <Badge variant="conflict">FEAR</Badge>
              </SitrepRow>

              <SitrepRow label="FEED STATUS">
                <StatusLED
                  tone={
                    feedStatus === "live"
                      ? "green"
                      : feedStatus === "error"
                        ? "red"
                        : feedStatus === "delayed"
                          ? "amber"
                          : "field"
                  }
                  label={feedStatus === "loading" ? "ACQ" : feedStatus}
                />
                <span className="font-mono text-[11px] tabular-nums text-field">
                  {feedAsOf
                    ? `${String(feedAsOf.getUTCHours()).padStart(2, "0")}:${String(
                        feedAsOf.getUTCMinutes(),
                      ).padStart(2, "0")}:${String(feedAsOf.getUTCSeconds()).padStart(2, "0")} UTC`
                    : "—"}
                </span>
              </SitrepRow>
            </motion.div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 3 — THE BOARDS (market grid)                                */
/* ------------------------------------------------------------------ */

function AssetRow({ asset, refreshKey }: { asset: MarketAsset; refreshKey: number }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/markets#${encodeURIComponent(asset.ticker)}`)}
      className="group flex h-10 w-full items-center gap-2 border-b border-hairline px-1 text-left transition-colors duration-150 last:border-b-0 hover:bg-raised"
    >
      <span className="w-[72px] shrink-0 font-mono text-[13px] font-bold tabular-nums text-bone group-hover:text-phosphor">
        {asset.ticker}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-field">
        {asset.name}
        {asset.unit ? <span className="text-faint"> · {asset.unit}</span> : null}
      </span>
      <Sparkline
        series={asset.series}
        width={72}
        height={24}
        className="hidden shrink-0 transition-[stroke-width] sm:block"
      />
      <span
        key={`p-${refreshKey}`}
        className={cn(
          "w-[86px] shrink-0 text-right font-mono text-[13px] tabular-nums text-bone",
          refreshKey > 0 && "animate-flash-update",
        )}
      >
        {fmtPrice(asset.price)}
      </span>
      <span className="flex w-[92px] shrink-0 justify-end">
        <ChangeChip changePct={asset.changePct} />
      </span>
      {asset.ticker === "^VIX" && <Badge variant="conflict">FEAR</Badge>}
    </button>
  );
}

function BigTechMiniRow({ asset, refreshKey }: { asset: MarketAsset; refreshKey: number }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/markets#${encodeURIComponent(asset.ticker)}`)}
      className="group flex h-9 w-full items-center gap-1.5 border-b border-hairline px-1 text-left transition-colors duration-150 hover:bg-raised"
    >
      <span className="w-[52px] shrink-0 font-mono text-[12px] font-bold tabular-nums text-bone group-hover:text-phosphor">
        {asset.ticker}
      </span>
      <Sparkline series={asset.series} width={48} height={16} className="hidden shrink-0 min-[420px]:block" />
      <span
        key={`p-${refreshKey}`}
        className={cn(
          "min-w-0 flex-1 truncate text-right font-mono text-[11px] tabular-nums text-field",
          refreshKey > 0 && "animate-flash-update",
        )}
      >
        {fmtPrice(asset.price)}
      </span>
      <ChangeChip changePct={asset.changePct} className="px-1 text-[10px]" />
    </button>
  );
}

function BoardPanel({
  category,
  title,
  assets,
  refreshKey,
  tag,
}: {
  category: MarketCategory;
  title: string;
  assets: MarketAsset[];
  refreshKey: number;
  tag?: React.ReactNode;
}) {
  const avg =
    assets.length > 0
      ? assets.reduce((s, a) => s + a.changePct, 0) / assets.length
      : 0;
  return (
    <motion.div variants={snapIn} className="lg:col-span-4">
      <Panel
        title={title}
        padded={false}
        meta={
          <span className="flex items-center gap-2">
            {tag}
            <ChangeChip changePct={avg} />
          </span>
        }
        className="group/board"
        bodyClassName="px-2 py-1"
      >
        <div className="relative">
          <Link
            to="/markets"
            className="pointer-events-none absolute -top-9 right-24 z-20 font-mono text-[10px] uppercase tracking-[0.14em] text-phosphor opacity-0 transition-opacity duration-150 group-hover/board:pointer-events-auto group-hover/board:opacity-100"
          >
            OPEN FULL BOARD →
          </Link>
          {category === "bigtech" ? (
            <div className="grid grid-cols-1 gap-x-3 min-[420px]:grid-cols-2">
              {assets.map((a) => (
                <BigTechMiniRow key={a.ticker} asset={a} refreshKey={refreshKey} />
              ))}
            </div>
          ) : (
            assets.map((a) => <AssetRow key={a.ticker} asset={a} refreshKey={refreshKey} />)
          )}
        </div>
      </Panel>
    </motion.div>
  );
}

function MarketBoards({
  assets,
  source,
  refreshKey,
  onRefresh,
}: {
  assets: MarketAsset[];
  source: "seed" | "stooq";
  refreshKey: number;
  onRefresh: () => void;
}) {
  const byCategory = (c: MarketCategory) => assets.filter((a) => a.category === c);
  const boards: { category: MarketCategory; title: string; tag?: React.ReactNode }[] = [
    { category: "indices", title: "INDICES" },
    {
      category: "energy",
      title: "ENERGY",
      tag: (
        <Badge variant="conflict">
          <span aria-hidden>⚡</span> WAR PREMIUM
        </Badge>
      ),
    },
    { category: "futures", title: "FUTURES" },
    { category: "metals", title: "METALS" },
    { category: "fx", title: "FX + DOLLAR" },
    { category: "bigtech", title: "BIG TECH" },
  ];

  return (
    <section className="mx-auto max-w-content px-4 py-5 md:px-6 md:py-7 xl:px-10">
      <SectionHeader
        title="THE BOARDS — CONFLICT-SENSITIVE MARKETS"
        meta={
          <>
            {source === "stooq" ? (
              <Badge variant="delayed">DELAYED · STOOQ</Badge>
            ) : (
              <SeedDataBadge />
            )}
            <span className="hidden font-mono text-[11px] tabular-nums text-field sm:block">
              as of {MARKET_ASOF_LABEL}
            </span>
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Attempt delayed market refresh from stooq"
              title="Refresh market data (stooq, delayed)"
              className="flex size-8 items-center justify-center rounded-[2px] border border-hairline-strong text-bone transition-colors hover:border-phosphor hover:text-phosphor active:scale-95"
            >
              <RefreshCw size={14} />
            </button>
          </>
        }
        className="mb-4"
      />
      <motion.div
        className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-12"
        variants={staggerParent}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        {boards.map((b) => (
          <BoardPanel
            key={b.category}
            category={b.category}
            title={b.title}
            assets={byCategory(b.category)}
            refreshKey={refreshKey}
            tag={b.tag}
          />
        ))}
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 4a — Conflict Wire preview                                  */
/* ------------------------------------------------------------------ */

function WirePreview({
  board,
  auto,
  onAutoChange,
}: {
  board: ReturnType<typeof useWireBoard>;
  auto: boolean;
  onAutoChange: (v: boolean) => void;
}) {
  const [active, setActive] = useState<GdeltFeedId>("breaking");
  const { secondsRemaining, refreshNow } = useRefreshCountdown();

  // Keys 1–5 jump feeds.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return;
      const n = Number.parseInt(e.key, 10);
      if (n >= 1 && n <= GDELT_FEEDS.length) setActive(GDELT_FEEDS[n - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const feed = board.feeds[active];
  const articles = feed.articles.slice(0, 8);

  return (
    <Panel
      title="CONFLICT WIRE — LIVE GDELT"
      led={feed.status === "live" ? "green" : feed.status === "error" ? "red" : "amber"}
      padded={false}
      meta={
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
          {feed.status === "loading"
            ? "ACQUIRING…"
            : feed.asOf
              ? `AS OF ${String(feed.asOf.getUTCHours()).padStart(2, "0")}:${String(
                  feed.asOf.getUTCMinutes(),
                ).padStart(2, "0")} UTC`
              : "—"}
        </span>
      }
      className="h-full"
      bodyClassName="flex flex-col p-0"
    >
      {/* Feed tabs */}
      <div
        role="tablist"
        aria-label="GDELT feeds"
        className="flex items-center gap-0.5 overflow-x-auto border-b border-hairline px-2"
      >
        {GDELT_FEEDS.map((f) => {
          const isActive = f.id === active;
          const count = board.feeds[f.id].articles.length;
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(f.id)}
              className={cn(
                "relative shrink-0 px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors duration-150",
                isActive ? "text-phosphor" : "text-field hover:text-bone",
              )}
            >
              {f.label}
              <span className="ml-1 text-[10px] text-faint">({count})</span>
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
      </div>

      {/* Article rows */}
      <div aria-live="polite" className="min-h-[280px] flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
          >
            {articles.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <img src="/empty-wire.svg" alt="" className="w-48 opacity-80" />
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-field">
                  {feed.status === "loading"
                    ? "ACQUIRING SIGNAL…"
                    : "NO SIGNAL — 0 ARTICLES FOR FEED"}
                </p>
              </div>
            )}
            {articles.map((a, i) => {
              const seen = parseSeendate(a.seendate);
              const isNew = feed.fetchKey > 0 && i < 3;
              return (
                <motion.a
                  key={a.url}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: EASE_SNAP, delay: i * 0.04 }}
                  className={cn(
                    "group flex items-start gap-2.5 border-b border-hairline px-3 py-2.5 transition-colors duration-150 last:border-b-0 hover:bg-raised",
                    isNew && "animate-flash-update border-l-2 border-l-phosphor",
                  )}
                >
                  <span
                    className={cn(
                      "w-14 shrink-0 pt-0.5 font-mono text-[11px] tabular-nums",
                      timeTone(seen),
                    )}
                    title={seen ? exactUtcTitle(seen) : undefined}
                  >
                    {seen ? relativeTimeLabel(seen) : "—"}
                  </span>
                  {a.sourcecountry && (
                    <span className="mt-0.5 hidden shrink-0 rounded-[2px] border border-hairline px-1 py-px font-mono text-[9px] uppercase tracking-[0.1em] text-field sm:block">
                      {a.sourcecountry.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-sans text-[13.5px] font-medium leading-snug text-bone transition-colors group-hover:text-phosphor">
                      {a.title}
                    </span>
                    <span className="mt-0.5 hidden truncate font-mono text-[11px] text-field md:block">
                      {a.domain}
                    </span>
                  </span>
                  <ArrowUpRight
                    size={13}
                    className="mt-1 shrink-0 text-phosphor opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    aria-hidden
                  />
                </motion.a>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer: ring + AUTO switch + full wire link */}
      <div className="flex items-center justify-between gap-3 border-t border-hairline px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <CountdownRing secondsRemaining={secondsRemaining} size={24} onRefresh={refreshNow} />
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
        </div>
        <Link
          to="/wire"
          className="rounded-[2px] border border-hairline-strong px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-bone transition-colors hover:border-phosphor hover:text-phosphor"
        >
          FULL WIRE →
        </Link>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Section 4b — Intensity panel                                        */
/* ------------------------------------------------------------------ */

function IntensityPanel({
  board,
  escalation,
}: {
  board: ReturnType<typeof useWireBoard>;
  escalation: number;
}) {
  const timelineValues = useMemo(
    () => board.timeline.map((p) => p.value),
    [board.timeline],
  );
  const peak = useMemo(() => {
    if (board.timeline.length === 0) return null;
    const max = board.timeline.reduce((a, b) => (b.value > a.value ? b : a));
    const d = parseSeendate(max.date);
    return { value: max.value, hour: d ? `${String(d.getUTCHours()).padStart(2, "0")}:00 UTC` : max.date };
  }, [board.timeline]);

  const counts = GDELT_FEEDS.map((f) => ({
    feed: f,
    count: board.feeds[f.id].articles.length,
    fetchKey: board.feeds[f.id].fetchKey,
  }));
  const maxCount = Math.max(1, ...counts.map((c) => c.count));
  const hotspots = useMemo(() => tallyHotspots(board.allArticles, 8), [board.allArticles]);

  return (
    <motion.div
      className="flex flex-col gap-3 md:gap-4"
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {/* Escalation gauge */}
      <motion.div variants={snapIn}>
        <Panel title="ESCALATION INDEX" variant="bracketed" bodyClassName="flex items-center justify-center py-4">
          <EscalationGauge value={escalation} width={200} />
        </Panel>
      </motion.div>

      {/* News intensity */}
      <motion.div variants={snapIn}>
        <Panel
          title="NEWS INTENSITY 24H"
          meta={
            peak ? (
              <span
                key={peak.hour + peak.value}
                className="animate-flash-update font-mono text-[10px] uppercase tracking-[0.14em] text-phosphor"
              >
                PEAK {peak.hour} — {peak.value} STORIES
              </span>
            ) : undefined
          }
          bodyClassName="pt-3"
        >
          {timelineValues.length > 1 ? (
            <Sparkline
              series={timelineValues}
              width={420}
              height={96}
              stroke="#FFB000"
              area
              className="w-full"
            />
          ) : (
            <div className="flex h-24 items-center justify-center font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
              ACQUIRING TIMELINE…
            </div>
          )}
        </Panel>
      </motion.div>

      {/* Theme volume */}
      <motion.div variants={snapIn}>
        <Panel title="THEME VOLUME" bodyClassName="space-y-2.5 pt-3">
          {counts.map(({ feed, count, fetchKey }) => (
            <div key={feed.id} className="flex items-center gap-2" title={feed.query}>
              <span className="w-[92px] shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-field">
                {feed.label}
              </span>
              <div className="h-3 flex-1 bg-hairline/60">
                <motion.div
                  className="h-full bg-phosphor"
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / maxCount) * 100}%` }}
                  transition={{ duration: 0.8, ease: EASE_EXPO }}
                />
              </div>
              <span
                key={fetchKey}
                className={cn(
                  "w-8 shrink-0 text-right font-mono text-[11px] tabular-nums text-bone",
                  fetchKey > 0 && "animate-flash-update",
                )}
              >
                {count}
              </span>
            </div>
          ))}
        </Panel>
      </motion.div>

      {/* Top hotspots */}
      <motion.div variants={snapIn}>
        <Panel title="TOP HOTSPOTS" bodyClassName="pt-3">
          {hotspots.length === 0 ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
              AWAITING WIRE DATA…
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {hotspots.map((h, rank) => (
                <Link
                  key={h.slug}
                  to={`/hotspots#${h.slug}`}
                  className={cn(
                    "rounded-[2px] border px-1.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors hover:text-phosphor",
                    rank === 0
                      ? "border-phosphor-dim text-bone"
                      : rank < 3
                        ? "border-hairline-strong text-bone"
                        : "border-hairline text-field",
                  )}
                >
                  {h.label}{" "}
                  <span className="tabular-nums text-phosphor">{h.count}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Section 5 — SIGNAL × PRICE correlation strip                        */
/* ------------------------------------------------------------------ */

function CorrelationCard({
  label,
  priceSide,
  countSide,
  priceSeries,
  countSeries,
  caption,
  marketHref,
  wireHref,
}: {
  label: string;
  priceSide: React.ReactNode;
  countSide: React.ReactNode;
  priceSeries: number[];
  countSeries: number[];
  caption: string;
  marketHref: string;
  wireHref: string;
}) {
  return (
    <motion.div variants={snapIn} className="lg:col-span-4">
      <Panel
        variant="bracketed"
        padded={false}
        className="h-full transition-colors duration-150 hover:border-phosphor-dim"
        bodyClassName="flex h-full flex-col p-3.5"
      >
        <div className="flex items-center justify-between">
          <span className="fp-label text-phosphor">{label}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            SIGNAL × PRICE
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 divide-x divide-hairline">
          <Link to={marketHref} className="group pr-3 transition-colors hover:bg-raised">
            <span className="fp-label block">PRICE</span>
            <span className="mt-1 block group-hover:text-phosphor">{priceSide}</span>
          </Link>
          <Link to={wireHref} className="group pl-3 transition-colors hover:bg-raised">
            <span className="fp-label block">SIGNAL</span>
            <span className="mt-1 block group-hover:text-phosphor">{countSide}</span>
          </Link>
        </div>

        <div className="mt-3 flex items-end gap-3">
          <Sparkline series={priceSeries} width={96} height={28} direction="up" />
          <Sparkline series={countSeries} width={96} height={28} stroke="#45C4B0" />
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-signal-green">
            <span className="inline-block h-px w-3 bg-signal-green" /> PRICE
          </span>
          <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-teal">
            <span className="inline-block h-px w-3 bg-teal" /> STORIES
          </span>
        </div>

        <p className="mt-3 border-t border-hairline pt-2.5 font-sans text-[13px] leading-relaxed text-field">
          {caption}
        </p>
      </Panel>
    </motion.div>
  );
}

function CorrelationStrip({
  board,
  wti,
  brent,
  vix,
  gold,
  dxy,
}: {
  board: ReturnType<typeof useWireBoard>;
  wti?: MarketAsset;
  brent?: MarketAsset;
  vix?: MarketAsset;
  gold?: MarketAsset;
  dxy?: MarketAsset;
}) {
  const energyCount = board.feeds.energy.articles.length;
  const escCount = board.feeds.escalation.articles.length;
  const nukeCount = board.feeds.nuclear.articles.length;

  const energyHist = useMemo(
    () => articleHistogram(board.feeds.energy.articles),
    [board.feeds.energy.articles],
  );
  const escHist = useMemo(
    () => articleHistogram(board.feeds.escalation.articles),
    [board.feeds.escalation.articles],
  );
  const nukeHist = useMemo(
    () => articleHistogram(board.feeds.nuclear.articles),
    [board.feeds.nuclear.articles],
  );

  return (
    <section className="mx-auto max-w-content px-4 py-5 md:px-6 md:py-7 xl:px-10">
      <SectionHeader
        title="SIGNAL × PRICE — CORRELATION WATCH"
        meta={
          <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-faint">
            INFORMATIONAL ONLY — NOT FINANCIAL ADVICE
          </span>
        }
        className="mb-4"
      />
      <motion.div
        className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-12"
        variants={staggerParent}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        <CorrelationCard
          label="WAR PREMIUM"
          priceSide={
            <span className="flex flex-wrap items-center gap-1.5">
              {wti && <ChangeChip changePct={wti.changePct} showSign className="text-sm" />}
              {brent && <ChangeChip changePct={brent.changePct} showSign className="text-sm" />}
              <span className="font-mono text-[10px] uppercase text-faint">WTI · BRENT</span>
            </span>
          }
          countSide={
            <span className="font-mono text-xl font-bold tabular-nums text-bone">
              {energyCount}
              <span className="ml-1 text-[10px] font-normal uppercase text-field">STORIES / ENERGY WAR</span>
            </span>
          }
          priceSeries={wti?.series ?? []}
          countSeries={energyHist}
          caption="Supply-risk headlines track the crude bid."
          marketHref="/markets#CL=F"
          wireHref="/wire?tab=energy"
        />
        <CorrelationCard
          label="FEAR GAUGE"
          priceSide={
            <span className="flex flex-wrap items-center gap-1.5">
              {vix && <ChangeChip changePct={vix.changePct} showSign className="text-sm" />}
              <span className="font-mono text-[10px] uppercase text-faint">VIX</span>
            </span>
          }
          countSide={
            <span className="font-mono text-xl font-bold tabular-nums text-bone">
              {escCount}
              <span className="ml-1 text-[10px] font-normal uppercase text-field">STORIES / ESCALATION</span>
            </span>
          }
          priceSeries={vix?.series ?? []}
          countSeries={escHist}
          caption="Volatility reprices as escalation language spikes."
          marketHref="/markets#%5EVIX"
          wireHref="/wire?tab=escalation"
        />
        <CorrelationCard
          label="SAFE HAVENS"
          priceSide={
            <span className="flex flex-wrap items-center gap-1.5">
              {gold && (
                <span className="font-mono text-sm tabular-nums text-bone">
                  ${fmtPrice(gold.price)}
                </span>
              )}
              {gold && <ChangeChip changePct={gold.changePct} showSign />}
              {dxy && (
                <span className="font-mono text-[10px] uppercase text-faint">
                  DXY {fmtPrice(dxy.price)}
                </span>
              )}
            </span>
          }
          countSide={
            <span className="font-mono text-xl font-bold tabular-nums text-bone">
              {nukeCount}
              <span className="ml-1 text-[10px] font-normal uppercase text-field">STORIES / NUCLEAR</span>
            </span>
          }
          priceSeries={gold?.series ?? []}
          countSeries={nukeHist}
          caption="High-tension rhetoric supports haven demand."
          marketHref="/markets#GC=F"
          wireHref="/wire?tab=nuclear"
        />
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  const { assets, source, refreshKey, refresh } = useMarketData();
  const [auto, setAuto] = useState(true);
  const board = useWireBoard({ autoRefresh: auto });

  const byTicker = useMemo(() => {
    const m = new Map(assets.map((a) => [a.ticker, a]));
    return (t: string) => m.get(t);
  }, [assets]);

  const wti = byTicker("CL=F");
  const brent = byTicker("BZ=F");
  const vix = byTicker("^VIX");
  const gold = byTicker("GC=F");
  const dxy = byTicker("DX-Y.NYB");

  const escalation = computeEscalationIndex({
    breakingCount: board.feeds.breaking.articles.length,
    escalationCount: board.feeds.escalation.articles.length,
    vix: vix?.price ?? 18.77,
    wtiChangePct: wti?.changePct ?? 3.58,
  });

  const timelineValues = board.timeline.map((p) => p.value);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
      <SituationHero
        escalation={escalation}
        wireCount={board.feeds.breaking.articles.length}
        timelineValues={timelineValues.length > 1 ? timelineValues : [0, 0, 0, 0]}
        feedStatus={board.feeds.breaking.status}
        feedAsOf={board.feeds.breaking.asOf}
        wti={wti}
        brent={brent}
        vix={vix}
      />

      {/* Section 2 — Flash alert */}
      <motion.div
        className="mx-auto max-w-content px-4 md:px-6 xl:px-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_SNAP, delay: 0.5 }}
      >
        <AlertBanner articles={board.feeds.breaking.articles} />
      </motion.div>

      <MarketBoards assets={assets} source={source} refreshKey={refreshKey} onRefresh={refresh} />

      {/* Section 4 — wire preview + intensity */}
      <section className="mx-auto grid max-w-content grid-cols-1 gap-3 px-4 py-5 md:gap-4 md:px-6 md:py-7 lg:grid-cols-12 xl:px-10">
        <motion.div
          className="lg:col-span-7"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: EASE_SNAP }}
        >
          <WirePreview board={board} auto={auto} onAutoChange={setAuto} />
        </motion.div>
        <div className="lg:col-span-5">
          <IntensityPanel board={board} escalation={escalation} />
        </div>
      </section>

      <CorrelationStrip
        board={board}
        wti={wti}
        brent={brent}
        vix={vix}
        gold={gold}
        dxy={dxy}
      />
    </motion.div>
  );
}
