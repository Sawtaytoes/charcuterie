/**
 * Contrast is a test, not a guideline.
 *
 * `scripts/checkContrast.ts` printed this at M0 and exited
 * non-zero. That was the right shape for a bake-off — a human was
 * reading the numbers — but a script only gates what somebody
 * remembers to run. Wrapping the *same* audit in Vitest is the
 * only thing M1 changes about it: one source of truth, asked by
 * the preview board, the script, and CI alike.
 */

import { describe, expect, test } from "vitest"

import {
  getApcaLc,
  getContrast,
  getContrastRatio,
} from "./contrast.ts"
import {
  auditScheme,
  CONTENT_BEARING_INTENT_NAMES,
  CONTENT_BEARING_SURFACE_ROLES,
  getAliasDrift,
  getFailures,
  INTENT_NAMES,
  RESTING_ROLE_BY_INTENT_ROLE,
  SURFACE_CONTENT_ROLES,
  TINT_BACKGROUND_INTENT_ROLES,
} from "./contrastAudit.ts"
import type { Scheme } from "./types.ts"
import { variants } from "./variants/index.ts"

const SCHEMES: Scheme[] = ["light", "dark"]

// ---------------------------------------------------------------
// The gate
// ---------------------------------------------------------------

describe.each(variants)("$name", (variant) => {
  test.each(SCHEMES)(
    "%s clears WCAG 2.2 AA on every gated pair",
    (scheme) => {
      const failures = getFailures(
        auditScheme(variant.schemes[scheme]),
      )

      // Named rather than counted, so a failure message says
      // which pair and by how much instead of "expected 0, got 3".
      expect(
        failures.map(
          (failure) =>
            `${failure.label}: ${failure.result.ratio.toFixed(
              2,
            )}:1 needs ${failure.threshold}:1`,
        ),
      ).toEqual([])
    },
  )

  test.each(SCHEMES)("%s has no alias drift", (scheme) => {
    expect(getAliasDrift(variant.schemes[scheme])).toEqual(
      [],
    )
  })

  test.each(SCHEMES)(
    "%s audits a non-trivial number of pairs",
    (scheme) => {
      // Guards the failure mode a green gate cannot distinguish
      // itself from: an audit that silently stopped enumerating.
      // Zero failures out of zero checks looks identical to a
      // pass in every report.
      expect(
        auditScheme(variant.schemes[scheme]).length,
      ).toBeGreaterThanOrEqual(60)
    },
  )

  test.each(SCHEMES)(
    "%s measures every content role on every surface it is drawn on",
    (scheme) => {
      // The mirror of the interactive-state test below, for the
      // *foreground* half. The surfaces block used to hand-list
      // three surface roles and three content roles, so
      // `surface.sunken` went unaudited for the library's whole
      // life — and `content.muted` failed AA on it, at rest, in
      // `hairline`/light. Deriving the list from the role unions
      // is what makes that impossible to repeat.
      const labels = auditScheme(
        variant.schemes[scheme],
      ).map((entry) => entry.label)

      const unaudited =
        CONTENT_BEARING_SURFACE_ROLES.flatMap(
          (surfaceRole) =>
            SURFACE_CONTENT_ROLES.map(
              (contentRole) =>
                `content.${contentRole} on surface.${surfaceRole}`,
            ).filter((pair) => !labels.includes(pair)),
        )

      expect(unaudited).toEqual([])
    },
  )

  test.each(SCHEMES)(
    "%s measures plain content on the tints that carry it",
    (scheme) => {
      // The highlighted option row in `Listbox`/`Combobox`/`Menu`
      // is `content.*` on an intent tint, not on a `surface.*`.
      // That whole class was invisible to this gate until
      // `INTENT_TINT_CARRIES_PLAIN_CONTENT` named it, which is how
      // `content.muted` on `intent.neutral.surfaceHover` shipped at
      // 4.11:1 in the fleet's default variant.
      const labels = auditScheme(
        variant.schemes[scheme],
      ).map((entry) => entry.label)

      const unaudited =
        CONTENT_BEARING_INTENT_NAMES.flatMap((intent) =>
          TINT_BACKGROUND_INTENT_ROLES.flatMap((tintRole) =>
            SURFACE_CONTENT_ROLES.map(
              (contentRole) =>
                `content.${contentRole} on intent.${intent}.${tintRole}`,
            ).filter((pair) => !labels.includes(pair)),
          ),
        )

      expect(unaudited).toEqual([])
    },
  )

  test.each(SCHEMES)(
    "%s audits every interactive state, not just the resting one",
    (scheme) => {
      // The count above cannot catch this: an audit can grow while
      // a whole *class* of pair stays invisible, which is exactly
      // how `solidHover` went unmeasured until an axe run in a
      // consumer found it at 4.47:1.
      const labels = auditScheme(
        variant.schemes[scheme],
      ).map((entry) => entry.label)

      const unaudited = INTENT_NAMES.flatMap((intent) =>
        Object.entries(RESTING_ROLE_BY_INTENT_ROLE)
          .filter(([, restingRole]) => restingRole !== null)
          .map(
            ([stateRole]) =>
              `intent.${intent}.${stateRole}`,
          )
          .filter(
            (background) =>
              !labels.some((label) =>
                label.endsWith(` on ${background}`),
              ),
          ),
      )

      expect(unaudited).toEqual([])
    },
  )
})

// ---------------------------------------------------------------
// WCAG 2.2 — the algorithm
// ---------------------------------------------------------------

test("black on white is the 21:1 maximum", () => {
  expect(
    getContrastRatio("#000000", "#FFFFFF"),
  ).toBeCloseTo(21, 5)
})

test("a colour against itself is 1:1", () => {
  expect(
    getContrastRatio("#131822", "#131822"),
  ).toBeCloseTo(1, 5)
})

test("the ratio is symmetric", () => {
  expect(
    getContrastRatio("#EDF0F5", "#131822"),
  ).toBeCloseTo(getContrastRatio("#131822", "#EDF0F5"), 10)
})

test("three-digit hex expands", () => {
  expect(getContrastRatio("#000", "#FFF")).toBeCloseTo(
    21,
    5,
  )
})

test("AA thresholds are reported at the right boundaries", () => {
  const result = getContrast("#767676", "#FFFFFF")

  // #767676 on white is the canonical 4.54:1 AA boundary colour.
  expect(result.ratio).toBeGreaterThanOrEqual(4.5)
  expect(result.isAaNormal).toBe(true)
  expect(result.isAaLarge).toBe(true)
  expect(result.isAaaNormal).toBe(false)
})

test("translucent and non-hex colours are rejected", () => {
  // Tokens are opaque hex on purpose: a token expressed as
  // `rgba(…, 0.5)` has no single contrast value, so the gate
  // would be measuring something the user never sees.
  expect(() =>
    getContrastRatio("rgba(0,0,0,0.5)", "#FFFFFF"),
  ).toThrow(/6-digit hex/)

  expect(() =>
    getContrastRatio("#12345", "#FFFFFF"),
  ).toThrow(/6-digit hex/)
})

// ---------------------------------------------------------------
// APCA — reported, never gated
// ---------------------------------------------------------------

test("APCA sign distinguishes light-on-dark from dark-on-light", () => {
  // Negative is light text on a dark background. The sign is the
  // whole reason APCA is worth reporting next to a ratio that
  // cannot tell the two apart.
  expect(getApcaLc("#FFFFFF", "#000000")).toBeLessThan(0)

  expect(getApcaLc("#000000", "#FFFFFF")).toBeGreaterThan(0)
})

test("APCA returns zero for identical colours", () => {
  expect(getApcaLc("#131822", "#131822")).toBe(0)
})

test("APCA magnitude tracks readability on the winning variant", () => {
  const daylight = variants.find(
    (variant) => variant.name === "daylight",
  )

  if (!daylight) {
    throw new Error("daylight variant missing")
  }

  const { content, surface } = daylight.schemes.dark

  // Lc 60 is roughly the "body text is comfortable" line. Primary
  // content on the base surface should clear it with room to
  // spare; this is the pair every app reads the most.
  expect(
    Math.abs(getApcaLc(content.primary, surface.base)),
  ).toBeGreaterThan(60)
})
