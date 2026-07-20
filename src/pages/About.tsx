/**
 * BRIEFING — `/about` (design/about.md).
 * Editorial methodology page: mission hero, Lenis smooth scroll, a GSAP
 * ScrollTrigger pinned "what it monitors" sequence (MonitorSlides), verified
 * data sources, verbatim metric formulas, refresh/rate-limit contract,
 * disclaimer + colophon. Layout hides the TickerTape on this route.
 */

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { motion, useScroll, useTransform } from "framer-motion";
import type { MotionValue, Variants } from "framer-motion";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";
import {
  ESCALATION_BAND_COLORS,
  ESCALATION_FORMULA,
  MARKET_ASOF_LABEL,
} from "@/lib/markets";
import type { EscalationBand } from "@/lib/markets";
import { Panel } from "@/components/Panel";
import { SectionHeader } from "@/components/SectionHeader";
import { MonitorSlides } from "@/components/about/MonitorSlides";
import { usePrefersReducedMotion } from "@/components/about/useMediaQuery";

const EASE_SNAP = [0.22, 1, 0.36, 1] as [number, number, number, number];
const EASE_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const snapIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_SNAP } },
};

const slideX: Variants = {
  hidden: { opacity: 0, x: 16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE_SNAP } },
};

/* ------------------------------------------------------------------ */
/* Hero helpers                                                        */
/* ------------------------------------------------------------------ */

/** Kinetic word-mask reveal: each word slides up from y:110% in an overflow mask. */
function KineticWords({
  text,
  className,
  delay = 0,
  stagger = 0.07,
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
        <span
          key={`${w}-${i}`}
          className="inline-block overflow-hidden pb-[0.08em] align-bottom"
        >
          <motion.span
            className="inline-block will-change-transform"
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.7, ease: EASE_EXPO, delay: delay + i * stagger }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Reticle watermark — 8% opacity, 24s rotation, fades out over the hero. */
function ReticleWatermark({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0, 1], [0.08, 0]);
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute -right-40 top-1/2 hidden -translate-y-1/2 md:block"
      style={{ opacity }}
    >
      <img
        src="/hero-reticle.svg"
        alt=""
        className="size-[640px] animate-[spin_24s_linear_infinite]"
      />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Section 3 — Data sources                                            */
/* ------------------------------------------------------------------ */

const SOURCES: {
  source: string;
  endpoint?: { label: string; href: string };
  use: string;
  freshness: string;
  access: string;
}[] = [
  {
    source: "GDELT Project DOC 2.1",
    endpoint: {
      label: "api.gdeltproject.org/api/v2/doc/doc",
      href: "https://api.gdeltproject.org/api/v2/doc/doc",
    },
    use: "Live conflict news (artlist, timelinevol)",
    freshness: "Real-time · polled 60s",
    access: "Open, CORS * · 1 req/5s",
  },
  {
    source: "Yahoo Finance snapshot",
    use: "Baseline market board (21 assets)",
    freshness: "Build-time · Jul 17 2026 04:00 UTC",
    access: "Embedded seed",
  },
  {
    source: "stooq.com CSV quotes",
    use: "Optional in-browser market refresh",
    freshness: "Delayed · attempted 5min",
    access: "Best-effort, silent fallback",
  },
];

function SourceCell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <span className="fp-label mb-0.5 block md:hidden">{label}</span>
      {children}
    </div>
  );
}

function DataSources() {
  return (
    <section className="mx-auto max-w-[1100px] px-4 py-10 md:px-6 md:py-16 xl:px-10">
      <SectionHeader title="SOURCES // VERIFIED ENDPOINTS" className="mb-4" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45, ease: EASE_SNAP }}
      >
        <Panel padded={false} bodyClassName="p-0">
          {/* Header row (desktop) */}
          <div className="hidden grid-cols-12 gap-3 border-b border-hairline px-3.5 py-2.5 md:grid md:px-4">
            <span className="fp-label col-span-4">Source</span>
            <span className="fp-label col-span-4">Use</span>
            <span className="fp-label col-span-2">Freshness</span>
            <span className="fp-label col-span-2">Access</span>
          </div>
          <motion.div
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {SOURCES.map((s) => (
              <motion.div
                key={s.source}
                variants={snapIn}
                className="grid grid-cols-1 gap-2.5 border-b border-hairline px-3.5 py-3 last:border-b-0 md:min-h-11 md:grid-cols-12 md:items-center md:gap-3 md:px-4 md:py-1.5"
              >
                <SourceCell label="Source" className="md:col-span-4">
                  <span className="block font-mono text-[12px] font-medium text-bone">
                    {s.source}
                  </span>
                  {s.endpoint && (
                    <a
                      href={s.endpoint.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="-mx-1 mt-0.5 inline-block rounded-[2px] px-1 font-mono text-[11px] text-teal transition-colors duration-300 hover:bg-[rgba(255,176,0,0.10)] hover:text-phosphor"
                    >
                      {s.endpoint.label}
                    </a>
                  )}
                </SourceCell>
                <SourceCell label="Use" className="md:col-span-4">
                  <span className="font-sans text-[13px] text-field">{s.use}</span>
                </SourceCell>
                <SourceCell label="Freshness" className="md:col-span-2">
                  <span className="font-mono text-[11px] tabular-nums text-field">
                    {s.freshness}
                  </span>
                </SourceCell>
                <SourceCell label="Access" className="md:col-span-2">
                  <span className="font-mono text-[11px] text-field">{s.access}</span>
                </SourceCell>
              </motion.div>
            ))}
          </motion.div>
          <p className="border-t border-hairline px-3.5 py-3 font-sans text-[13px] leading-[1.6] text-faint md:px-4">
            If a live source fails, FLASHPOINT shows cached data with a DELAYED
            badge and its original timestamp. The app never blocks rendering on
            a network call.
          </p>
        </Panel>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 4 — Metric definitions                                      */
/* ------------------------------------------------------------------ */

const BANDS: { band: EscalationBand; range: string }[] = [
  { band: "CALM", range: "<20" },
  { band: "WATCH", range: "20–40" },
  { band: "TENSE", range: "40–60" },
  { band: "SEVERE", range: "60–80" },
  { band: "CRITICAL", range: ">80" },
];

const METRICS: { title: string; formula: string; body: string; bands?: boolean }[] = [
  {
    title: "WIRE INTENSITY",
    formula: "articles(feed, 24h) + timelinevol histogram",
    body: "Raw story counts per theme and an hourly volume curve, straight from GDELT.",
  },
  {
    title: "HOTSPOT MENTIONS",
    formula: "count(title matches: Ukraine|Iran|Taiwan|Hormuz|…)",
    body: "Case-insensitive keyword tally across fetched headlines. Simple, transparent, occasionally wrong — treat as signal, not truth.",
  },
  {
    title: "ESCALATION INDEX",
    formula: ESCALATION_FORMULA,
    body: "Composite 0–100 stress score, weighted across the wire, volatility and crude.",
    bands: true,
  },
];

function MetricCards() {
  return (
    <section className="mx-auto max-w-[1100px] px-4 py-10 md:px-6 md:py-16 xl:px-10">
      <SectionHeader title="HOW METRICS ARE DERIVED" className="mb-4" />
      <motion.div
        className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        {METRICS.map((m) => (
          <motion.div key={m.title} variants={snapIn} className="h-full">
            <Panel
              title={m.title}
              className="group h-full transition-colors duration-150 hover:border-phosphor-dim"
              bodyClassName="flex h-full flex-col gap-3"
            >
              <div className="overflow-hidden rounded-[2px] border border-hairline bg-void">
                <motion.div
                  initial={{ clipPath: "inset(0 100% 0 0)" }}
                  whileInView={{ clipPath: "inset(0 0% 0 0)" }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, ease: EASE_SNAP }}
                  className="px-3 py-2 font-mono text-[12px] leading-relaxed text-field transition-colors duration-150 group-hover:text-bone"
                >
                  {m.formula}
                </motion.div>
              </div>
              <p className="font-sans text-[13px] leading-[1.6] text-field">{m.body}</p>
              {m.bands && (
                <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1.5 border-t border-hairline pt-2.5">
                  {BANDS.map(({ band, range }) => (
                    <span
                      key={band}
                      className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em]"
                      style={{ color: ESCALATION_BAND_COLORS[band] }}
                    >
                      <span
                        className="inline-block size-1.5 rounded-full"
                        style={{ backgroundColor: ESCALATION_BAND_COLORS[band] }}
                      />
                      {band} <span className="text-faint">{range}</span>
                    </span>
                  ))}
                </div>
              )}
            </Panel>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 5 — Refresh & rate-limit contract                           */
/* ------------------------------------------------------------------ */

const OPS_SPEC: { label: string; value: string }[] = [
  { label: "GDELT CYCLE", value: "60s · active feed only" },
  { label: "MIN REQUEST GAP", value: "5s (queued)" },
  { label: "CACHE", value: "localStorage · per feed" },
  { label: "MARKET REFRESH", value: "stooq · 5min · silent fallback" },
  { label: "CLOCKS", value: "UTC + local · dual display" },
  { label: "FAILURE MODE", value: "show cache + DELAYED badge" },
];

function Operations() {
  return (
    <section className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-4 py-10 md:px-6 md:py-16 lg:grid-cols-12 xl:px-10">
      <div className="lg:col-span-5">
        <SectionHeader title="OPERATIONS" className="mb-4" />
        <motion.p
          className="max-w-[52ch] font-sans text-[15px] leading-[1.65] text-field"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: EASE_SNAP }}
        >
          FLASHPOINT is a static site. Your browser polls GDELT at most once
          per five seconds, one feed per 60-second cycle, and caches everything
          locally. Market data is a dated snapshot unless the optional delayed
          refresh succeeds. Every number on every page carries a timestamp.
        </motion.p>
      </div>
      <div className="lg:col-span-7">
        <motion.dl
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {OPS_SPEC.map((row) => (
            <motion.div
              key={row.label}
              variants={slideX}
              className="flex items-center justify-between gap-4 border-b border-hairline py-2.5 first:border-t"
            >
              <dt className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-field">
                {row.label}
              </dt>
              <dd className="-mx-1 rounded-[2px] px-1 font-mono text-[12px] tabular-nums text-bone transition-colors duration-300 hover:bg-[rgba(255,176,0,0.10)]">
                {row.value}
              </dd>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 6 — Disclaimer & colophon                                   */
/* ------------------------------------------------------------------ */

function SignOff() {
  const letters = "FLASHPOINT".split("");
  return (
    <motion.div
      aria-label="FLASHPOINT"
      className="mt-14 flex select-none justify-center font-display text-[clamp(64px,10vw,120px)] font-bold leading-none tracking-[0.02em] text-transparent"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
    >
      {letters.map((ch, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, y: 14 },
            show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_SNAP } },
          }}
          className="relative"
          style={{ WebkitTextStroke: "1px rgba(232,230,220,0.16)" }}
        >
          {ch}
          {i === 6 && (
            <span
              aria-hidden
              className="absolute -right-1 top-2 size-2 animate-led-pulse rounded-full bg-phosphor"
            />
          )}
        </motion.span>
      ))}
    </motion.div>
  );
}

function Disclaimer() {
  return (
    <section className="mx-auto flex min-h-[50dvh] max-w-[1100px] flex-col items-center justify-center px-4 py-14 md:px-6 md:py-20 xl:px-10">
      <motion.div
        className="w-full max-w-[760px]"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45, ease: EASE_SNAP }}
      >
        <Panel variant="bracketed" title="DISCLAIMER" className="mx-auto">
          <p className="font-sans text-[15px] leading-[1.65] text-bone/85">
            FLASHPOINT aggregates publicly available news and delayed market
            data for informational and educational purposes only. It is not
            financial, investment, or security advice, and mention counts are
            not threat assessments. News content belongs to its publishers and
            is discovered via the GDELT Project. Market data may be delayed,
            cached, or seeded.
          </p>
        </Panel>
        <p className="mt-5 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-field">
          Built with React + Vite + Tailwind // Fonts: Chakra Petch · JetBrains
          Mono · Inter // v1.0 static build
        </p>
        <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
          Market baseline as of {MARKET_ASOF_LABEL}
        </p>
      </motion.div>
      <SignOff />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function About() {
  const reduced = usePrefersReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // Page-scoped Lenis smooth scroll, synced with ScrollTrigger (about.md).
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.12 });
    lenis.on("scroll", ScrollTrigger.update);
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // Re-measure after the pinned sequence mounts.
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [reduced]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Section 1 — hero */}
      <section
        ref={heroRef}
        className="relative flex min-h-[80dvh] items-center justify-center overflow-hidden"
      >
        <ReticleWatermark progress={heroProgress} />
        <div className="relative mx-auto max-w-[880px] px-4 py-16 text-center md:px-6">
          <motion.p
            className="fp-label text-phosphor"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 0.4 }}
          >
            ▸ Briefing // Methodology &amp; Sources
          </motion.p>
          <h1 className="mt-6 font-display text-[clamp(40px,6vw,76px)] font-bold uppercase leading-[0.95] tracking-[-0.01em] text-bone">
            <KineticWords text="ONE SCREEN FOR" delay={0.15} />
            <br />
            <span className="text-phosphor">
              <KineticWords text="GEOPOLITICAL RISK." delay={0.4} />
            </span>
          </h1>
          <motion.p
            className="mx-auto mt-7 max-w-[60ch] font-sans text-[18px] leading-[1.65] text-field"
            variants={snapIn}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.85 }}
          >
            FLASHPOINT fuses a live global conflict newswire with the markets
            wars actually move — crude oil, gold, index futures, the S&amp;P
            500, the VIX, the dollar and big tech — so the connection between a
            headline and a price is visible in seconds.
          </motion.p>
        </div>
        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
        >
          <span className="h-12 w-px bg-hairline-strong" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint animate-[led-pulse_2s_ease-in-out_infinite]">
            Scroll
          </span>
        </motion.div>
      </section>

      {/* Section 2 — pinned monitor sequence (GSAP, desktop) */}
      <MonitorSlides />

      <DataSources />
      <MetricCards />
      <Operations />
      <Disclaimer />
    </motion.div>
  );
}
