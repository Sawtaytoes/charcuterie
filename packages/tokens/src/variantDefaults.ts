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

/**
 * The M5 picks, self-hosted from `@charcuterie/tokens/fonts.css`.
 *
 * Before M5 all three were pure system stacks, which meant the design
 * system rendered in Segoe on the Windows boxes and Roboto on the
 * Pis — it had no typographic opinion at all. These are that opinion.
 *
 * Every stack keeps its system fallback: a consumer that installs the
 * package but never imports `fonts.css` gets the old behaviour rather
 * than a broken page, and the ePaper profile can be driven off a
 * machine with no webfonts at all.
 *
 * The mono is **Victor Mono, not Dank Mono** — the owner's editor
 * font is paid and cannot be redistributed from a public package.
 * Victor Mono is the closest OFL analogue (cursive italics and
 * ligatures both), and apps that want Dank Mono override
 * `--font-mono` locally. See
 * `docs/decisions/2026-07-30-the-shipped-mono-is-victor-mono.md`.
 */
export const defaultTypography: TypographyTokens = {
  fontFamily: {
    display:
      '"Baloo 2", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    sans: 'Outfit, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"Victor Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
  /**
   * The fleet's one type ramp, rebuilt 2026-08-10 around a **17px
   * body**. See
   * `docs/decisions/2026-08-10-the-type-ramp-is-built-around-a-17px-body.md`.
   *
   * The ramp this replaced put `md` at 14–15px and `xs` at 12px, so
   * every step below `lg` sat under the 16px browser default and the
   * owner ran the apps at 200% zoom against 125% for Home Assistant.
   *
   * The step that decided the shape is **`sm`, not `md`**. `sm` is
   * the library's de-facto body step — 34 uses in `packages/ui/src`
   * against 11 for `md` — so a ramp that fixes `md` and leaves `sm`
   * at 13px fixes almost nothing anybody looks at. `sm` is therefore
   * pinned to exactly 1rem, and the rest of the ramp is built
   * around that.
   *
   * Density multiplies through this (`densityFontScale`), so compact
   * and kiosk move with it and are not restated anywhere.
   */
  fontSize: {
    xs: "0.9375rem",
    sm: "1rem",
    md: "1.0625rem",
    lg: "1.1875rem",
    xl: "1.5rem",
    "2xl": "1.875rem",
  },
  /**
   * Slightly tighter than the old 1.25/1.5/1.7 in relative terms,
   * because the absolute leading grew with the ramp: 1.55 on a 17px
   * body is 26.4px of line box against 1.5 on 15px giving 22.5px.
   * Leading and size are one decision, not two.
   */
  lineHeight: {
    tight: "1.28",
    normal: "1.55",
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
