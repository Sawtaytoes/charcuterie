/**
 * A coloured bar down a card's leading edge — and the reason it is
 * a pseudo-element rather than a border.
 *
 * Three apps had grown this shape independently and all three drew
 * it as a straight border beside a rounded box, so the bar ran past
 * the curve and stopped square while the card it belonged to was
 * round. Folio put `border-inline-start` on a WRAPPER around the
 * card; mail-sifter puts `borderInlineStartWidth: 4` on a
 * `rounded-xl` anchor; spoolbuddy writes `rounded-lg border-l-3`.
 * A border is painted on the border box, so none of them can follow
 * a corner — the notch is not a bug in any one app, it is what that
 * technique does.
 *
 * A pseudo-element overlays the card and takes
 * `border-radius: inherit`, so the bar follows whatever radius the
 * card already has and nobody states a radius twice.
 *
 * ⚠️ **The shadow goes on the pseudo-element, never on the card.**
 * `Card` carries `shadow-low` from the elevation scale, and an app
 * stylesheet is unlayered while Tailwind's utilities sit in
 * `@layer utilities` — so a `box-shadow` written at the call site
 * outranks the utility and takes the card's elevation away with it.
 * That is not hypothetical; it is the version of this fix that was
 * written first.
 *
 * ⚠️ **Not a 3px-wide pseudo-element with a rounded leading edge.**
 * A `border-radius` of `0.5rem` on a 3px-wide box is clamped by the
 * browser to fit, so it caps the bar instead of following the
 * card's curve.
 *
 * ⚠️ **`box-shadow` has no logical form**, so the offset is
 * physical and the `rtl:` variant is what carries the bar to the
 * other side. A single `inset 3px` would put it on the left of an
 * Arabic page, which is the trailing edge there.
 */

import type { CategoricalIndex } from "@charcuterie/tokens"

/**
 * Which colour the bar takes.
 *
 * Two arms, because the fleet has two answers and neither is wrong.
 * Docket picks a **categorical index** — a colour a user chose for
 * a project, from the ten-wide contrast-audited family. Folio and
 * mail-sifter derive a **hue from a name hash**, so a repo added
 * tomorrow already has a colour and nobody maintains a palette;
 * that is 360 answers, not ten, and it cannot be an index.
 *
 * `intent` is deliberately absent. An intent is a claim the design
 * system makes — `danger` says what happens if you press the thing
 * — and no card in this fleet wants its edge to make one. When one
 * does, that is a third arm and a decision record, not a guess
 * made here.
 */
export type CardAccentEdge =
  | { categorical: CategoricalIndex; color?: never }
  | { categorical?: never; color: string }

/**
 * The custom property an explicit colour is threaded through.
 *
 * A property rather than an inline `box-shadow`, because the shadow
 * string has to stay a COMPLETE literal in the source for Tailwind
 * to generate it at all. One literal reading one variable covers
 * every colour an app can compute; interpolating the colour into
 * the class name would generate nothing, paint nothing, and report
 * nothing.
 */
export const ACCENT_EDGE_COLOR_PROPERTY =
  "--charcuterie-accent-edge"

/**
 * The overlay itself. Colour arrives separately.
 *
 * `pointer-events: none` is load-bearing rather than tidy: this box
 * covers the whole card, including every link and button in it.
 */
export const ACCENT_EDGE_BASE_CLASS =
  "relative before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:content-['']"

/**
 * Ten indices, written out in full, for the reason
 * `categoricalStyles.ts` opens with: Tailwind scans source text for
 * COMPLETE class strings, so a template literal generates nothing
 * at all and the bar renders invisible with no error and no failing
 * test. `tailwindCandidates.test.ts` compiles every literal in this
 * package through the real Tailwind, which is the something that
 * checks.
 */
export const ACCENT_EDGE_CATEGORICAL_CLASS: Record<
  CategoricalIndex,
  string
> = {
  1: "before:shadow-[inset_3px_0_0_var(--color-categorical-1-solid)] rtl:before:shadow-[inset_-3px_0_0_var(--color-categorical-1-solid)]",
  2: "before:shadow-[inset_3px_0_0_var(--color-categorical-2-solid)] rtl:before:shadow-[inset_-3px_0_0_var(--color-categorical-2-solid)]",
  3: "before:shadow-[inset_3px_0_0_var(--color-categorical-3-solid)] rtl:before:shadow-[inset_-3px_0_0_var(--color-categorical-3-solid)]",
  4: "before:shadow-[inset_3px_0_0_var(--color-categorical-4-solid)] rtl:before:shadow-[inset_-3px_0_0_var(--color-categorical-4-solid)]",
  5: "before:shadow-[inset_3px_0_0_var(--color-categorical-5-solid)] rtl:before:shadow-[inset_-3px_0_0_var(--color-categorical-5-solid)]",
  6: "before:shadow-[inset_3px_0_0_var(--color-categorical-6-solid)] rtl:before:shadow-[inset_-3px_0_0_var(--color-categorical-6-solid)]",
  7: "before:shadow-[inset_3px_0_0_var(--color-categorical-7-solid)] rtl:before:shadow-[inset_-3px_0_0_var(--color-categorical-7-solid)]",
  8: "before:shadow-[inset_3px_0_0_var(--color-categorical-8-solid)] rtl:before:shadow-[inset_-3px_0_0_var(--color-categorical-8-solid)]",
  9: "before:shadow-[inset_3px_0_0_var(--color-categorical-9-solid)] rtl:before:shadow-[inset_-3px_0_0_var(--color-categorical-9-solid)]",
  10: "before:shadow-[inset_3px_0_0_var(--color-categorical-10-solid)] rtl:before:shadow-[inset_-3px_0_0_var(--color-categorical-10-solid)]",
}

/** The same bar, reading the caller's own colour. */
export const ACCENT_EDGE_COLOR_CLASS =
  "before:shadow-[inset_3px_0_0_var(--charcuterie-accent-edge)] rtl:before:shadow-[inset_-3px_0_0_var(--charcuterie-accent-edge)]"

export const getAccentEdgeClassName = (
  accentEdge: CardAccentEdge,
): string =>
  `${ACCENT_EDGE_BASE_CLASS} ${
    accentEdge.categorical == null
      ? ACCENT_EDGE_COLOR_CLASS
      : ACCENT_EDGE_CATEGORICAL_CLASS[
          accentEdge.categorical
        ]
  }`

/**
 * The inline style an explicit colour needs, and nothing when the
 * colour came from an index.
 *
 * Returns `undefined` rather than `{}` so a card with a categorical
 * edge and no `style` of its own renders no `style` attribute at
 * all.
 */
export const getAccentEdgeStyle = (
  accentEdge: CardAccentEdge,
): Record<string, string> | undefined =>
  accentEdge.color == null
    ? undefined
    : { [ACCENT_EDGE_COLOR_PROPERTY]: accentEdge.color }
