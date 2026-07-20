/**
 * WorldMap — code-rendered dotted world map (hotspots.md §2).
 *
 * Equirectangular SVG in a 960×480 viewBox:
 * - land dots from the embedded 96×48 land matrix (@/components/hotspots/landGrid)
 * - graticule every 30°, faint amber scan-line sweeping vertically (7s loop)
 * - one pulsing marker per canonical hotspot; radius scales 4→9px with the
 *   live mention tally, ring period maps to intensity (3s quiet → 1.2s hot)
 * - hover: rings pause, linked-asset chips appear; click/Enter: onSelect(slug)
 * - prefers-reduced-motion: static rings, no scan-line, no pop-in
 */

import { memo } from "react";
import { motion } from "framer-motion";
import { HOTSPOTS } from "@/lib/hotspots";
import type { Hotspot } from "@/lib/hotspots";
import { dirOf, fmtPrice } from "@/lib/markets";
import type { MarketAsset } from "@/lib/markets";
import { LAND_DOTS, MAP_W, MAP_H, project } from "@/components/hotspots/landGrid";
import { Panel } from "@/components/Panel";

/* Map-local styles: rings, scan-line, marker pop-in (kept out of global CSS). */
const MAP_CSS = `
.fp-marker { transform-box: fill-box; transform-origin: center; animation: fp-marker-pop 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
@keyframes fp-marker-pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
.fp-ring { transform-box: fill-box; transform-origin: center; animation: fp-ring-pulse var(--dur, 2s) cubic-bezier(0.22,1,0.36,1) infinite; }
@keyframes fp-ring-pulse { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.4); opacity: 0; } }
.fp-marker:hover .fp-ring { animation-play-state: paused; }
.fp-scan { animation: fp-map-scan 7s linear infinite; }
@keyframes fp-map-scan { from { transform: translateY(0); } to { transform: translateY(${MAP_H}px); } }
@media (prefers-reduced-motion: reduce) {
  .fp-marker { animation: none; opacity: 1; }
  .fp-ring { animation: none; transform: none; opacity: 0.3; }
  .fp-ring-2 { display: none; }
  .fp-scan { display: none; animation: none; }
}
`;

/** Static label placement per hotspot (hotspots.md: offsets avoid overlap). */
const LABELS: Record<
  string,
  { short: string; dx: number; dy: number; anchor: "start" | "end" }
> = {
  ukraine: { short: "UKRAINE", dx: 13, dy: -11, anchor: "start" },
  "israel-gaza": { short: "GAZA", dx: -12, dy: 22, anchor: "end" },
  iran: { short: "IRAN", dx: 13, dy: -13, anchor: "start" },
  "red-sea": { short: "RED SEA", dx: -12, dy: 24, anchor: "end" },
  hormuz: { short: "HORMUZ", dx: 13, dy: 17, anchor: "start" },
  taiwan: { short: "TAIWAN", dx: 13, dy: 18, anchor: "start" },
  korea: { short: "KOREA", dx: -13, dy: -11, anchor: "end" },
  "sudan-sahel": { short: "SAHEL", dx: -13, dy: 6, anchor: "end" },
};

const GRAT_LONS = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const GRAT_LATS = [-60, -30, 0, 30, 60];

const DIR_COLORS = { up: "#3DDC84", down: "#FF4A3D", flat: "#969B8A" } as const;

interface HotspotMarkerProps {
  hotspot: Hotspot;
  count: number;
  maxCount: number;
  index: number;
  assetOf: (ticker: string) => MarketAsset | undefined;
  onSelect: (slug: string) => void;
}

const HotspotMarker = memo(function HotspotMarker({
  hotspot,
  count,
  maxCount,
  index,
  assetOf,
  onSelect,
}: HotspotMarkerProps) {
  const { x, y } = project(hotspot.lat, hotspot.lng);
  const intensity = Math.min(1, count / Math.max(1, maxCount));
  const r = 4 + 5 * intensity;
  // Ring period: 3s when quiet → 1.2s for the top-intensity hotspot.
  const dur = 3 - 1.8 * intensity;
  const label = LABELS[hotspot.slug];
  const chips = hotspot.linkedAssets
    .map((t) => assetOf(t))
    .filter((a): a is MarketAsset => a !== undefined);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(hotspot.slug);
    }
  };

  return (
    <g
      className="fp-marker group cursor-crosshair outline-none"
      style={{ animationDelay: `${0.15 + index * 0.08}s` }}
      role="button"
      tabIndex={0}
      aria-label={`${hotspot.name} — ${count} mentions across active wires, 24h window. Activate to open region dossier.`}
      onClick={() => onSelect(hotspot.slug)}
      onKeyDown={handleKey}
    >
      <title>{`${hotspot.name} — ${count} mentions across active wires, 24h window`}</title>
      {/* generous hit area */}
      <circle cx={x} cy={y} r={Math.max(16, r + 8)} fill="transparent" />
      {/* pulsing rings */}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke="#FFB000"
        strokeWidth={1}
        className="fp-ring"
        style={{ "--dur": `${dur}s` } as React.CSSProperties}
      />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke="#FFB000"
        strokeWidth={1}
        className="fp-ring fp-ring-2"
        style={
          { "--dur": `${dur}s`, animationDelay: `${dur / 2}s` } as React.CSSProperties
        }
      />
      {/* base dot */}
      <circle cx={x} cy={y} r={r} fill="#FFB000" opacity={0.9} />
      <circle cx={x} cy={y} r={Math.max(2, r * 0.45)} fill="#0A0B09" opacity={0.55} />
      {/* label + count */}
      <text
        x={x + label.dx}
        y={y + label.dy}
        textAnchor={label.anchor}
        fontSize={9}
        fill="#E8E6DC"
        letterSpacing={1.1}
        fontFamily='"JetBrains Mono", monospace'
        stroke="#111310"
        strokeWidth={3}
        paintOrder="stroke"
        className="uppercase transition-opacity duration-150 group-hover:fill-phosphor"
      >
        {label.short}
        <tspan fill="#FFB000" className="max-sm:hidden">
          {` · ${count}`}
        </tspan>
      </text>
      {/* linked-asset chips on hover */}
      <g className="pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {chips.map((a, i) => {
          const dir = dirOf(a.changePct);
          const glyph = dir === "up" ? "▲" : dir === "down" ? "▼" : "●";
          return (
            <text
              key={a.ticker}
              x={x + label.dx}
              y={y + label.dy + 12 + i * 11}
              textAnchor={label.anchor}
              fontSize={8.5}
              fill={DIR_COLORS[dir]}
              fontFamily='"JetBrains Mono", monospace'
              stroke="#111310"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {`${a.ticker} ${glyph}${Math.abs(a.changePct).toFixed(2)}% $${fmtPrice(a.price)}`}
            </text>
          );
        })}
      </g>
    </g>
  );
});

export function WorldMap({
  counts,
  maxCount,
  assetOf,
  onSelect,
  asOfLabel,
  led,
}: {
  /** slug → mention count from the live wire tally. */
  counts: Record<string, number>;
  maxCount: number;
  assetOf: (ticker: string) => MarketAsset | undefined;
  onSelect: (slug: string) => void;
  asOfLabel: string;
  led: "green" | "amber" | "red" | "teal" | "field";
}) {
  const active = HOTSPOTS.filter((h) => (counts[h.slug] ?? 0) > 0).length;
  // Markers pop in west → east.
  const sorted = [...HOTSPOTS].sort((a, b) => a.lng - b.lng);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Panel
        variant="bracketed"
        title="THE MAP BOARD"
        led={led}
        padded={false}
        meta={
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            MAP // MENTION-DERIVED{asOfLabel ? ` · AS OF ${asOfLabel}` : ""}
          </span>
        }
        bodyClassName="relative p-0"
      >
        <style>{MAP_CSS}</style>
        <div className="relative cursor-crosshair overflow-hidden">
          {LAND_DOTS.length === 0 && (
            <img
              src="/hero-reticle.svg"
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 opacity-[0.08]"
            />
          )}
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            className="block h-auto min-h-[46vh] w-full"
            role="img"
            aria-label="Dotted world map with pulsing conflict hotspot markers"
          >
            {/* graticule */}
            {GRAT_LONS.map((lon) => {
              const x = ((lon + 180) / 360) * MAP_W;
              return (
                <line
                  key={`lon-${lon}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={MAP_H}
                  stroke="#272B22"
                  strokeOpacity={0.4}
                  strokeWidth={1}
                />
              );
            })}
            {GRAT_LATS.map((lat) => {
              const y = ((90 - lat) / 180) * MAP_H;
              return (
                <line
                  key={`lat-${lat}`}
                  x1={0}
                  y1={y}
                  x2={MAP_W}
                  y2={y}
                  stroke="#272B22"
                  strokeOpacity={0.4}
                  strokeWidth={1}
                />
              );
            })}
            {/* land dots */}
            <g fill="#3B4136" opacity={0.7}>
              {LAND_DOTS.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={1.8} />
              ))}
            </g>
            {/* amber scan-line (sweeps vertically every 7s) */}
            <rect
              className="fp-scan"
              x={0}
              y={0}
              width={MAP_W}
              height={1}
              fill="#FFB000"
              opacity={0.06}
            />
            {/* hotspot markers */}
            {sorted.map((h, i) => (
              <HotspotMarker
                key={h.slug}
                hotspot={h}
                count={counts[h.slug] ?? 0}
                maxCount={maxCount}
                index={i}
                assetOf={assetOf}
                onSelect={onSelect}
              />
            ))}
          </svg>

          {/* legend */}
          <div className="pointer-events-none absolute bottom-2 left-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-field">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-1.5 rounded-full bg-phosphor" />
              monitored region
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full border border-phosphor" />
              ring speed = mention rate
            </span>
            <span className="text-bone">
              {active}/{HOTSPOTS.length} regions active
            </span>
          </div>
        </div>
      </Panel>
    </motion.div>
  );
}
