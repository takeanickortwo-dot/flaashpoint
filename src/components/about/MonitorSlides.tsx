/**
 * MonitorSlides — "WHAT IT MONITORS" pinned 3-slide sequence (about.md §2).
 *
 * GSAP ScrollTrigger pins the section for ~150vh and drives a scrubbed (0.5)
 * horizontal crossfade timeline:
 *   01 CONFLICT NEWS — mono query strings type in (character stagger)
 *   02 MARKETS       — 21 ticker chips fan in (x 24→0)
 *   03 THE CONNECTION— headline mock / price chips + amber line draws
 * Plus a 2px amber progress bar and 0.1-factor numeral parallax.
 *
 * Fallbacks: pinning is desktop-only (≥lg) and disabled for reduced motion —
 * slides then stack vertically with snap-in reveals (IntersectionObserver,
 * no animation libs mixed into this GSAP-only tree). All tweens and triggers
 * are reverted on unmount via gsap.context.
 */

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GDELT_FEEDS } from "@/lib/gdelt";
import { getSeedAssets, dirOf, fmtPrice } from "@/lib/markets";
import { useMediaQuery, usePrefersReducedMotion } from "@/components/about/useMediaQuery";

gsap.registerPlugin(ScrollTrigger);

/* Fallback reveal — CSS-only snap-in so reduced/mobile mode stays GSAP-free. */
const FALLBACK_CSS = `
.fp-reveal { opacity: 0; transform: translateY(12px); transition: opacity 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.45s cubic-bezier(0.22,1,0.36,1); }
.fp-reveal.in-view { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .fp-reveal { opacity: 1; transform: none; transition: none; }
}
`;

const SLIDES = [
  {
    idx: "01",
    title: "CONFLICT NEWS",
    body: "Five standing GDELT queries scan the world\u2019s English-language press every 60 seconds: breaking conflict, escalation language, energy warfare, sanctions and economic warfare, nuclear tension.",
  },
  {
    idx: "02",
    title: "MARKETS",
    body: "A 21-asset board: indices, equity futures, WTI and Brent crude, natural gas, gold and silver, the dollar index, and eight big-tech bellwethers.",
  },
  {
    idx: "03",
    title: "THE CONNECTION",
    body: "Derived analytics — wire intensity, hotspot mentions, an Escalation Index — place headlines and prices side by side.",
  },
];

/* ------------------------------------------------------------------ */
/* Per-slide visuals                                                   */
/* ------------------------------------------------------------------ */

/** Slide 1: mini wire panel mock — query strings type in char by char. */
function WireVisual() {
  return (
    <div className="w-full max-w-[540px] rounded-[2px] border border-hairline bg-console">
      <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-field">
          GDELT DOC 2.1 // STANDING QUERIES
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
          POLL 60S
        </span>
      </div>
      <div className="space-y-2.5 px-3 py-3">
        {GDELT_FEEDS.map((f) => (
          <div key={f.id} className="font-mono text-[10.5px] leading-relaxed">
            <span className="text-phosphor">{`${f.label} ▸ `}</span>
            <span className="text-field">
              {f.query.split("").map((ch, i) => (
                <span key={i} className="fp-qchar">
                  {ch}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Slide 2: all 21 seed assets as mini ticker chips that fan in. */
function MarketVisual() {
  return (
    <div className="flex w-full max-w-[540px] flex-wrap gap-1.5">
      {getSeedAssets().map((a) => {
        const dir = dirOf(a.changePct);
        const color =
          dir === "up"
            ? "text-signal-green"
            : dir === "down"
              ? "text-signal-red"
              : "text-field";
        return (
          <span
            key={a.ticker}
            className="fp-mchip flex items-center gap-1.5 rounded-[2px] border border-hairline bg-console px-1.5 py-1 font-mono text-[10px] tabular-nums"
          >
            <span className="font-bold text-bone">{a.ticker}</span>
            <span className="text-field">{fmtPrice(a.price)}</span>
            <span className={color}>
              {dir === "up" ? "▲" : dir === "down" ? "▼" : "●"}
              {Math.abs(a.changePct).toFixed(2)}%
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Slide 3: headline mock left / price chips right, amber line draws across. */
function ConnectionVisual() {
  const chips = ["CL=F", "GC=F", "^VIX"]
    .map((t) => getSeedAssets().find((a) => a.ticker === t))
    .filter((a): a is NonNullable<typeof a> => a !== undefined);
  return (
    <div className="w-full max-w-[540px]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-4">
        {/* headline side */}
        <div className="fp-conn rounded-[2px] border border-hairline bg-console px-3 py-3">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-faint">
            HEADLINE
          </span>
          <div className="mt-2 space-y-1.5">
            <div className="h-2 w-11/12 rounded-[1px] bg-hairline-strong" />
            <div className="h-2 w-4/5 rounded-[1px] bg-hairline" />
            <div className="h-2 w-3/5 rounded-[1px] bg-hairline" />
          </div>
          <span className="mt-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-field">
            LIVE WIRE · GDELT
          </span>
        </div>
        {/* connecting amber line */}
        <svg width="56" height="24" viewBox="0 0 56 24" aria-hidden className="shrink-0">
          <line
            className="fp-link-line"
            x1="2"
            y1="12"
            x2="54"
            y2="12"
            stroke="#FFB000"
            strokeWidth="1.5"
            pathLength={1}
            strokeDasharray="1"
          />
          <circle cx="2" cy="12" r="2.5" fill="#FFB000" />
          <circle cx="54" cy="12" r="2.5" fill="#FFB000" />
        </svg>
        {/* price side */}
        <div className="fp-conn flex flex-col gap-1.5">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-faint">
            PRICE
          </span>
          {chips.map((a) => {
            const dir = dirOf(a.changePct);
            const color =
              dir === "up"
                ? "text-signal-green"
                : dir === "down"
                  ? "text-signal-red"
                  : "text-field";
            return (
              <span
                key={a.ticker}
                className="flex items-center gap-1.5 rounded-[2px] border border-hairline bg-console px-1.5 py-1 font-mono text-[10px] tabular-nums"
              >
                <span className="font-bold text-bone">{a.ticker}</span>
                <span className={color}>
                  {dir === "up" ? "▲" : dir === "down" ? "▼" : "●"}
                  {Math.abs(a.changePct).toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const VISUALS = [WireVisual, MarketVisual, ConnectionVisual];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function MonitorSlides() {
  const rootRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const reduced = usePrefersReducedMotion();
  const pinned = isDesktop && !reduced;

  // Pinned scrub timeline — created after layout, fully reverted on unmount.
  useLayoutEffect(() => {
    if (!pinned || !rootRef.current) return;
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef.current);
      gsap.set(q(".fp-slide"), { autoAlpha: 0, xPercent: 30 });
      gsap.set(q(".fp-slide-0"), { autoAlpha: 1, xPercent: 0 });
      gsap.set(q(".fp-qchar"), { opacity: 0 });
      gsap.set(q(".fp-mchip"), { opacity: 0, x: 24 });
      gsap.set(q(".fp-conn"), { opacity: 0, y: 10 });
      gsap.set(q(".fp-link-line"), { strokeDashoffset: 1 });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "+=150%",
          scrub: 0.5,
          pin: true,
          anticipatePin: 1,
        },
      });

      // Progress bar + numeral parallax span the whole timeline.
      tl.fromTo(q(".fp-progress"), { scaleX: 0 }, { scaleX: 1, duration: 5.3 }, 0);
      tl.to(q(".fp-num"), { yPercent: -10, duration: 5.3 }, 0);

      // Slide 01 — queries type in.
      tl.to(q(".fp-qchar"), { opacity: 1, duration: 0.02, stagger: 0.004 }, 0.1);

      // → Slide 02 — chips fan in.
      tl.to(q(".fp-slide-0"), { autoAlpha: 0, xPercent: -30, duration: 0.7 }, 1.9);
      tl.to(q(".fp-slide-1"), { autoAlpha: 1, xPercent: 0, duration: 0.7 }, 1.9);
      tl.to(q(".fp-mchip"), { opacity: 1, x: 0, duration: 0.3, stagger: 0.03 }, 2.3);

      // → Slide 03 — connection draws.
      tl.to(q(".fp-slide-1"), { autoAlpha: 0, xPercent: -30, duration: 0.7 }, 3.6);
      tl.to(q(".fp-slide-2"), { autoAlpha: 1, xPercent: 0, duration: 0.7 }, 3.6);
      tl.to(q(".fp-conn"), { opacity: 1, y: 0, duration: 0.4, stagger: 0.15 }, 4.0);
      tl.to(q(".fp-link-line"), { strokeDashoffset: 0, duration: 0.8 }, 4.2);

      tl.to({}, { duration: 0.3 }, 5.0); // tail hold
    }, rootRef);
    return () => ctx.revert();
  }, [pinned]);

  // Fallback mode: IntersectionObserver-driven snap-in reveals (no libs).
  useEffect(() => {
    if (pinned || !rootRef.current) return;
    const els = rootRef.current.querySelectorAll(".fp-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pinned]);

  return (
    <section aria-label="What it monitors">
      <style>{FALLBACK_CSS}</style>
      <div
        ref={rootRef}
        className={
          pinned ? "relative flex min-h-[100dvh] flex-col overflow-hidden" : "relative"
        }
      >
        {/* Section header */}
        <div className="mx-auto flex w-full max-w-content items-center justify-between px-4 pt-12 md:px-6 xl:px-10">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-bone">
            <span aria-hidden className="text-phosphor">
              ▸
            </span>
            What it monitors
          </h2>
          {pinned && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              SCROLL // 3 SLIDES
            </span>
          )}
        </div>

        {/* Slides */}
        <div className="relative mx-auto w-full max-w-content flex-1 px-4 md:px-6 xl:px-10">
          {SLIDES.map((s, i) => {
            const Visual = VISUALS[i];
            return (
              <div
                key={s.idx}
                className={
                  pinned
                    ? `fp-slide fp-slide-${i} absolute inset-0 flex items-center`
                    : "fp-reveal py-12 md:py-16"
                }
              >
                <div className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-12">
                  {/* Text block with huge outline numeral behind */}
                  <div className="relative">
                    <span
                      aria-hidden
                      className="fp-num pointer-events-none absolute -top-16 left-0 select-none font-display text-[120px] font-bold leading-none text-transparent md:-top-20"
                      style={{ WebkitTextStroke: "1px #3B4136" }}
                    >
                      {s.idx}
                    </span>
                    <h3 className="relative font-mono text-xs font-bold uppercase tracking-[0.22em] text-bone">
                      <span aria-hidden className="mr-2 text-phosphor">
                        ▸
                      </span>
                      {s.title}
                    </h3>
                    <p className="relative mt-4 max-w-[52ch] font-sans text-[15px] leading-[1.65] text-field">
                      {s.body}
                    </p>
                  </div>
                  {/* Visual */}
                  <div className="flex lg:justify-end">
                    <Visual />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrubbed progress bar (pinned mode only) */}
        {pinned && (
          <div className="mx-auto w-full max-w-content px-4 pb-10 md:px-6 xl:px-10">
            <div className="h-0.5 w-full bg-hairline/60">
              <div className="fp-progress h-full w-full origin-left scale-x-0 bg-phosphor" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
