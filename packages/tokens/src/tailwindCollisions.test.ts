/**
 * Which of our custom-property names land in a namespace Tailwind
 * v4 already owns.
 *
 * This is not hypothetical. Tailwind's own utilities read its
 * theme variables — `tracking-tight` resolves
 * `var(--tracking-tight)`, `rounded-lg` resolves
 * `var(--radius-lg)`, `max-w-md` resolves `var(--container-md)`.
 * Declaring the same name at `:root` silently **re-themes those
 * utilities**, with no import, no `@theme` block, and no error.
 *
 * The M1 swap measured it in a real app: mux-magic's dark UI came
 * out 99.91% pixel-identical, and every one of the 1,144 changed
 * pixels was the `Sequence Builder` heading — which carries
 * `tracking-tight`, and moved because `daylight` sets
 * `-0.01em` where Tailwind's default is `-0.025em`.
 *
 * Some of those overrides are the point. `--radius-*`,
 * `--tracking-*`, and the font families carry a variant's visual
 * character; a variant that cannot reach `rounded-lg` is not
 * really a visual direction. Others are hazards. So the set is
 * pinned here rather than discovered later by a consumer whose
 * layout moved.
 *
 * M1 found exactly one hazard — our container-query scale sitting
 * on Tailwind's `--container-*`, which owns `max-w-*` at different
 * sizes. It is now emitted as `--cq-*`; see
 * `docs/decisions/2026-07-29-container-query-scale-is-cq-not-container.md`.
 */

import { expect, test } from "vitest"

import {
  buildThemeCss,
  buildVariablesCss,
  THEME_BRIDGES,
} from "./buildCss.ts"
import { variants } from "./variants/index.ts"

/**
 * Namespaces Tailwind v4 defines in its own default theme, read
 * from `tailwindcss@4.3.0`'s `theme.css`. Prefix match, longest
 * first — `--font-weight-bold` is `--font-weight-*`, not
 * `--font-*`.
 */
const TAILWIND_NAMESPACES = [
  "--font-weight-",
  "--color-",
  "--container-",
  "--tracking-",
  "--leading-",
  "--breakpoint-",
  "--radius-",
  "--shadow-",
  "--ease-",
  "--animate-",
  "--text-",
  "--font-",
  "--spacing",
]

/**
 * Every collision. All of them are now deliberate — each one
 * carries a variant's visual character into Tailwind's own
 * utilities, which is what makes a variant a visual direction
 * rather than a palette.
 *
 * `--color-*` is not listed: that one is not a collision but the
 * entire mechanism — `theme.css` publishes it through `@theme`
 * on purpose.
 */
const KNOWN_COLLISIONS = {
  "--font-": "intended",
  "--font-weight-": "intended",
  "--radius-": "intended",
  "--tracking-": "intended",
} as const

const getEmittedNamespaces = () => {
  const css = buildVariablesCss(variants, "daylight")

  const declarations =
    css.match(/^\s+(--[a-z0-9-]+):/gim) ?? []

  const names = new Set(
    declarations.map((line) =>
      line.trim().replace(/:$/, ""),
    ),
  )

  const namespaces = new Set<string>()

  for (const name of names) {
    const namespace = TAILWIND_NAMESPACES.find(
      (candidate) => name.startsWith(candidate),
    )

    if (namespace && namespace !== "--color-") {
      namespaces.add(namespace)
    }
  }

  return namespaces
}

test("the set of Tailwind namespaces we override is exactly the known one", () => {
  // A new collision appearing here is not necessarily wrong — but
  // it silently changes an existing utility in every consumer, so
  // it has to be a decision rather than a side effect.
  expect([...getEmittedNamespaces()].sort()).toEqual(
    Object.keys(KNOWN_COLLISIONS).sort(),
  )
})

test("the container-query scale stays off Tailwind's --container-*", () => {
  // The one hazard M1 found, now fixed rather than flagged. Ours
  // is a five-step container-query scale; Tailwind's is a
  // thirteen-step `max-w-*` scale using the same step names at
  // different sizes — our `md` is 32rem against Tailwind's 28rem
  // — so a consumer writing `max-w-md` silently got `max-w-lg`.
  //
  // Unlike radius and tracking, nothing about a *visual
  // direction* argues for changing what `max-w-md` means, so the
  // scale moved instead of Tailwind's meaning.
  const css = buildVariablesCss(variants, "daylight")

  expect(css).toContain("--cq-md:")
  expect(css).not.toContain("--container-")
})

test("spacing, type size, and line height do not collide at the variables layer", () => {
  // Near misses worth stating, because all three look like they
  // should: Tailwind uses `--spacing` (singular) where we use
  // `--space-*`, `--text-*` where we use `--font-size-*`, and
  // `--leading-*` where we use `--line-height-*`.
  //
  // Our names stay ours in `variables.css`, which is what keeps a
  // plain-CSS or Satori consumer reading `--font-size-md` rather
  // than a Tailwind spelling. M3 then bridges them into Tailwind's
  // namespaces **once, in `theme.css`** — see the next test.
  const css = buildVariablesCss(variants, "daylight")

  expect(css).toContain("--space-4:")
  expect(css).not.toContain("--spacing:")

  expect(css).toContain("--font-size-md:")
  expect(css).not.toContain("--text-md:")

  expect(css).toContain("--line-height-normal:")
  expect(css).not.toContain("--leading-normal:")
})

// ---------------------------------------------------------------
// The bridge — M3's addition, and the one that changes what an
// existing utility means
// ---------------------------------------------------------------

test("theme.css bridges every structural namespace a component needs", () => {
  // Without this, a component writing `text-sm` gets Tailwind's
  // 0.875rem instead of the variant's density-aware ramp — and
  // silently, because the utility exists either way. M3's
  // `tailwindCandidates.test.ts` in `@charcuterie/ui` catches the
  // *missing* utility; only this catches the wrong one.
  const themeCss = buildThemeCss()

  expect(themeCss).toContain(
    "--text-md: var(--font-size-md);",
  )

  expect(themeCss).toContain(
    "--leading-normal: var(--line-height-normal);",
  )

  expect(themeCss).toContain(
    "--shadow-low: var(--elevation-low);",
  )

  expect(themeCss).toContain(
    "--ease-standard: var(--easing-standard);",
  )

  // Tailwind's spacing is a single multiplier, so this is the
  // scale's step rather than a scale entry.
  expect(themeCss).toContain("--spacing: 0.25rem;")
})

test("the bridge is exactly the declared set", () => {
  // Same contract as `KNOWN_COLLISIONS` above, one layer up: every
  // entry here redefines a Tailwind utility in every consumer, so
  // adding one is a decision and it has to be written down. A
  // namespace appearing in `theme.css` that is not in
  // `THEME_BRIDGES` fails here.
  const themeCss = buildThemeCss()

  const published = new Set(
    (themeCss.match(/^\s+(--[a-z0-9-]+):/gim) ?? []).map(
      (line) => line.trim().replace(/:$/, ""),
    ),
  )

  const bridgeNames = Object.keys(THEME_BRIDGES)

  for (const name of published) {
    if (name.startsWith("--color-")) {
      continue
    }

    const bridge = bridgeNames.find(
      (candidate) =>
        name === candidate || name.startsWith(candidate),
    )

    expect(
      bridge,
      `theme.css publishes ${name}, which is not a declared bridge`,
    ).toBeDefined()
  }

  // And the reverse: a declared bridge that emits nothing is a
  // typo that would leave components unstyled.
  for (const name of bridgeNames) {
    expect(
      [...published].some(
        (candidate) =>
          candidate === name || candidate.startsWith(name),
      ),
      `declared bridge ${name} emits nothing`,
    ).toBe(true)
  }
})
