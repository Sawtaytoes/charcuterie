/**
 * One intent → class map, for the whole fleet.
 *
 * This file is what M5 deletes from rip-deck. `TONE_CLASS` is
 * declared *identically* in `VerdictBadge.tsx` and
 * `TowerAlerts.tsx` today — hardcoded hexes and `slate-400`s, no
 * light mode, no relationship to mux-magic's `statusClassMap` which
 * spells the same idea a fourth way. Six intents x four
 * appearances, named once, is the generalisation.
 *
 * **Every class name is written out in full, and that is not
 * negotiable.** Tailwind v4 scans source text for *complete* class
 * strings, so `` `bg-intent-${intent}-solid` `` generates nothing
 * at all — the element renders unstyled with no error, no warning,
 * and no failing test unless something checks. Something does:
 * `tailwindCandidates.test.ts` compiles every literal in this
 * package through the real Tailwind and fails on any candidate
 * Tailwind cannot generate. That test is the reason this file is
 * allowed to be 24 lines of near-duplication instead of a loop.
 */

import type { IntentName } from "@charcuterie/tokens"

/**
 * Four treatments, and the split is semantic rather than cosmetic:
 *
 *  - `solid` — the saturated fill. One per view, usually; it is the
 *    thing you are meant to press.
 *  - `soft` — the tinted treatment the fleet already reaches for on
 *    status pills (`bg-blue-950 text-blue-300` in mux-magic,
 *    `bg-amber-950/40 text-amber-200` in rip-deck).
 *  - `outline` — border and content only. Reads as secondary
 *    without claiming a surface.
 *  - `ghost` — nothing until hovered. Toolbars and icon rows.
 */
export type IntentAppearance =
  | "ghost"
  | "outline"
  | "soft"
  | "solid"

export const INTENT_APPEARANCE_CLASS: Record<
  IntentName,
  Record<IntentAppearance, string>
> = {
  neutral: {
    ghost:
      "border-transparent bg-transparent text-content-primary",
    outline:
      "border-intent-neutral-border bg-transparent text-intent-neutral-content",
    soft: "border-intent-neutral-border bg-intent-neutral-surface text-intent-neutral-content",
    solid:
      "border-transparent bg-intent-neutral-solid text-intent-neutral-on-solid",
  },
  accent: {
    ghost:
      "border-transparent bg-transparent text-intent-accent-content",
    outline:
      "border-intent-accent-border bg-transparent text-intent-accent-content",
    soft: "border-intent-accent-border bg-intent-accent-surface text-intent-accent-content",
    solid:
      "border-transparent bg-intent-accent-solid text-intent-accent-on-solid",
  },
  success: {
    ghost:
      "border-transparent bg-transparent text-intent-success-content",
    outline:
      "border-intent-success-border bg-transparent text-intent-success-content",
    soft: "border-intent-success-border bg-intent-success-surface text-intent-success-content",
    solid:
      "border-transparent bg-intent-success-solid text-intent-success-on-solid",
  },
  warning: {
    ghost:
      "border-transparent bg-transparent text-intent-warning-content",
    outline:
      "border-intent-warning-border bg-transparent text-intent-warning-content",
    soft: "border-intent-warning-border bg-intent-warning-surface text-intent-warning-content",
    solid:
      "border-transparent bg-intent-warning-solid text-intent-warning-on-solid",
  },
  danger: {
    ghost:
      "border-transparent bg-transparent text-intent-danger-content",
    outline:
      "border-intent-danger-border bg-transparent text-intent-danger-content",
    soft: "border-intent-danger-border bg-intent-danger-surface text-intent-danger-content",
    solid:
      "border-transparent bg-intent-danger-solid text-intent-danger-on-solid",
  },
  info: {
    ghost:
      "border-transparent bg-transparent text-intent-info-content",
    outline:
      "border-intent-info-border bg-transparent text-intent-info-content",
    soft: "border-intent-info-border bg-intent-info-surface text-intent-info-content",
    solid:
      "border-transparent bg-intent-info-solid text-intent-info-on-solid",
  },
}

/**
 * Hover, split out rather than folded into the appearance above —
 * because most things wearing an intent are **not** interactive.
 *
 * A `Badge` that lightens under the cursor is telling the user it
 * can be clicked, and rip-deck's verdict pills (which cannot) would
 * inherit exactly that if the two maps were one. So an interactive
 * component opts in, and a static one cannot accidentally opt in.
 *
 * `solid` hovers toward `solidHover`; the other three land on the
 * intent's tinted surface, which is what gives a ghost toolbar
 * button something to become.
 */
export const INTENT_HOVER_CLASS: Record<
  IntentName,
  Record<IntentAppearance, string>
> = {
  neutral: {
    ghost: "hover:bg-intent-neutral-surface",
    outline: "hover:bg-intent-neutral-surface",
    soft: "hover:bg-intent-neutral-surface-hover",
    solid: "hover:bg-intent-neutral-solid-hover",
  },
  accent: {
    ghost: "hover:bg-intent-accent-surface",
    outline: "hover:bg-intent-accent-surface",
    soft: "hover:bg-intent-accent-surface-hover",
    solid: "hover:bg-intent-accent-solid-hover",
  },
  success: {
    ghost: "hover:bg-intent-success-surface",
    outline: "hover:bg-intent-success-surface",
    soft: "hover:bg-intent-success-surface-hover",
    solid: "hover:bg-intent-success-solid-hover",
  },
  warning: {
    ghost: "hover:bg-intent-warning-surface",
    outline: "hover:bg-intent-warning-surface",
    soft: "hover:bg-intent-warning-surface-hover",
    solid: "hover:bg-intent-warning-solid-hover",
  },
  danger: {
    ghost: "hover:bg-intent-danger-surface",
    outline: "hover:bg-intent-danger-surface",
    soft: "hover:bg-intent-danger-surface-hover",
    solid: "hover:bg-intent-danger-solid-hover",
  },
  info: {
    ghost: "hover:bg-intent-info-surface",
    outline: "hover:bg-intent-info-surface",
    soft: "hover:bg-intent-info-surface-hover",
    solid: "hover:bg-intent-info-solid-hover",
  },
}

/**
 * The fill colour on its own, for the parts of a component that are
 * a bar or a dot rather than a box — a `ProgressBar`'s fill, a
 * `LiveStatusIndicator`'s dot. Same values, no border and no hover,
 * because neither of those is a surface anyone can point at.
 */
export const INTENT_SOLID_FILL_CLASS: Record<
  IntentName,
  string
> = {
  neutral: "bg-intent-neutral-solid",
  accent: "bg-intent-accent-solid",
  success: "bg-intent-success-solid",
  warning: "bg-intent-warning-solid",
  danger: "bg-intent-danger-solid",
  info: "bg-intent-info-solid",
}

/** The same six as text, for a glyph or a dot's ring. */
export const INTENT_CONTENT_CLASS: Record<
  IntentName,
  string
> = {
  neutral: "text-intent-neutral-content",
  accent: "text-intent-accent-content",
  success: "text-intent-success-content",
  warning: "text-intent-warning-content",
  danger: "text-intent-danger-content",
  info: "text-intent-info-content",
}

/**
 * The focus ring, in one place, reading the variant's own width and
 * offset.
 *
 * `focus-visible` rather than `focus`: a mouse click on a button
 * should not leave a ring behind, and every hand-rolled button in
 * the inventory either rings on click or — more often — has
 * `outline-none` with nothing put back.
 */
export const FOCUS_RING_CLASS =
  "focus-visible:outline-solid focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(--focus-ring-offset) focus-visible:outline-focus-ring"

/**
 * WCAG 1.4.3 exempts *inactive* controls from contrast, which is
 * the only reason `content.disabled` is allowed to be this quiet —
 * and the exemption is honest only on something actually disabled.
 * Keeping it in one constant is what stops it drifting onto prose.
 */
export const DISABLED_CLASS =
  "disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-sunken disabled:text-content-disabled disabled:shadow-none"
