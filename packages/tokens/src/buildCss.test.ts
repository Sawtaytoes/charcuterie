/**
 * The generated CSS is the contract every consumer actually
 * touches — mux-magic's four-line swap at M1 is nothing but an
 * `@import` of `theme.css`. So the substrate gets asserted here
 * rather than eyeballed in a diff.
 */

import { expect, test } from "vitest"

import {
  buildColourProperties,
  buildDensityProperties,
  buildFirstPaintRule,
  buildThemeCss,
  buildVariablesCss,
} from "./buildCss.ts"
import { INTENT_NAMES } from "./contrastAudit.ts"
import {
  variants,
  variantsByName,
} from "./variants/index.ts"

const daylight = variantsByName.get("daylight")

if (!daylight) {
  throw new Error("daylight variant missing")
}

const variablesCss = buildVariablesCss(variants, "daylight")

const themeCss = buildThemeCss()

// ---------------------------------------------------------------
// The default variant costs nothing to select
// ---------------------------------------------------------------

test("the default variant also answers to bare :root", () => {
  // This is what makes "make daylight the default" a one-line
  // change: an app that sets no `data-variant` at all still gets
  // the winner's values.
  expect(variablesCss).toContain(
    ':root, [data-variant="daylight"] {',
  )

  expect(variablesCss).toContain(
    '[data-scheme="dark"], [data-variant="daylight"][data-scheme="dark"] {',
  )

  expect(variablesCss).toContain(
    '[data-density="compact"], [data-variant="daylight"][data-density="compact"] {',
  )
})

test("losing variants stay available but never unqualified", () => {
  for (const name of ["hairline", "layered", "legible"]) {
    expect(variablesCss).toContain(
      `[data-variant="${name}"] {`,
    )

    expect(variablesCss).not.toContain(
      `:root, [data-variant="${name}"] {`,
    )
  }
})

test("the winner's dark surface is emitted verbatim", () => {
  expect(variablesCss).toContain(
    `--color-surface-base: ${
      daylight.schemes.dark.surface.base
    };`,
  )
})

// ---------------------------------------------------------------
// The first-paint snippet
// ---------------------------------------------------------------

test("the anti-flash literal is a var() FALLBACK, never bare", () => {
  // The whole reason this snippet ships from here. An inline
  // `<style>` is unlayered, unlayered CSS beats every `@layer`, and
  // Tailwind's utilities live in `@layer utilities` — so a bare
  // literal outranks `bg-surface-base` on `<body>` and pins the
  // canvas for good. Three apps hand-copied the bare form and three
  // apps got the bug; this assertion is the one that could not be
  // written in any of them.
  const darkRule = buildFirstPaintRule(daylight, "dark")

  expect(darkRule).toContain(
    `var(--color-surface-base, ${
      daylight.schemes.dark.surface.base
    })`,
  )

  // Belt and braces: EVERY background declaration in the rule
  // reads a custom property, not just the one above. A future edit
  // that "simplifies" the fallback away — or adds a second
  // declaration beside it — fails here rather than in a screenshot
  // somebody happens to take in light mode.
  const backgrounds =
    darkRule.match(/background(?:-color)?\s*:[^;}]+/g) ?? []

  expect(backgrounds).not.toHaveLength(0)

  for (const declaration of backgrounds) {
    expect(declaration).toContain("var(--color-")
  }
})

test("the snippet paints the scheme it is asked for", () => {
  for (const scheme of ["light", "dark"] as const) {
    const rule = buildFirstPaintRule(daylight, scheme)

    // `color-scheme` is the CSS property the browser reads for
    // scrollbars and native controls, and it needs no `var()`:
    // `variables.css`'s `[data-scheme]` rule is unlayered too, so
    // it wins on specificity instead of losing to this one.
    expect(rule).toContain(`color-scheme: ${scheme};`)

    expect(rule).toContain(
      daylight.schemes[scheme].surface.base,
    )

    // The other scheme's base must not be in there — the failure
    // this catches is a copy that pins dark's hex on a light app.
    expect(rule).not.toContain(
      daylight.schemes[scheme === "dark" ? "light" : "dark"]
        .surface.base,
    )
  }
})

test("the snippet is one bare rule a consumer can assert on", () => {
  // Consumers gate drift with
  // `expect(indexHtml).toContain(buildFirstPaintRule(daylight, "dark"))`,
  // which only works if this returns the rule and nothing else — no
  // comment, no leading indent, no trailing newline. The paste-me
  // header lives in `scripts/buildTokens.ts`, on the artifact.
  const rule = buildFirstPaintRule(daylight, "dark")

  expect(rule).toBe(rule.trim())

  expect(rule).not.toContain("\n")

  expect(rule).not.toContain("/*")
})

// ---------------------------------------------------------------
// The three axes compose
// ---------------------------------------------------------------

test("scheme and density are emitted separately from variant", () => {
  // One `:root` of structural values, then the two `color-scheme`
  // blocks — variant-independent, because `daylight` and `legible`
  // do not disagree about what "dark" means to a scrollbar — then
  // per variant: one variant block, two schemes, three densities.
  // Emitting the axes as separate rule sets is what keeps this
  // linear instead of a 24-way combinatorial explosion.
  //
  // `@media` is excluded rather than folded into the number — it
  // is the reduced-motion block, which is its own thing and has
  // its own test.
  const selectorCount = (
    variablesCss.match(/^(?!@)\S.*\{$/gm) ?? []
  ).length

  expect(selectorCount).toBe(
    1 + 2 + variants.length * (1 + 2 + 3),
  )
})

// ---------------------------------------------------------------
// Naming — the locked decision
// ---------------------------------------------------------------

test("CSS custom properties use the --color- namespace", () => {
  // Locked, and must not be "fixed" to match the `colour`
  // spelling used in TypeScript identifiers: Tailwind v4's
  // `@theme` only generates `bg-*` / `text-*` / `border-*`
  // utilities from `--color-`. Renaming produces a stylesheet
  // with no utilities and no error.
  expect(themeCss).not.toContain("--colour-")
  expect(variablesCss).not.toContain("--colour-")
  expect(themeCss).toContain("--color-surface-base")
})

test("camelCase roles are kebab-cased on the way into CSS", () => {
  const declarations = buildColourProperties(
    daylight.schemes.dark,
  ).join("\n")

  expect(declarations).toContain(
    "--color-content-on-accent:",
  )

  expect(declarations).toContain(
    "--color-intent-accent-surface-hover:",
  )

  expect(declarations).toContain(
    "--color-intent-accent-on-solid:",
  )
})

test("every intent and role reaches the Tailwind theme", () => {
  for (const intent of INTENT_NAMES) {
    for (const role of [
      "surface",
      "surface-hover",
      "border",
      "content",
      "solid",
      "solid-hover",
      "on-solid",
    ]) {
      expect(themeCss).toContain(
        `--color-intent-${intent}-${role}:`,
      )
    }
  }
})

// ---------------------------------------------------------------
// Tailwind's `dark:` points at the attribute, not the OS
// ---------------------------------------------------------------

test("the dark variant keys off data-scheme, not a media query", () => {
  // The scheme here is a deliberate choice — the kiosk Pis stay
  // pinned to dark regardless of what the OS thinks — so `dark:`
  // must not fall back to `prefers-color-scheme`.
  expect(themeCss).toContain("@custom-variant dark")
  expect(themeCss).toContain('[data-scheme="dark"]')
  expect(themeCss).not.toContain("prefers-color-scheme")
})

test("theme.css pulls in the runtime substrate", () => {
  expect(themeCss).toContain('@import "./variables.css";')
})

test("a scheme also sets the CSS color-scheme property", () => {
  // The attribute is ours; `color-scheme` is what the *browser*
  // reads for scrollbars, native form controls, and the default
  // canvas. A dark page without it keeps light scrollbars — which
  // no contrast gate can see, because none of it is our colour.
  //
  // M5 found this: rip-deck hand-wrote `:root { color-scheme: dark }`
  // and swapping the palette out would have dropped it silently.
  expect(variablesCss).toContain(
    '[data-scheme="light"] {\n  color-scheme: light;\n}',
  )

  expect(variablesCss).toContain(
    '[data-scheme="dark"] {\n  color-scheme: dark;\n}',
  )
})

// ---------------------------------------------------------------
// Reduced motion
// ---------------------------------------------------------------

test("every duration collapses under prefers-reduced-motion", () => {
  const reducedMotionBlock = variablesCss.slice(
    variablesCss.indexOf(
      "@media (prefers-reduced-motion: reduce)",
    ),
  )

  // Including the two loop durations. Zeroing a transition is
  // enough; a looping animation at `0ms` still holds its first
  // keyframe, which for a sweep is an off-screen bar — so the
  // token has to be reachable for a component to switch the
  // animation off outright.
  for (const duration of [
    "instant",
    "fast",
    "normal",
    "slow",
    "loop-fast",
    "loop-slow",
  ]) {
    expect(reducedMotionBlock).toContain(
      `--duration-${duration}: 0ms;`,
    )
  }
})

// ---------------------------------------------------------------
// Density
// ---------------------------------------------------------------

test("density emits control sizing and a scaled type ramp", () => {
  const kiosk = buildDensityProperties(
    daylight,
    "kiosk",
  ).join("\n")

  const compact = buildDensityProperties(
    daylight,
    "compact",
  ).join("\n")

  expect(kiosk).toContain("--control-min-touch-target:")

  expect(kiosk).toContain("--font-size-md:")

  // The fix for a roomy variant on a dense list is
  // `data-density="compact"`, not a retheme — so the two had
  // better actually differ.
  expect(kiosk).not.toBe(compact)
})
