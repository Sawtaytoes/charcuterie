/**
 * The shape of the token layer.
 *
 * Two tiers, and the split is load-bearing:
 *
 *  - **Tier 1** is raw ramps (`slate.50…950`). Components may
 *    never reference them. They exist so a variant author has
 *    something to build tier 2 out of.
 *  - **Tier 2** is semantic roles. This is the only tier a
 *    component is allowed to name, which is what makes a variant
 *    swap a data-attribute flip rather than a find-and-replace.
 *
 * Everything here is colour-only plus the scales that vary by
 * visual direction. The scales that do *not* vary by direction
 * (layer, breakpoints, container sizes) live in `scales.ts`.
 */

import type { CategoricalIndex } from "./categorical.ts"

export type Scheme = "light" | "dark"

export type Density = "comfortable" | "compact" | "kiosk"

/**
 * The generalization of ripdeck's `TONE_CLASS` map, which is
 * currently declared identically in two files.
 */
export type IntentName =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"

export type SurfaceRole =
  | "base"
  | "raised"
  | "sunken"
  | "overlay"
  | "inverse"

export type ContentRole =
  | "primary"
  | "secondary"
  | "muted"
  | "disabled"
  | "onAccent"

export type BorderRole =
  | "subtle"
  | "default"
  | "strong"
  | "focus"

/**
 * The plan named four intent roles. Building the specimen board
 * surfaced a fifth need immediately: a *solid* fill.
 *
 * `surface` is the **tinted** treatment the fleet already uses for
 * status pills (`bg-blue-950 text-blue-300` in mux-magic's
 * `StatusBadge`, `bg-amber-950/40 text-amber-200` in ripdeck's
 * `VerdictBadge`). A primary button is a different thing — a
 * saturated fill with its own text colour — and deriving one from
 * the other is exactly the guesswork this layer exists to delete.
 *
 * So intents carry both, and `onSolid` is stated rather than
 * assumed, because whether white or near-black wins on a given
 * fill genuinely varies per intent.
 */
export type IntentRole =
  | "surface"
  | "surfaceHover"
  | "border"
  | "content"
  | "solid"
  | "solidHover"
  | "onSolid"

export type ElevationStep =
  | "none"
  | "low"
  | "medium"
  | "high"

export type RadiusStep =
  | "none"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "full"

export type ControlSize = "sm" | "md" | "lg"

/**
 * One scheme's worth of resolved colour roles.
 */
export type SchemeColours = {
  surface: Record<SurfaceRole, string>
  content: Record<ContentRole, string>
  border: Record<BorderRole, string>
  intent: Record<IntentName, Record<IntentRole, string>>
  /**
   * The numbered, non-semantic family — `categorical.1` …
   * `categorical.10`, each with the same seven roles an intent has.
   *
   * Separate from `intent` and not a seventh member of it, because
   * the two answer different questions and only one of them has an
   * answer in English. An intent is a *claim*: `danger` says what
   * happens if you press the thing, and a component may reasonably
   * switch on it. A categorical index says nothing at all — it is a
   * user's pick for a label or a project, or the third series on a
   * chart, and the only thing anyone may do with it is paint it.
   * Folding a `label7` into `IntentName` would put a value with no
   * meaning inside the union every `getAsyncIntent`-style
   * exhaustive switch in the fleet is written over.
   *
   * The index union comes back from `categorical.ts` as a
   * **type-only** import. That is a cycle on paper and none at
   * runtime — `import type` is erased entirely — and it is worth it
   * to keep `Record<CategoricalIndex, …>` exact here rather than
   * degrading to `Record<number, …>`, which would let a variant
   * ship an eleventh entry or omit the tenth with no complaint.
   */
  categorical: Record<
    CategoricalIndex,
    Record<IntentRole, string>
  >
  focus: {
    ring: string
    ringOffset: string
  }
  elevation: Record<ElevationStep, string>
  /**
   * The modal wash — `::backdrop`, and nothing else.
   *
   * Its own role rather than a member of `surface`, for two
   * reasons. It is the one colour here that is **deliberately
   * translucent**, so it would break the "opaque 6-digit hex"
   * rule the swatches are held to; and nothing is ever drawn *on*
   * it, so enrolling it in the `content.* on surface.*` contrast
   * matrix would be measuring a pair that cannot exist.
   *
   * A variant's own value, not a component's, because how hard a
   * direction separates a dialog from the page is exactly the
   * kind of thing a visual direction decides — `legible` dims
   * harder than `daylight` on purpose.
   *
   * `transparent` is legal and is what ePaper uses: a panel with
   * no opacity cannot dim, so it says so rather than faking it.
   */
  scrim: string
}

export type MotionTokens = {
  duration: {
    instant: string
    fast: string
    normal: string
    slow: string
    /**
     * Looping affordances — spinner, skeleton shimmer,
     * indeterminate sweep, live-status pulse.
     *
     * A separate ramp from the transition durations above, because
     * they answer a different question. A transition duration is
     * "how long does this change take"; a loop duration is "how
     * fast does this repeat forever", and a 120ms spinner is a
     * strobe. Keeping them in the token set at all is what lets
     * the ePaper profile and `prefers-reduced-motion` reach them —
     * writing `700ms` inline puts them beyond the theme's reach.
     */
    loopFast: string
    loopSlow: string
  }
  easing: {
    standard: string
    entrance: string
    exit: string
    emphasized: string
  }
}

export type TypographyTokens = {
  fontFamily: {
    /**
     * Headings, and only headings. Separate from `sans` because
     * M5 settled that they get their own face — a display cut at
     * 30px is doing a different job from body copy at 17px, and
     * one family covering both means neither is right.
     *
     * (Those two numbers were 24px and 13px until the 2026-08-10
     * ramp rebuild. The argument is unchanged; only the sizes moved.)
     *
     * A variant may point this at `sans` to opt out; nothing
     * requires the two to differ.
     */
    display: string
    sans: string
    mono: string
  }
  fontSize: Record<
    "xs" | "sm" | "md" | "lg" | "xl" | "2xl",
    string
  >
  lineHeight: Record<"tight" | "normal" | "relaxed", string>
  fontWeight: Record<
    "normal" | "medium" | "semibold" | "bold",
    string
  >
  letterSpacing: Record<"tight" | "normal" | "wide", string>
}

export type ControlTokens = {
  height: Record<ControlSize, string>
  paddingInline: Record<ControlSize, string>
  gap: Record<ControlSize, string>
  /**
   * Kiosk Pis and xander are driven by finger and by remote, so
   * this is a floor rather than an aspiration.
   */
  minTouchTarget: string
}

/**
 * A visual direction. M0 picks one of these; the losers survive
 * as alternate `data-variant` values for free.
 *
 * A variant overrides semantic roles and the scales that carry
 * visual character (radius, motion, typography, control sizing).
 * It never redefines layer, breakpoints, or container sizes.
 */
export type Variant = {
  name: string
  title: string
  description: string
  /** Tier 1. Never referenced by a component. */
  ramps: Record<string, Record<string, string>>
  schemes: Record<Scheme, SchemeColours>
  radius: Record<RadiusStep, string>
  motion: MotionTokens
  typography: TypographyTokens
  control: ControlTokens
  focusRing: {
    width: string
    offset: string
  }
}
