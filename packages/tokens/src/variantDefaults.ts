/**
 * Shared defaults every variant starts from, so a variant file
 * stays a list of *deliberate* differences rather than a wall of
 * copy-paste. Anything a variant does not override is the same
 * across all of them, which is what makes the M0 bake-off a fair
 * comparison instead of four unrelated designs.
 */

import { densityControl } from "./scales.ts"
import type {
  MotionTokens,
  TypographyTokens,
} from "./types.ts"

export const defaultTypography: TypographyTokens = {
  fontFamily: {
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.8125rem",
    md: "0.875rem",
    lg: "1rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
  },
  lineHeight: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.7",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  letterSpacing: {
    tight: "-0.01em",
    normal: "0em",
    wide: "0.02em",
  },
}

export const defaultMotion: MotionTokens = {
  duration: {
    instant: "0ms",
    fast: "120ms",
    normal: "200ms",
    slow: "320ms",
    loopFast: "700ms",
    loopSlow: "1300ms",
  },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    entrance: "cubic-bezier(0, 0, 0.2, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
    emphasized: "cubic-bezier(0.2, 0, 0, 1)",
  },
}

export const defaultControl = densityControl.comfortable
