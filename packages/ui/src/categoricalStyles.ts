/**
 * One categorical index → class map, the twin of
 * `intentStyles.ts`.
 *
 * Its own file rather than ten more entries in that one, because
 * the two families are keyed by different things and mean different
 * things. `intentStyles.ts` opens by explaining that it exists to
 * delete rip-deck's duplicated `TONE_CLASS` — a *status* map, where
 * every key is a claim about state. Nothing here is a claim about
 * anything: an index is a user's pick for a label, and the only
 * thing a component may do with it is paint it. Keeping them apart
 * is also what keeps `IntentName` an exhaustive union that
 * `getAsyncIntent` can switch over.
 *
 * **Every class name is written out in full, and that is not
 * negotiable.** Tailwind v4 scans source text for *complete* class
 * strings, so `` `bg-categorical-${index}-solid` `` generates
 * nothing at all — the badge renders unstyled with no error, no
 * warning, and no failing test unless something checks. Something
 * does: `tailwindCandidates.test.ts` compiles every literal in this
 * package through the real Tailwind and fails on any candidate it
 * cannot generate. Forty lines of near-duplication is the price,
 * and the alternative is the `--color-danger-9` that shipped in
 * Docket: a token name that had never existed, resolving to
 * nothing, painting transparent, and passing every assertion about
 * whether the element was rendered.
 */

import type { CategoricalIndex } from "@charcuterie/tokens"

import type { IntentAppearance } from "./intentStyles.ts"

export const CATEGORICAL_APPEARANCE_CLASS: Record<
  CategoricalIndex,
  Record<IntentAppearance, string>
> = {
  1: {
    ghost:
      "border-transparent bg-transparent text-categorical-1-content",
    outline:
      "border-categorical-1-border bg-transparent text-categorical-1-content",
    soft: "border-categorical-1-border bg-categorical-1-surface text-categorical-1-content",
    solid:
      "border-transparent bg-categorical-1-solid text-categorical-1-on-solid",
  },
  2: {
    ghost:
      "border-transparent bg-transparent text-categorical-2-content",
    outline:
      "border-categorical-2-border bg-transparent text-categorical-2-content",
    soft: "border-categorical-2-border bg-categorical-2-surface text-categorical-2-content",
    solid:
      "border-transparent bg-categorical-2-solid text-categorical-2-on-solid",
  },
  3: {
    ghost:
      "border-transparent bg-transparent text-categorical-3-content",
    outline:
      "border-categorical-3-border bg-transparent text-categorical-3-content",
    soft: "border-categorical-3-border bg-categorical-3-surface text-categorical-3-content",
    solid:
      "border-transparent bg-categorical-3-solid text-categorical-3-on-solid",
  },
  4: {
    ghost:
      "border-transparent bg-transparent text-categorical-4-content",
    outline:
      "border-categorical-4-border bg-transparent text-categorical-4-content",
    soft: "border-categorical-4-border bg-categorical-4-surface text-categorical-4-content",
    solid:
      "border-transparent bg-categorical-4-solid text-categorical-4-on-solid",
  },
  5: {
    ghost:
      "border-transparent bg-transparent text-categorical-5-content",
    outline:
      "border-categorical-5-border bg-transparent text-categorical-5-content",
    soft: "border-categorical-5-border bg-categorical-5-surface text-categorical-5-content",
    solid:
      "border-transparent bg-categorical-5-solid text-categorical-5-on-solid",
  },
  6: {
    ghost:
      "border-transparent bg-transparent text-categorical-6-content",
    outline:
      "border-categorical-6-border bg-transparent text-categorical-6-content",
    soft: "border-categorical-6-border bg-categorical-6-surface text-categorical-6-content",
    solid:
      "border-transparent bg-categorical-6-solid text-categorical-6-on-solid",
  },
  7: {
    ghost:
      "border-transparent bg-transparent text-categorical-7-content",
    outline:
      "border-categorical-7-border bg-transparent text-categorical-7-content",
    soft: "border-categorical-7-border bg-categorical-7-surface text-categorical-7-content",
    solid:
      "border-transparent bg-categorical-7-solid text-categorical-7-on-solid",
  },
  8: {
    ghost:
      "border-transparent bg-transparent text-categorical-8-content",
    outline:
      "border-categorical-8-border bg-transparent text-categorical-8-content",
    soft: "border-categorical-8-border bg-categorical-8-surface text-categorical-8-content",
    solid:
      "border-transparent bg-categorical-8-solid text-categorical-8-on-solid",
  },
  9: {
    ghost:
      "border-transparent bg-transparent text-categorical-9-content",
    outline:
      "border-categorical-9-border bg-transparent text-categorical-9-content",
    soft: "border-categorical-9-border bg-categorical-9-surface text-categorical-9-content",
    solid:
      "border-transparent bg-categorical-9-solid text-categorical-9-on-solid",
  },
  10: {
    ghost:
      "border-transparent bg-transparent text-categorical-10-content",
    outline:
      "border-categorical-10-border bg-transparent text-categorical-10-content",
    soft: "border-categorical-10-border bg-categorical-10-surface text-categorical-10-content",
    solid:
      "border-transparent bg-categorical-10-solid text-categorical-10-on-solid",
  },
}

/**
 * Hover, split out for exactly the reason `INTENT_HOVER_CLASS` is:
 * most things wearing a colour are not interactive. A label pill in
 * a task list that lightens under the cursor is telling the user it
 * can be clicked, and a `Badge` cannot be. So an interactive
 * component opts in, and a static one cannot accidentally opt in.
 *
 * `solid` hovers toward `solidHover`, which for this family is
 * **brighter** rather than deeper — the fill carries a near-black
 * label, so it moves away from it in the opposite direction to an
 * intent's white-labelled fill.
 */
export const CATEGORICAL_HOVER_CLASS: Record<
  CategoricalIndex,
  Record<IntentAppearance, string>
> = {
  1: {
    ghost: "hover:bg-categorical-1-surface",
    outline: "hover:bg-categorical-1-surface",
    soft: "hover:bg-categorical-1-surface-hover",
    solid: "hover:bg-categorical-1-solid-hover",
  },
  2: {
    ghost: "hover:bg-categorical-2-surface",
    outline: "hover:bg-categorical-2-surface",
    soft: "hover:bg-categorical-2-surface-hover",
    solid: "hover:bg-categorical-2-solid-hover",
  },
  3: {
    ghost: "hover:bg-categorical-3-surface",
    outline: "hover:bg-categorical-3-surface",
    soft: "hover:bg-categorical-3-surface-hover",
    solid: "hover:bg-categorical-3-solid-hover",
  },
  4: {
    ghost: "hover:bg-categorical-4-surface",
    outline: "hover:bg-categorical-4-surface",
    soft: "hover:bg-categorical-4-surface-hover",
    solid: "hover:bg-categorical-4-solid-hover",
  },
  5: {
    ghost: "hover:bg-categorical-5-surface",
    outline: "hover:bg-categorical-5-surface",
    soft: "hover:bg-categorical-5-surface-hover",
    solid: "hover:bg-categorical-5-solid-hover",
  },
  6: {
    ghost: "hover:bg-categorical-6-surface",
    outline: "hover:bg-categorical-6-surface",
    soft: "hover:bg-categorical-6-surface-hover",
    solid: "hover:bg-categorical-6-solid-hover",
  },
  7: {
    ghost: "hover:bg-categorical-7-surface",
    outline: "hover:bg-categorical-7-surface",
    soft: "hover:bg-categorical-7-surface-hover",
    solid: "hover:bg-categorical-7-solid-hover",
  },
  8: {
    ghost: "hover:bg-categorical-8-surface",
    outline: "hover:bg-categorical-8-surface",
    soft: "hover:bg-categorical-8-surface-hover",
    solid: "hover:bg-categorical-8-solid-hover",
  },
  9: {
    ghost: "hover:bg-categorical-9-surface",
    outline: "hover:bg-categorical-9-surface",
    soft: "hover:bg-categorical-9-surface-hover",
    solid: "hover:bg-categorical-9-solid-hover",
  },
  10: {
    ghost: "hover:bg-categorical-10-surface",
    outline: "hover:bg-categorical-10-surface",
    soft: "hover:bg-categorical-10-surface-hover",
    solid: "hover:bg-categorical-10-solid-hover",
  },
}

/**
 * The fill on its own, for the parts of a component that are a dot
 * or a bar rather than a box — the swatch beside a label in a
 * picker, a series marker on a chart. Same values, no border and no
 * hover, because neither of those is a surface anyone can point at.
 */
export const CATEGORICAL_SOLID_FILL_CLASS: Record<
  CategoricalIndex,
  string
> = {
  1: "bg-categorical-1-solid",
  2: "bg-categorical-2-solid",
  3: "bg-categorical-3-solid",
  4: "bg-categorical-4-solid",
  5: "bg-categorical-5-solid",
  6: "bg-categorical-6-solid",
  7: "bg-categorical-7-solid",
  8: "bg-categorical-8-solid",
  9: "bg-categorical-9-solid",
  10: "bg-categorical-10-solid",
}

/** The same ten as text, for a glyph or a dot's ring. */
export const CATEGORICAL_CONTENT_CLASS: Record<
  CategoricalIndex,
  string
> = {
  1: "text-categorical-1-content",
  2: "text-categorical-2-content",
  3: "text-categorical-3-content",
  4: "text-categorical-4-content",
  5: "text-categorical-5-content",
  6: "text-categorical-6-content",
  7: "text-categorical-7-content",
  8: "text-categorical-8-content",
  9: "text-categorical-9-content",
  10: "text-categorical-10-content",
}
