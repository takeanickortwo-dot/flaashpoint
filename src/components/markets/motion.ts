/**
 * Shared motion variants for the Markets page (design.md §6).
 */

import type { Variants } from "framer-motion";

export const EASE_SNAP = [0.22, 1, 0.36, 1] as [number, number, number, number];
export const EASE_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];

export const snapIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_SNAP } },
};

export const staggerParent = (stagger = 0.05, delay = 0.1): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});
