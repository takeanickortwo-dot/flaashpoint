/**
 * HOTSPOTS — `/hotspots` (design/hotspots.md).
 * Geographic view: dotted world map with pulsing conflict markers, Escalation
 * Index gauge, on-demand region dossier cards, and a region↔market
 * cross-reference strip. Deep links `#<slug>` scroll to + pulse a region card.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

import { useMarketData } from "@/hooks/useMarketData";
import { useWireBoard } from "@/hooks/useWireBoard";
import { computeEscalationIndex, fmtUtcTime } from "@/lib/markets";
import type { MarketAsset } from "@/lib/markets";
import { GDELT_FEEDS } from "@/lib/gdelt";
import { HOTSPOTS, tallyHotspots } from "@/lib/hotspots";

import { SectionHeader } from "@/components/SectionHeader";
import { WorldMap } from "@/components/hotspots/WorldMap";
import { RegionCard, CARD_CSS } from "@/components/hotspots/RegionCard";
import { EscalationPanel } from "@/components/hotspots/EscalationPanel";
import { CrossReference } from "@/components/hotspots/CrossReference";
import { useRegionDossiers } from "@/components/hotspots/useRegionDossiers";
import { usePrefersReducedMotion } from "@/components/hotspots/useMediaQuery";

const EASE_SNAP = [0.22, 1, 0.36, 1] as [number, number, number, number];

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const snapIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_SNAP } },
};

export default function Hotspots() {
  const { assets } = useMarketData();
  const board = useWireBoard();
  const { dossiers, load } = useRegionDossiers();
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const [highlightSlug, setHighlightSlug] = useState<string | null>(null);
  const highlightTimer = useRef<number | null>(null);

  const assetOf = useMemo(() => {
    const m = new Map(assets.map((a) => [a.ticker, a]));
    return (t: string): MarketAsset | undefined => m.get(t);
  }, [assets]);

  // Mention tally over everything the wire board has fetched (design.md §9).
  const counts = useMemo(() => {
    const tally = tallyHotspots(board.allArticles, 12);
    const m: Record<string, number> = {};
    for (const h of HOTSPOTS) m[h.slug] = 0;
    for (const t of tally) if (t.slug in m) m[t.slug] = t.count;
    return m;
  }, [board.allArticles]);
  const maxCount = Math.max(1, ...Object.values(counts));

  const vix = assetOf("^VIX");
  const wti = assetOf("CL=F");
  const breakingCount = board.feeds.breaking.articles.length;
  const escalationCount = board.feeds.escalation.articles.length;
  const wireCount = breakingCount + escalationCount;
  const score = computeEscalationIndex({
    breakingCount,
    escalationCount,
    vix: vix?.price ?? 18.77,
    wtiChangePct: wti?.changePct ?? 3.58,
  });

  const latestAsOf = useMemo(() => {
    const ds = GDELT_FEEDS.map((f) => board.feeds[f.id].asOf).filter(
      (d): d is Date => d !== null,
    );
    return ds.length ? new Date(Math.max(...ds.map((d) => d.getTime()))) : null;
  }, [board.feeds]);

  const mapLed = GDELT_FEEDS.some((f) => board.feeds[f.id].status === "live")
    ? ("green" as const)
    : GDELT_FEEDS.some((f) => board.feeds[f.id].status === "delayed")
      ? ("amber" as const)
      : ("field" as const);

  /** Scroll to + amber-pulse a region card; optionally fire its ONE GDELT query. */
  const scrollToCard = useCallback(
    (slug: string, fetchToo: boolean) => {
      if (highlightTimer.current !== null) {
        window.clearTimeout(highlightTimer.current);
      }
      setHighlightSlug(slug);
      highlightTimer.current = window.setTimeout(
        () => setHighlightSlug((s) => (s === slug ? null : s)),
        1600,
      );
      if (fetchToo) load(slug);
      requestAnimationFrame(() => {
        document.getElementById(`hotspot-${slug}`)?.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "start",
        });
      });
    },
    [load, reduced],
  );

  useEffect(() => {
    return () => {
      if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
    };
  }, []);

  // Deep link: `#<slug>` scrolls to and highlights the region card.
  useEffect(() => {
    const slug = location.hash.replace(/^#/, "");
    if (!slug || !HOTSPOTS.some((h) => h.slug === slug)) return;
    const t = window.setTimeout(() => scrollToCard(slug, false), 80);
    return () => window.clearTimeout(t);
  }, [location.hash, scrollToCard]);

  /** Marker click: ONE GDELT query for that region (queued, ≥5s gaps) + scroll. */
  const handleMarkerSelect = useCallback(
    (slug: string) => {
      navigate(`#${slug}`);
      scrollToCard(slug, true);
    },
    [navigate, scrollToCard],
  );

  /** Cross-reference jump: anchor only (no fetch). */
  const handleJump = useCallback(
    (slug: string) => {
      navigate(`#${slug}`);
      scrollToCard(slug, false);
    },
    [navigate, scrollToCard],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <style>{CARD_CSS}</style>
      {/* Section 1 — page header + escalation gauge */}
      <section className="mx-auto grid max-w-content grid-cols-1 gap-3 px-4 py-5 md:gap-4 md:px-6 md:py-7 lg:grid-cols-12 xl:px-10">
        <div className="flex flex-col justify-center lg:col-span-5">
          <motion.p
            className="fp-label text-phosphor"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 0.4 }}
          >
            ▸ Geographic Conflict Tracker // Mention-Derived Intensity
          </motion.p>
          <h1 className="mt-3 font-display text-[clamp(30px,4.5vw,56px)] font-bold uppercase leading-none text-bone">
            Hotspots
          </h1>
          <motion.p
            className="mt-4 max-w-[52ch] font-sans text-[13px] leading-[1.6] text-field"
            variants={snapIn}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.25 }}
          >
            Marker size and ring speed scale with how often each region appears
            across the live wires. Counts refresh with the 60-second cycle.
          </motion.p>
        </div>
        <motion.div
          className="lg:col-span-7"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_SNAP, delay: 0.15 }}
        >
          <EscalationPanel
            score={score}
            wireCount={wireCount}
            vix={vix}
            wti={wti}
            updatedAt={latestAsOf}
          />
        </motion.div>
      </section>

      {/* Section 2 — the map board */}
      <section className="mx-auto max-w-content px-4 pb-5 md:px-6 md:pb-7 xl:px-10">
        <WorldMap
          counts={counts}
          maxCount={maxCount}
          assetOf={assetOf}
          onSelect={handleMarkerSelect}
          asOfLabel={latestAsOf ? `${fmtUtcTime(latestAsOf)} UTC` : ""}
          led={mapLed}
        />
      </section>

      {/* Section 3 — region dossier cards */}
      <section className="mx-auto max-w-content px-4 pb-5 md:px-6 md:pb-7 xl:px-10">
        <SectionHeader
          title="REGION DOSSIERS"
          meta={
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              {HOTSPOTS.length} REGIONS · HEADLINES ON DEMAND
            </span>
          }
          className="mb-4"
        />
        <motion.div
          className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {HOTSPOTS.map((h) => (
            <motion.div key={h.slug} variants={snapIn}>
              <RegionCard
                hotspot={h}
                count={counts[h.slug] ?? 0}
                maxCount={maxCount}
                assets={h.linkedAssets
                  .map((t) => assetOf(t))
                  .filter((a): a is MarketAsset => a !== undefined)}
                dossier={dossiers[h.slug]}
                onLoad={load}
                highlighted={highlightSlug === h.slug}
              />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Section 4 — region ↔ market cross-reference strip */}
      <section className="mx-auto max-w-content px-4 pb-8 md:px-6 md:pb-10 xl:px-10">
        <CrossReference assetOf={assetOf} onJump={handleJump} />
      </section>
    </motion.div>
  );
}
