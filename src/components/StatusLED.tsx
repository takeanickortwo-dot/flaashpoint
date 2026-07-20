/**
 * StatusLED + badges (design.md §8.5).
 * LED: 6px dot + led-pulse, always paired with a mono 10px label.
 */

import { cn } from "@/lib/utils";

export type LedTone = "green" | "amber" | "red" | "teal" | "field";

const LED_COLORS: Record<LedTone, string> = {
  green: "#3DDC84",
  amber: "#FFB000",
  red: "#FF4A3D",
  teal: "#45C4B0",
  field: "#969B8A",
};

export function StatusLED({
  tone = "green",
  label,
  pulse = true,
  className,
}: {
  tone?: LedTone;
  label?: string;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        aria-hidden
        className={cn("inline-block size-1.5 rounded-full", pulse && "animate-led-pulse")}
        style={{ backgroundColor: LED_COLORS[tone], boxShadow: `0 0 6px ${LED_COLORS[tone]}66` }}
      />
      {label !== undefined && (
        <span
          className="font-mono text-[10px] font-medium uppercase tracking-[0.16em]"
          style={{ color: LED_COLORS[tone] }}
        >
          {label}
        </span>
      )}
    </span>
  );
}

export type BadgeVariant =
  | "seed" // SEED DATA — phosphor-dim border, phosphor text
  | "live" // green
  | "delayed" // amber
  | "24h" // hairline border, field
  | "country" // hairline, field
  | "conflict" // ⚡ CONFLICT SENSITIVE — amber
  | "outline"; // generic hairline outline

const BADGE_STYLES: Record<BadgeVariant, string> = {
  seed: "border-phosphor-dim text-phosphor",
  live: "border-signal-green/60 text-signal-green",
  delayed: "border-phosphor-dim text-phosphor",
  "24h": "border-hairline text-field",
  country: "border-hairline text-field",
  conflict: "border-phosphor-dim text-phosphor",
  outline: "border-hairline-strong text-field",
};

export function Badge({
  variant = "outline",
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-[2px] border px-1.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em]",
        BADGE_STYLES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Convenience badges with canonical copy. */
export const SeedDataBadge = () => <Badge variant="seed">SEED DATA</Badge>;
export const LiveBadge = () => <Badge variant="live">LIVE</Badge>;
export const DelayedBadge = () => <Badge variant="delayed">DELAYED</Badge>;
export const ConflictTag = ({ label = "CONFLICT SENSITIVE" }: { label?: string }) => (
  <Badge variant="conflict">
    <span aria-hidden>⚡</span> {label}
  </Badge>
);


