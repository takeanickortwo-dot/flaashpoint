/**
 * Panel — base instrument (design.md §8.4).
 * console bg, 1px hairline border, 2px radius, 4% noise overlay.
 * Header row: 12px bottom padding + 1px hairline; left h-section title,
 * right meta slot. Variants: bracketed (corner ticks), alert (red bar +
 * red-wash), flat (no border, nested use).
 */

import { cn } from "@/lib/utils";

export type PanelVariant = "default" | "bracketed" | "alert" | "flat";

export function Panel({
  title,
  meta,
  variant = "default",
  children,
  className,
  bodyClassName,
  led,
  caret,
  padded = true,
}: {
  title?: React.ReactNode;
  meta?: React.ReactNode;
  variant?: PanelVariant;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Show a status LED before the title (tone color). */
  led?: "green" | "amber" | "red" | "teal" | "field";
  /** Show ▸ caret before the title (default true when no LED). */
  caret?: boolean;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "panel-noise relative overflow-hidden rounded-[2px]",
        variant !== "flat" && "border border-hairline bg-console",
        variant === "bracketed" && "panel-bracketed",
        variant === "alert" && "border-l-2 border-l-signal-red bg-[rgba(255,74,61,0.08)]",
        className,
      )}
    >
      {(title !== undefined || meta !== undefined) && (
        <header
          className={cn(
            "relative z-10 flex items-center justify-between gap-3 border-b border-hairline px-3.5 pb-3 pt-3.5 md:px-4",
          )}
        >
          <h2 className="flex min-w-0 items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-bone">
            {led ? (
              <span
                aria-hidden
                className="inline-block size-1.5 shrink-0 animate-led-pulse rounded-full"
                style={{
                  backgroundColor:
                    led === "green"
                      ? "#3DDC84"
                      : led === "amber"
                        ? "#FFB000"
                        : led === "red"
                          ? "#FF4A3D"
                          : led === "teal"
                            ? "#45C4B0"
                            : "#969B8A",
                }}
              />
            ) : (
              (caret ?? true) && (
                <span aria-hidden className="shrink-0 text-phosphor">
                  ▸
                </span>
              )
            )}
            <span className="truncate">{title}</span>
          </h2>
          {meta !== undefined && (
            <div className="flex shrink-0 items-center gap-2">{meta}</div>
          )}
        </header>
      )}
      <div className={cn("relative z-10", padded && "p-3.5 md:p-4", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
