/**
 * Token → CSS custom properties.
 *
 * The unifying mechanism of the whole library. Tailwind v4's
 * `@theme` emits `--color-*` anyway, plain CSS reads `var()`, and
 * one attribute flip on `<html>` re-themes everything with **zero
 * re-render** because nothing in React ever sees the change.
 *
 * Note the deliberate spelling split: `colour` in TS identifiers
 * (matching `e6Colour` / `colourMode` / `getAccentColour` in
 * `castkit/packages/views/src/viewStyles.ts`) but `--color-*` in
 * CSS, because **Tailwind v4's `@theme` only generates `bg-*` and
 * `text-*` utilities from the `--color-` namespace**. This is not
 * an inconsistency to be tidied up later; tidying it breaks
 * Tailwind.
 */

import {
  container,
  densityControl,
  densityFontScale,
  layer,
  screen,
  space,
} from "./scales.ts"
import type {
  Density,
  Scheme,
  SchemeColours,
  Variant,
} from "./types.ts"
import { INTENT_NAMES } from "./contrastAudit.ts"

const declare = (
  name: string,
  value: string,
) => `  ${name}: ${value};`

export const buildColourProperties = (
  colour: SchemeColours,
): string[] => [
  ...Object
    .entries(colour.surface)
    .map(([role, value]) => (
      declare(`--color-surface-${role}`, value)
    )),
  ...Object
    .entries(colour.content)
    .map(([role, value]) => (
      declare(
        `--color-content-${
          role.replace(
            /[A-Z]/g,
            (character) => `-${character.toLowerCase()}`,
          )
        }`,
        value,
      )
    )),
  ...Object
    .entries(colour.border)
    .map(([role, value]) => (
      declare(`--color-border-${role}`, value)
    )),
  ...INTENT_NAMES.flatMap((intent) => (
    Object
      .entries(colour.intent[intent])
      .map(([role, value]) => (
        declare(
          `--color-intent-${intent}-${
            role.replace(
              /[A-Z]/g,
              (character) => (
                `-${character.toLowerCase()}`
              ),
            )
          }`,
          value,
        )
      ))
  )),
  declare("--color-focus-ring", colour.focus.ring),
  declare(
    "--color-focus-ring-offset",
    colour.focus.ringOffset,
  ),
  ...Object
    .entries(colour.elevation)
    .map(([step, value]) => (
      declare(`--elevation-${step}`, value)
    )),
]

const buildStructuralProperties = () => [
  ...Object
    .entries(space)
    .map(([step, value]) => (
      declare(`--space-${step}`, value)
    )),
  ...Object
    .entries(layer)
    .map(([name, value]) => (
      declare(`--layer-${name}`, value)
    )),
  ...Object
    .entries(screen)
    .map(([name, value]) => (
      declare(`--screen-${name}`, value)
    )),
  ...Object
    .entries(container)
    .map(([name, value]) => (
      declare(`--container-${name}`, value)
    )),
]

const buildVariantProperties = (
  variant: Variant,
) => [
  ...Object
    .entries(variant.radius)
    .map(([step, value]) => (
      declare(`--radius-${step}`, value)
    )),
  ...Object
    .entries(variant.motion.duration)
    .map(([step, value]) => (
      declare(`--duration-${step}`, value)
    )),
  ...Object
    .entries(variant.motion.easing)
    .map(([step, value]) => (
      declare(`--easing-${step}`, value)
    )),
  declare(
    "--font-sans",
    variant.typography.fontFamily.sans,
  ),
  declare(
    "--font-mono",
    variant.typography.fontFamily.mono,
  ),
  ...Object
    .entries(variant.typography.fontWeight)
    .map(([step, value]) => (
      declare(`--font-weight-${step}`, value)
    )),
  ...Object
    .entries(variant.typography.lineHeight)
    .map(([step, value]) => (
      declare(`--line-height-${step}`, value)
    )),
  ...Object
    .entries(variant.typography.letterSpacing)
    .map(([step, value]) => (
      declare(`--tracking-${step}`, value)
    )),
  declare(
    "--focus-ring-width",
    variant.focusRing.width,
  ),
  declare(
    "--focus-ring-offset",
    variant.focusRing.offset,
  ),
]

/**
 * Density sets control sizing and scales the type ramp. It is
 * emitted separately from the variant so the two compose: any
 * variant × any density, no combinatorial explosion of rules.
 */
export const buildDensityProperties = (
  variant: Variant,
  density: Density,
) => {
  const control = (
    density === "comfortable"
      ? variant.control
      : densityControl[density]
  )

  const scale = densityFontScale[density]

  return [
    ...Object
      .entries(control.height)
      .map(([size, value]) => (
        declare(`--control-height-${size}`, value)
      )),
    ...Object
      .entries(control.paddingInline)
      .map(([size, value]) => (
        declare(
          `--control-padding-inline-${size}`,
          value,
        )
      )),
    ...Object
      .entries(control.gap)
      .map(([size, value]) => (
        declare(`--control-gap-${size}`, value)
      )),
    declare(
      "--control-min-touch-target",
      control.minTouchTarget,
    ),
    ...Object
      .entries(variant.typography.fontSize)
      .map(([step, value]) => {
        const rem = Number(
          value.replace("rem", ""),
        )

        return declare(
          `--font-size-${step}`,
          `${
            Math.round(rem * scale * 10000) / 10000
          }rem`,
        )
      }),
  ]
}

const SCHEMES: Scheme[] = ["light", "dark"]

const DENSITIES: Density[] = [
  "comfortable",
  "compact",
  "kiosk",
]

/**
 * The runtime substrate: `:root` + `[data-variant]` +
 * `[data-scheme]` + `[data-density]`, all on `<html>`.
 *
 * Emitted for **every** variant rather than only the winner, so
 * the M0 bake-off can switch candidates live in one page — and so
 * the losers keep working as alternates afterwards at no cost.
 */
export const buildVariablesCss = (
  variants: Variant[],
  defaultVariant: string,
) => {
  const blocks: string[] = [
    "/* Generated by packages/tokens/scripts/buildTokens.ts — do not edit. */",
    "",
    ":root {",
    ...buildStructuralProperties(),
    "}",
  ]

  for (const variant of variants) {
    const selector = (
      variant.name === defaultVariant
        ? `:root, [data-variant="${variant.name}"]`
        : `[data-variant="${variant.name}"]`
    )

    blocks.push(
      "",
      `${selector} {`,
      ...buildVariantProperties(variant),
      "}",
    )

    for (const scheme of SCHEMES) {
      const schemeSelector = (
        variant.name === defaultVariant
          ? `[data-scheme="${scheme}"], [data-variant="${variant.name}"][data-scheme="${scheme}"]`
          : `[data-variant="${variant.name}"][data-scheme="${scheme}"]`
      )

      blocks.push(
        "",
        `${schemeSelector} {`,
        ...buildColourProperties(
          variant.schemes[scheme],
        ),
        "}",
      )
    }

    for (const density of DENSITIES) {
      const densitySelector = (
        variant.name === defaultVariant
          ? `[data-density="${density}"], [data-variant="${variant.name}"][data-density="${density}"]`
          : `[data-variant="${variant.name}"][data-density="${density}"]`
      )

      blocks.push(
        "",
        `${densitySelector} {`,
        ...buildDensityProperties(
          variant,
          density,
        ),
        "}",
      )
    }
  }

  // Every duration collapses to zero under reduced motion, in one
  // place. `mux-magic/…/styles/builderStyles.css` currently
  // hand-writes this per animation, which is how one gets missed.
  blocks.push(
    "",
    "@media (prefers-reduced-motion: reduce) {",
    "  :root {",
    "    --duration-instant: 0ms;",
    "    --duration-fast: 0ms;",
    "    --duration-normal: 0ms;",
    "    --duration-slow: 0ms;",
    "  }",
    "}",
    "",
  )

  return blocks.join("\n")
}

/**
 * The Tailwind v4 entry point. `@theme` turns `--color-*` into
 * `bg-*` / `text-*` / `border-*` utilities; `@custom-variant dark`
 * points Tailwind's `dark:` at our attribute rather than at its
 * default `prefers-color-scheme` media query, because the scheme
 * here is a deliberate choice rather than an OS setting.
 */
export const buildThemeCss = () => [
  "/* Generated by packages/tokens/scripts/buildTokens.ts — do not edit. */",
  "",
  '@import "./variables.css";',
  "",
  '@custom-variant dark (&:where([data-scheme="dark"], [data-scheme="dark"] *));',
  "",
  "@theme inline {",
  ...[
    "surface-base",
    "surface-raised",
    "surface-sunken",
    "surface-overlay",
    "surface-inverse",
    "content-primary",
    "content-secondary",
    "content-muted",
    "content-disabled",
    "content-on-accent",
    "border-subtle",
    "border-default",
    "border-strong",
    "border-focus",
    "focus-ring",
    "focus-ring-offset",
  ].map((name) => (
    `  --color-${name}: var(--color-${name});`
  )),
  ...INTENT_NAMES.flatMap((intent) => (
    [
      "surface",
      "surface-hover",
      "border",
      "content",
      "solid",
      "solid-hover",
      "on-solid",
    ].map((role) => (
      `  --color-intent-${intent}-${role}: var(--color-intent-${intent}-${role});`
    ))
  )),
  "}",
  "",
].join("\n")
