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

import { INTENT_NAMES } from "./contrastAudit.ts"
import {
  containerQuery,
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

const declare = (name: string, value: string) =>
  `  ${name}: ${value};`

/** `surfaceHover` → `surface-hover`, `loopFast` → `loop-fast`. */
const toKebab = (name: string) =>
  name.replace(
    /[A-Z]/g,
    (character) => `-${character.toLowerCase()}`,
  )

export const buildColourProperties = (
  colour: SchemeColours,
): string[] => [
  ...Object.entries(colour.surface).map(([role, value]) =>
    declare(`--color-surface-${role}`, value),
  ),
  ...Object.entries(colour.content).map(([role, value]) =>
    declare(
      `--color-content-${role.replace(
        /[A-Z]/g,
        (character) => `-${character.toLowerCase()}`,
      )}`,
      value,
    ),
  ),
  ...Object.entries(colour.border).map(([role, value]) =>
    declare(`--color-border-${role}`, value),
  ),
  ...INTENT_NAMES.flatMap((intent) =>
    Object.entries(colour.intent[intent]).map(
      ([role, value]) =>
        declare(
          `--color-intent-${intent}-${role.replace(
            /[A-Z]/g,
            (character) => `-${character.toLowerCase()}`,
          )}`,
          value,
        ),
    ),
  ),
  declare("--color-focus-ring", colour.focus.ring),
  declare(
    "--color-focus-ring-offset",
    colour.focus.ringOffset,
  ),
  ...Object.entries(colour.elevation).map(([step, value]) =>
    declare(`--elevation-${step}`, value),
  ),
]

const buildStructuralProperties = () => [
  ...Object.entries(space).map(([step, value]) =>
    declare(`--space-${step}`, value),
  ),
  ...Object.entries(layer).map(([name, value]) =>
    declare(`--layer-${name}`, value),
  ),
  ...Object.entries(screen).map(([name, value]) =>
    declare(`--screen-${name}`, value),
  ),
  ...Object.entries(containerQuery).map(([name, value]) =>
    declare(`--cq-${name}`, value),
  ),
]

const buildVariantProperties = (variant: Variant) => [
  ...Object.entries(variant.radius).map(([step, value]) =>
    declare(`--radius-${step}`, value),
  ),
  ...Object.entries(variant.motion.duration).map(
    ([step, value]) =>
      declare(`--duration-${toKebab(step)}`, value),
  ),
  ...Object.entries(variant.motion.easing).map(
    ([step, value]) => declare(`--easing-${step}`, value),
  ),
  declare(
    "--font-sans",
    variant.typography.fontFamily.sans,
  ),
  declare(
    "--font-mono",
    variant.typography.fontFamily.mono,
  ),
  ...Object.entries(variant.typography.fontWeight).map(
    ([step, value]) =>
      declare(`--font-weight-${step}`, value),
  ),
  ...Object.entries(variant.typography.lineHeight).map(
    ([step, value]) =>
      declare(`--line-height-${step}`, value),
  ),
  ...Object.entries(variant.typography.letterSpacing).map(
    ([step, value]) => declare(`--tracking-${step}`, value),
  ),
  declare("--focus-ring-width", variant.focusRing.width),
  declare("--focus-ring-offset", variant.focusRing.offset),
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
  const control =
    density === "comfortable"
      ? variant.control
      : densityControl[density]

  const scale = densityFontScale[density]

  return [
    ...Object.entries(control.height).map(([size, value]) =>
      declare(`--control-height-${size}`, value),
    ),
    ...Object.entries(control.paddingInline).map(
      ([size, value]) =>
        declare(`--control-padding-inline-${size}`, value),
    ),
    ...Object.entries(control.gap).map(([size, value]) =>
      declare(`--control-gap-${size}`, value),
    ),
    declare(
      "--control-min-touch-target",
      control.minTouchTarget,
    ),
    ...Object.entries(variant.typography.fontSize).map(
      ([step, value]) => {
        const rem = Number(value.replace("rem", ""))

        return declare(
          `--font-size-${step}`,
          `${Math.round(rem * scale * 10000) / 10000}rem`,
        )
      },
    ),
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
    const selector =
      variant.name === defaultVariant
        ? `:root, [data-variant="${variant.name}"]`
        : `[data-variant="${variant.name}"]`

    blocks.push(
      "",
      `${selector} {`,
      ...buildVariantProperties(variant),
      "}",
    )

    for (const scheme of SCHEMES) {
      const schemeSelector =
        variant.name === defaultVariant
          ? `[data-scheme="${scheme}"], [data-variant="${variant.name}"][data-scheme="${scheme}"]`
          : `[data-variant="${variant.name}"][data-scheme="${scheme}"]`

      blocks.push(
        "",
        `${schemeSelector} {`,
        ...buildColourProperties(variant.schemes[scheme]),
        "}",
      )
    }

    for (const density of DENSITIES) {
      const densitySelector =
        variant.name === defaultVariant
          ? `[data-density="${density}"], [data-variant="${variant.name}"][data-density="${density}"]`
          : `[data-variant="${variant.name}"][data-density="${density}"]`

      blocks.push(
        "",
        `${densitySelector} {`,
        ...buildDensityProperties(variant, density),
        "}",
      )
    }
  }

  // Every duration collapses to zero under reduced motion, in one
  // place. `mux-magic/…/styles/builderStyles.css` currently
  // hand-writes this per animation, which is how one gets missed.
  //
  // Zeroing a duration is necessary but not sufficient for looping
  // animations: `animation: sweep 0ms infinite` still holds the
  // first keyframe, which for a sweep is an off-screen bar. So the
  // loop durations are zeroed *and* `animation` is switched off
  // outright, and any component with a moving affordance owes a
  // static fallback that still reads correctly.
  blocks.push(
    "",
    "@media (prefers-reduced-motion: reduce) {",
    "  :root {",
    "    --duration-instant: 0ms;",
    "    --duration-fast: 0ms;",
    "    --duration-normal: 0ms;",
    "    --duration-slow: 0ms;",
    "    --duration-loop-fast: 0ms;",
    "    --duration-loop-slow: 0ms;",
    "  }",
    "}",
    "",
  )

  return blocks.join("\n")
}

/**
 * The names `theme.css` publishes into Tailwind's own namespaces,
 * beyond colour.
 *
 * Colour is a namespace Tailwind has no default content for, so
 * publishing it only adds utilities. These five are different:
 * Tailwind ships its own `--text-*`, `--leading-*`, `--shadow-*`,
 * `--ease-*`, and `--spacing`, so every entry here **redefines
 * what an existing utility means** in every consumer.
 *
 * That is the point. `text-sm` has to be our type ramp or it is
 * not our type ramp — and ours is density-aware, so a component
 * writing `text-sm` grows on the kiosk while one writing
 * Tailwind's default does not. The same argument the M1 collision
 * audit made for `--radius-*` and `--tracking-*` carrying a
 * variant's character applies here; the difference is only that
 * those collide implicitly at `:root` while these are stated.
 *
 * The alternative — components writing
 * `text-(length:--font-size-sm)` everywhere — puts a token
 * indirection in every className and still leaves `text-sm`
 * meaning Tailwind's 0.875rem for anyone who forgets. Bridging
 * once, here, is the honest version.
 *
 * Deliberately **not** bridged: `--space-*` stays off `--spacing`
 * as a name (Tailwind's is a single multiplier, ours is a stepped
 * scale) but the multiplier is published so `p-3` is a token
 * value rather than a coincidence — the two happen to agree at
 * 4px today and this is what keeps them agreeing on purpose.
 * `--duration-*` and `--control-*` have no Tailwind namespace at
 * all, so components reach them as `duration-(--duration-fast)`
 * and `h-(--control-height-md)`.
 */
export const THEME_BRIDGES = {
  "--text-": "--font-size-",
  "--leading-": "--line-height-",
  "--shadow-": "--elevation-",
  "--ease-": "--easing-",
  "--spacing": "--space-1",
} as const

const FONT_SIZE_STEPS = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
] as const

const LINE_HEIGHT_STEPS = [
  "tight",
  "normal",
  "relaxed",
] as const

/**
 * `none` is omitted: Tailwind's own `shadow-none` already emits
 * `box-shadow: none`, and ePaper collapses every elevation step to
 * `none` at the variable level, so a `shadow-none` that reads a
 * variable would buy nothing.
 */
const ELEVATION_STEPS = ["low", "medium", "high"] as const

const EASING_STEPS = [
  "standard",
  "entrance",
  "exit",
  "emphasized",
] as const

const buildThemeBridges = () => [
  ...FONT_SIZE_STEPS.map(
    (step) => `  --text-${step}: var(--font-size-${step});`,
  ),
  ...LINE_HEIGHT_STEPS.map(
    (step) =>
      `  --leading-${step}: var(--line-height-${step});`,
  ),
  ...ELEVATION_STEPS.map(
    (step) =>
      `  --shadow-${step}: var(--elevation-${step});`,
  ),
  ...EASING_STEPS.map(
    (step) => `  --ease-${step}: var(--easing-${step});`,
  ),
  // Tailwind multiplies this by the utility's number, so it has to
  // be the scale's *step*, not a scale entry: `p-3` is
  // `calc(var(--spacing) * 3)`, which is `space[3]` only because
  // `space[1]` is the base. Reading it from the scale rather than
  // writing `0.25rem` is what makes the two impossible to drift.
  `  --spacing: ${space[1]};`,
]

/**
 * `cq-sm:` … `cq-xl:` — our container-query scale as Tailwind
 * variants.
 *
 * **Generated because it cannot be a variable.** A container query's
 * condition is resolved by the browser before custom properties
 * exist, so `@container (min-inline-size: var(--cq-sm))` is invalid
 * CSS — the threshold has to be a literal. Emitting the literal
 * *from the scale* is the only way to have one source of truth and a
 * working query, which is exactly the kind of thing a generator is
 * for.
 *
 * Deliberately not Tailwind's own `@sm:`/`@md:` container variants:
 * those read `--container-*`, which is the namespace M1 moved our
 * scale **off** because Tailwind owns it for `max-w-*` at different
 * sizes. `cq-` matches the `--cq-*` custom properties, so the
 * variant and the variable are the same word.
 *
 * `min-inline-size` rather than `min-width`, per the
 * logical-properties rule.
 */
const buildContainerQueryVariants = () =>
  Object.entries(containerQuery).map(
    ([name, value]) =>
      `@custom-variant cq-${name} (@container (min-inline-size: ${value}));`,
  )

/**
 * The Tailwind v4 entry point. `@theme` turns `--color-*` into
 * `bg-*` / `text-*` / `border-*` utilities; `@custom-variant dark`
 * points Tailwind's `dark:` at our attribute rather than at its
 * default `prefers-color-scheme` media query, because the scheme
 * here is a deliberate choice rather than an OS setting.
 */
export const buildThemeCss = () =>
  [
    "/* Generated by packages/tokens/scripts/buildTokens.ts — do not edit. */",
    "",
    '@import "./variables.css";',
    "",
    '@custom-variant dark (&:where([data-scheme="dark"], [data-scheme="dark"] *));',
    "",
    ...buildContainerQueryVariants(),
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
    ].map(
      (name) => `  --color-${name}: var(--color-${name});`,
    ),
    ...INTENT_NAMES.flatMap((intent) =>
      [
        "surface",
        "surface-hover",
        "border",
        "content",
        "solid",
        "solid-hover",
        "on-solid",
      ].map(
        (role) =>
          `  --color-intent-${intent}-${role}: var(--color-intent-${intent}-${role});`,
      ),
    ),
    "",
    ...buildThemeBridges(),
    "}",
    "",
  ].join("\n")
