/**
 * ChangeChip — ▲ 3.58% / ▼ 1.40% (design.md §8.6).
 * Mono 11px 500, colored text on 8% color wash, 2px radius.
 * Color is never the only signal: ▲/▼/● glyphs always present.
 */

import { cn } from "@/lib/utils";
import { dirOf, fmtSigned } from "@/lib/markets";

export function ChangeChip({
  changePct,
  className,
  showSign = false,
}: {
  changePct: number;
  className?: string;
  /** Also render the signed number (glyph still shown). */
  showSign?: boolean;
}) {
  const dir = dirOf(changePct);
  const glyph = dir === "up" ? "▲" : dir === "down" ? "▼" : "●";
  const color =
    dir === "up" ? "#3DDC84" : dir === "down" ? "#FF4A3D" : "#969B8A";
  const wash =
    dir === "up"
      ? "rgba(61,220,132,0.08)"
      : dir === "down"
        ? "rgba(255,74,61,0.08)"
        : "transparent";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-[2px] px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums",
        className,
      )}
      style={{ color, backgroundColor: wash }}
      aria-label={`${dir === "up" ? "up" : dir === "down" ? "down" : "unchanged"} ${Math.abs(changePct).toFixed(2)} percent`}
    >
      <span aria-hidden className="text-[9px] leading-none">
        {glyph}
      </span>
      {showSign ? fmtSigned(changePct) : Math.abs(changePct).toFixed(2)}%
    </span>
  );
}
