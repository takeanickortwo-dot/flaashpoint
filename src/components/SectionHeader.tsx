/**
 * SectionHeader — h-section voice: JetBrains Mono 700 12px, ls 0.22em,
 * uppercase, prefixed by LED or ▸ amber (design.md §3).
 */

import { cn } from "@/lib/utils";
import { StatusLED } from "@/components/StatusLED";
import type { LedTone } from "@/components/StatusLED";

export function SectionHeader({
  title,
  meta,
  led,
  caret = true,
  className,
}: {
  title: string;
  /** Right-side meta slot (as-of, count, status). */
  meta?: React.ReactNode;
  /** Optional LED tone; when set, LED replaces the ▸ caret. */
  led?: LedTone;
  caret?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-bone">
        {led ? (
          <StatusLED tone={led} />
        ) : (
          caret && (
            <span aria-hidden className="text-phosphor">
              ▸
            </span>
          )
        )}
        {title}
      </h2>
      {meta && <div className="flex shrink-0 items-center gap-2">{meta}</div>}
    </div>
  );
}
