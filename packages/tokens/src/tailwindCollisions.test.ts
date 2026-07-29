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

import { buildVariablesCss } from "./buildCss.ts"
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

test("spacing, type size, and line height do not collide", () => {
  // Near misses worth stating, because all three look like they
  // should: Tailwind uses `--spacing` (singular) where we use
  // `--space-*`, `--text-*` where we use `--font-size-*`, and
  // `--leading-*` where we use `--line-height-*`.
  const css = buildVariablesCss(variants, "daylight")

  expect(css).toContain("--space-4:")
  expect(css).not.toContain("--spacing:")

  expect(css).toContain("--font-size-md:")
  expect(css).not.toContain("--text-md:")

  expect(css).toContain("--line-height-normal:")
  expect(css).not.toContain("--leading-normal:")
})
