import type { ProcessingStage } from "./components/FileProgress.js";

/**
 * Ink/Chalk color mapping for the terminal UI.
 * Follows the ANSI palette from the UI design spec.
 */
export const COLORS = {
  critical: "red",
  warning: "yellow",
  success: "green",
  info: "cyan",
  accent: "magenta",
  muted: "gray",
  diffAdd: "green",
  diffRemove: "red",
} as const;

/**
 * Severity to color mapping for analysis sections.
 */
export const SEVERITY_COLOR: Record<string, string> = {
  critical: "red",
  warning: "yellow",
  info: "cyan",
  good: "green",
} as const;

/**
 * Severity badge text for analysis sections.
 */
export const SEVERITY_BADGE: Record<string, string> = {
  critical: "[CRITICAL]",
  warning: "[WARNING]",
  info: "[INFO]",
  good: "[GOOD]",
} as const;

/**
 * Stage display labels for file progress.
 */
export const STAGE_LABELS: Record<ProcessingStage, string> = {
  resolving: "Resolving path...",
  detecting: "Detecting type...",
  validating: "Validating file...",
  encoding: "Encoding...",
  chunking: "Splitting pages...",
  building: "Building request...",
  sending: "Sending to API...",
  complete: "Complete",
  error: "Error",
} as const;

export const MAX_SECTION_ITEMS_BEFORE_COLLAPSE = 10;
export const MIN_TERMINAL_WIDTH_FOR_LINE_NUMBERS = 40;
export const MIN_TERMINAL_WIDTH_FOR_FULL_METADATA = 60;
