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
  contentInlineSize,
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
  declare("--color-scrim", colour.scrim),
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
  ...Object.entries(contentInlineSize).map(
    ([name, value]) =>
      declare(`--content-inline-size-${name}`, value),
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
    "--font-display",
    variant.typography.fontFamily.display,
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

/**
 * Exported for the generators only — deliberately NOT re-exported
 * from `index.ts`. A consumer that needs the roster reads the
 * `Scheme` union; this is here so `buildTokens.ts` emits a snippet
 * per scheme without keeping its own copy of the list.
 */
export const SCHEMES: Scheme[] = ["light", "dark"]

const DENSITIES: Density[] = [
  "comfortable",
  "compact",
  "kiosk",
]

/**
 * The density a consumer gets without asking, and it has to be first
 * in `DENSITIES`.
 *
 * `:root` and `[data-density="compact"]` are the same specificity
 * (0,1,0), so which one wins is decided by **source order** — the
 * default block has to be emitted before the others or setting
 * `data-density="compact"` would do nothing.
 */
const DEFAULT_DENSITY: Density = "comfortable"

/**
 * The anti-flash rule, for the inline `<style>` in an entry HTML.
 *
 * Every app in the fleet needs one: between the browser painting
 * the document and `variables.css` parsing, no custom property
 * exists yet, so the canvas is the UA's white and a dark app opens
 * with a full-page flash. The only thing that can prevent it is a
 * literal in the HTML itself.
 *
 * **The `var()` is the entire reason this ships from here.** An
 * inline `<style>` is UNLAYERED, and unlayered author CSS beats
 * every `@layer` regardless of specificity — Tailwind v4 emits
 * utilities into `@layer utilities`, so a flat
 * `background-color: #131822` does not merely paint early, it
 * **outranks `bg-surface-base` on `<body>` forever**. The canvas
 * is then pinned to that hex and no `data-scheme` flip can reach
 * it: light mode renders light chrome on a dark page. Written as a
 * FALLBACK the literal applies only while `--color-surface-base`
 * is undefined — the one moment the rule was ever for — and the
 * token takes over as the stylesheet lands.
 *
 * That is not a hypothetical. rip-deck and gallery-downloader both
 * hand-copied the flat form and both shipped the bug, and mux-magic
 * carried it latent; the ADR
 * (`docs/decisions/2026-07-31-tokens-ships-the-first-paint-snippet.md`)
 * has the measurements. Hand-copying is what made three apps wrong
 * at once, so the snippet is generated from the same token the
 * scheme block reads and exported as a string a consumer's test can
 * assert its own HTML contains.
 *
 * `color-scheme` needs no `var()`: `variables.css`'s
 * `[data-scheme]` rule is unlayered too, so it wins on specificity
 * rather than losing to this. It is stated here for the first-paint
 * reason only — the scrollbar and native controls are painted
 * before any stylesheet lands.
 *
 * Returns the rule ALONE, one line, no comment and no trailing
 * newline, so `expect(indexHtml).toContain(buildFirstPaintRule(…))`
 * is a consumer's whole drift gate. `buildFirstPaintCss` wraps it
 * with the paste-me header for `dist/first-paint.css`.
 */
export const buildFirstPaintRule = (
  variant: Variant,
  scheme: Scheme,
) =>
  "html, body { background-color: var(--color-surface-base, " +
  `${variant.schemes[scheme].surface.base}); ` +
  `color-scheme: ${scheme}; }`

/**
 * `dist/first-paint.css` — both schemes' rules, with the header
 * that says what to do with them.
 *
 * **A copy-me file, not a linkable stylesheet**, and that is why
 * the header shouts. A `<link rel="stylesheet">` is a network
 * round-trip, and beating that round-trip is the entire job of the
 * rule — linking this would reintroduce the flash it exists to
 * prevent while looking like the tidier option. It is exported
 * through `package.json` anyway so a consumer's build can *read*
 * it, and because a file is what makes "where does this snippet
 * come from" answerable.
 *
 * Both schemes in one file rather than two files: a consumer pins
 * one scheme in its HTML and needs to see the other to know which
 * line it is taking, and the interesting half — the `var()` — is
 * identical in both.
 */
export const buildFirstPaintCss = (variant: Variant) =>
  [
    "/* Generated by packages/tokens/scripts/buildTokens.ts — do not edit. */",
    "/*",
    " * PASTE the line for your scheme into an inline <style> in your entry",
    " * HTML. Do NOT <link> this file: a stylesheet request is a round-trip,",
    " * and beating that round-trip is the whole job of the rule.",
    " *",
    " * The var() fallback is load-bearing. An inline <style> is UNLAYERED,",
    " * unlayered CSS beats every @layer, and Tailwind's utilities live in",
    " * @layer utilities — so a bare literal outranks bg-surface-base on",
    " * <body> and pins the canvas, and no [data-scheme] flip can repaint",
    " * it. As a fallback the literal applies only before the token exists.",
    " *",
    " * Gate it in your app:",
    ' *   import { buildFirstPaintRule, daylight } from "@charcuterie/tokens"',
    ' *   expect(indexHtml).toContain(buildFirstPaintRule(daylight, "dark"))',
    " */",
    ...SCHEMES.map(
      (scheme) =>
        `${buildFirstPaintRule(variant, scheme)}\n`,
    ),
  ].join("\n")

/**
 * The default `localStorage` key the first-paint script reads.
 *
 * It **must** equal `@charcuterie/logic/browser`'s
 * `DEFAULT_COLOR_SCHEME_STORAGE_KEY` — the runtime hook and this
 * pre-paint snippet share one key or they disagree by exactly one
 * flash. Duplicated as a literal rather than imported because
 * `@charcuterie/tokens` has no dependency on `@charcuterie/logic`
 * (and must not gain one); an app that overrides the key passes the
 * same value to both.
 */
export const DEFAULT_COLOR_SCHEME_STORAGE_KEY =
  "charcuterie-scheme"

/**
 * The inline `<head>` script that sets `data-scheme` **before first
 * paint** from the persisted or OS choice — the companion to
 * `buildFirstPaintRule` for an app that follows the OS rather than
 * pinning one scheme.
 *
 * `buildFirstPaintRule` alone is enough for an app hard-pinned to
 * one scheme: the attribute is a constant in the HTML and the
 * `var()` fallback carries the pre-token instant. The moment the
 * scheme is *dynamic* — persisted, or `system` — two things must
 * happen before the browser paints, and only inline script in
 * `<head>` runs that early:
 *
 *  1. `<html data-scheme>` must be set from the resolved choice, so
 *     `variables.css` selects the right block; and
 *  2. the fallback hex must branch on the resolved scheme, not sit
 *     pinned to one — otherwise a dark-default fallback flashes on a
 *     light-resolved load.
 *
 * The script reproduces `createColorScheme`'s resolution rule
 * (`stored==="dark" || (system && matchMedia matches)`) against the
 * **same** `storageKey` the runtime `localStoragePersistence` uses,
 * so the pre-paint attribute and the hydrated state always agree.
 * Both surface hexes come from the token source, so
 * `distFreshness.test.ts` fails if either drifts — the same
 * provenance guarantee `buildFirstPaintRule` has.
 *
 * Paste it — do not `<link>` or bundle it. It has to be in the
 * document before any request completes, which is the one thing a
 * bundled module cannot promise.
 */
export const buildFirstPaintScript = (
  variant: Variant,
  {
    storageKey = DEFAULT_COLOR_SCHEME_STORAGE_KEY,
  }: { storageKey?: string } = {},
) => {
  const lightBackground = variant.schemes.light.surface.base

  const darkBackground = variant.schemes.dark.surface.base

  return [
    "<script>",
    "  (function () {",
    `    var KEY = ${JSON.stringify(storageKey)};`,
    "    var stored;",
    "    try {",
    "      stored = window.localStorage.getItem(KEY);",
    "    } catch (error) {",
    "      stored = null;",
    "    }",
    '    var isDark = stored === "dark" ||',
    '      ((stored === null || stored === "system") &&',
    '        window.matchMedia("(prefers-color-scheme: dark)").matches);',
    '    var scheme = isDark ? "dark" : "light";',
    '    document.documentElement.setAttribute("data-scheme", scheme);',
    `    var background = isDark ? ${JSON.stringify(darkBackground)} : ${JSON.stringify(lightBackground)};`,
    '    var style = document.createElement("style");',
    "    style.textContent =",
    '      "html,body{background-color:var(--color-surface-base," +',
    "      background +",
    '      ");color-scheme:" + scheme + "}";',
    "    document.head.appendChild(style);",
    "  })();",
    "</script>",
  ].join("\n")
}

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
    // The CSS `color-scheme` PROPERTY, which is a different thing
    // from our `data-scheme` attribute and is what the *browser*
    // reads. Without it a dark page keeps light scrollbars, light
    // native form controls, and a light default canvas — visible
    // the moment any surface is scrollable, and invisible to a
    // contrast gate because none of it is our colour.
    //
    // Variant-independent on purpose: `daylight` and `legible` do
    // not disagree about what "dark" means to a scrollbar. Emitted
    // once, before the variant blocks, so a variant could still
    // override it if one ever needed to.
    //
    // rip-deck hand-wrote `:root { color-scheme: dark }` and so did
    // every other app in the fleet — which is also why none of them
    // could switch scheme at runtime without a second edit.
    "",
    ...SCHEMES.flatMap((scheme) => [
      `[data-scheme="${scheme}"] {`,
      `  color-scheme: ${scheme};`,
      "}",
      "",
    ]).slice(0, -1),
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
      /**
       * `:root` on the default variant's default density, and it is
       * load-bearing rather than tidy.
       *
       * Every `--control-height-*`, `--control-gap-*`,
       * `--control-padding-inline-*` and `--font-size-*` lives in one
       * of these blocks and **nowhere else**. Without a bare `:root`
       * here, an app that sets `data-scheme` and omits `data-density`
       * — which nothing in the types, the build, or the console asks
       * it for — resolves `h-(--control-height-md)` and `text-2xl` to
       * *nothing*: every control collapses to zero height and the
       * whole type ramp disappears, on a green build.
       *
       * `data-variant` has had this fallback since M0 (`:root,
       * [data-variant="daylight"]` above); density not having one was
       * an asymmetry rather than a decision. Found by
       * `portly-controllers`, which rendered a segmented control with
       * no segments and no error to explain it.
       */
      const densitySelector =
        variant.name === defaultVariant
          ? [
              ...(density === DEFAULT_DENSITY
                ? [":root"]
                : []),
              `[data-density="${density}"]`,
              `[data-variant="${variant.name}"][data-density="${density}"]`,
            ].join(", ")
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
  /**
   * The one entry that is *not* a redefinition.
   *
   * Every other bridge above takes a name Tailwind already ships
   * and repoints it at ours, changing what an existing utility
   * means. `--font-display` is a name Tailwind has never heard of,
   * so publishing it **adds** `font-display` rather than
   * redefining anything — the self-mapping is the honest way to
   * say "same name, both sides".
   *
   * It is listed here anyway because this map is also the
   * gate: `tailwindCollisions.test.ts` fails on anything
   * `theme.css` publishes that is not declared, in either
   * direction. Adding a utility to every consumer is exactly as
   * much of a decision as changing one, and the test is right not
   * to distinguish.
   *
   * Note the sibling names are safe. Tailwind resolves
   * `--font-weight-*` before `--font-*` — see `TAILWIND_NAMESPACES`
   * in the test — so this neither shadows `font-sans` nor collides
   * with `font-bold`.
   */
  "--font-display": "--font-display",
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
  /**
   * `font-display`, the utility.
   *
   * `--font-sans` and `--font-mono` need no entry here: Tailwind
   * ships both names in its own default theme, so `font-sans`
   * already reads `var(--font-sans)` and our `[data-variant]` block
   * shadows the value. The utility exists; we only change what it
   * resolves to.
   *
   * `--font-display` is a name Tailwind has never heard of, so
   * without this line the variable would exist and the utility
   * would not — `class="font-display"` would silently generate
   * nothing, which is precisely the failure mode `distFreshness`
   * was written about. Publishing it is what makes the new token
   * reachable the same way every other one is.
   */
  "  --font-display: var(--font-display);",
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
      // `bg-scrim`, for `Modal`'s `::backdrop` and nothing else.
      "scrim",
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
