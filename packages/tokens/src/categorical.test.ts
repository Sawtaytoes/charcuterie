/**
 * The properties the categorical family lives or dies on, and only
 * one of them is contrast.
 *
 * `contrast.test.ts` already gates every categorical pair against
 * its background — that block is enumerated in `contrastAudit.ts`
 * alongside the intents, so CI and the preview board ask the same
 * question. What is left is everything a contrast gate cannot see:
 * that ten indexes are ten *different* colours, that the ring is at
 * least as separable as the palettes it is competing with, and that
 * the generator is a generator rather than a table somebody typed.
 */

import { describe, expect, test } from "vitest"

import {
  buildCategoricalScheme,
  CATEGORICAL_ADJACENT_PAIRS,
  CATEGORICAL_DISTINCTNESS_FLOOR,
  CATEGORICAL_HUES,
  CATEGORICAL_INDEX_COUNT,
  CATEGORICAL_INDEXES,
  CATEGORICAL_PAIRS,
  CATEGORICAL_SEQUENCE,
  getCategoricalDistinctnessFailures,
  TABLEAU_10_MINIMUM_DISTANCE,
} from "./categorical.ts"
import { getColourDistance } from "./colourSpace.ts"
import { getContrastRatio } from "./contrast.ts"
import type { Scheme } from "./types.ts"
import { variants } from "./variants/index.ts"

const SCHEMES: Scheme[] = ["light", "dark"]

test("the ring is ten hues, numbered from one", () => {
  expect([...CATEGORICAL_INDEXES]).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  ])

  expect(CATEGORICAL_INDEX_COUNT).toBe(10)
})

test("every index has a hue and a name a screen reader can read", () => {
  // `Swatch` settled that a colour is not a name — a
  // `background-color` says nothing to a screen reader and
  // `getByRole("img", { name })` has nothing to match. A picker
  // offering ten dots owes each of them a word.
  for (const index of CATEGORICAL_INDEXES) {
    expect(CATEGORICAL_HUES[index].label).toMatch(/^[A-Z]/)

    expect(
      CATEGORICAL_HUES[index].hue,
    ).toBeGreaterThanOrEqual(0)

    expect(CATEGORICAL_HUES[index].hue).toBeLessThan(360)
  }

  expect(
    new Set(
      CATEGORICAL_INDEXES.map(
        (index) => CATEGORICAL_HUES[index].label,
      ),
    ).size,
  ).toBe(CATEGORICAL_INDEX_COUNT)
})

test("the hues go round the wheel once, in order", () => {
  // Order is what makes a swatch row read as a spectrum rather
  // than as a bag, and it is also what makes "adjacent" mean
  // "closest" — which the distinctness gate below relies on.
  const hues = CATEGORICAL_INDEXES.map(
    (index) => CATEGORICAL_HUES[index].hue,
  )

  expect(hues).toEqual(
    [...hues].sort((first, second) => first - second),
  )
})

test("adjacent pairs include the wrap from ten back to one", () => {
  // The ring is a wheel. Nothing in a swatch row puts 10 beside 1,
  // which is exactly why a drifting generator would close that gap
  // unnoticed.
  expect(CATEGORICAL_ADJACENT_PAIRS).toHaveLength(
    CATEGORICAL_INDEX_COUNT,
  )

  expect(CATEGORICAL_ADJACENT_PAIRS.at(-1)).toEqual([10, 1])
})

test("every unordered pair is checked, not only the adjacent ones", () => {
  expect(CATEGORICAL_PAIRS).toHaveLength(45)
})

describe.each(variants)("$name", (variant) => {
  test.each(SCHEMES)(
    "%s tells every adjacent pair apart",
    (scheme) => {
      // The headline property, stated on the pairs a user sees side
      // by side in a picker. `variants.test.ts` runs the same gate
      // over all 45 pairs; this one names the case that matters and
      // fails with the two indexes in the message.
      const { categorical } = variant.schemes[scheme]

      const tooClose = CATEGORICAL_ADJACENT_PAIRS.flatMap(
        ([first, second]) =>
          (
            Object.keys(
              CATEGORICAL_DISTINCTNESS_FLOOR,
            ) as (keyof typeof CATEGORICAL_DISTINCTNESS_FLOOR)[]
          ).flatMap((role) => {
            const floor =
              CATEGORICAL_DISTINCTNESS_FLOOR[role]

            if (floor === null) {
              return []
            }

            const distance = getColourDistance(
              categorical[first][role],
              categorical[second][role],
            )

            return distance >= floor
              ? []
              : [
                  `${role} ${first}/${second}: ΔEok ${distance.toFixed(
                    4,
                  )} needs ${floor}`,
                ]
          }),
      )

      expect(tooClose).toEqual([])
    },
  )

  test.each(SCHEMES)(
    "%s is at least as separable as Tableau 10",
    (scheme) => {
      // The floor in `categorical.ts` is ours; this is somebody
      // else's. Tableau 10 is the most-copied ten-colour
      // categorical palette there is and its own tightest pair
      // measures 0.0835, so clearing it is a claim that can be
      // checked from outside the repo rather than a number this
      // library graded itself against.
      const { categorical } = variant.schemes[scheme]

      const tightest = Math.min(
        ...CATEGORICAL_PAIRS.map(([first, second]) =>
          getColourDistance(
            categorical[first].solid,
            categorical[second].solid,
          ),
        ),
      )

      expect(tightest).toBeGreaterThanOrEqual(
        TABLEAU_10_MINIMUM_DISTANCE,
      )
    },
  )

  test.each(SCHEMES)(
    "%s puts a near-black label on every fill, not white",
    (scheme) => {
      // A stated rule rather than a per-hue judgement, and the
      // reason is the gate above: a fill dark enough to carry white
      // is a fill pushed down the gamut, and through the
      // green-to-cyan arc that is where the ring stops being
      // separable.
      const { categorical } = variant.schemes[scheme]

      for (const index of CATEGORICAL_INDEXES) {
        expect(
          getContrastRatio(
            categorical[index].onSolid,
            "#FFFFFF",
          ),
        ).toBeGreaterThan(10)
      }
    },
  )

  test.each(SCHEMES)(
    "%s brightens a fill on hover rather than deepening it",
    (scheme) => {
      // `daylight`'s dark accent had to deepen because its label is
      // white; this family's is near-black, so it moves the other
      // way. Same rule either way — a hover moves *away* from its
      // own label's lightness — which is why this is asserted
      // rather than left to whoever edits the geometry next.
      const { categorical } = variant.schemes[scheme]

      for (const index of CATEGORICAL_INDEXES) {
        expect(
          getContrastRatio(
            categorical[index].onSolid,
            categorical[index].solidHover,
          ),
        ).toBeGreaterThan(
          getContrastRatio(
            categorical[index].onSolid,
            categorical[index].solid,
          ),
        )
      }
    },
  )
})

test("a variant's tuning changes the ring rather than being ignored", () => {
  // The mutation check on `CategoricalTuning`. A knob a variant can
  // set and the generator quietly drops is worse than no knob: the
  // variant file reads as though `hairline` is quieter, and it is
  // not.
  const loud = buildCategoricalScheme({
    raisedSurface: "#FFFFFF",
    scheme: "light",
    tuning: { chromaScale: 1.2 },
  })

  const quiet = buildCategoricalScheme({
    raisedSurface: "#FFFFFF",
    scheme: "light",
    tuning: { chromaScale: 0.6 },
  })

  // Index 1 is red, which is nowhere near the gamut boundary at
  // this lightness — so the scale has somewhere to move it to. A
  // green would be a bad subject for this test precisely because
  // the gamut, not the knob, decides where it lands.
  expect(quiet[1].solid).not.toBe(loud[1].solid)

  expect(
    getColourDistance(quiet[1].solid, "#808080"),
  ).toBeLessThan(
    getColourDistance(loud[1].solid, "#808080"),
  )
})

test("a hue that cannot meet its target throws instead of settling", () => {
  // The rule this family is built on: fix the hue, do not lower the
  // gate. An impossible target has to fail loudly at module load,
  // because the alternative — a solver that gives up and returns
  // its last attempt — ships a palette that quietly does not meet
  // the standard the audit says it meets.
  expect(() =>
    buildCategoricalScheme({
      raisedSurface: "#808080",
      scheme: "light",
      tuning: { contentContrast: 21 },
    }),
  ).toThrow(/Fix the hue/)
})

test("the family is generated, not a table", () => {
  // Two variants with different `surface.raised` cannot produce the
  // same borders unless the generator is ignoring its input — which
  // is what a hardcoded table pretending to be a function looks
  // like from out here.
  const onWhite = buildCategoricalScheme({
    raisedSurface: "#FFFFFF",
    scheme: "light",
  })

  const onGrey = buildCategoricalScheme({
    raisedSurface: "#D9D9D9",
    scheme: "light",
  })

  expect(onWhite[5].border).not.toBe(onGrey[5].border)

  // …and the tint, which is not solved against anything, is
  // identical. Both halves matter: a generator that changed
  // everything would be a generator nobody could reason about.
  expect(onWhite[5].surface).toBe(onGrey[5].surface)
})

test("every emitted value is opaque six-digit hex", () => {
  const built = buildCategoricalScheme({
    raisedSurface: "#FFFFFF",
    scheme: "light",
  })

  for (const index of CATEGORICAL_INDEXES) {
    for (const value of Object.values(built[index])) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/)
    }
  }
})

test("the same inputs give the same palette, every time", () => {
  // It runs at module load in every consumer, including a Satori
  // render on a Pi and a server-side pass. A solver with any
  // ordering or floating-point instability would hand two of them
  // different colours for the same label.
  expect(
    buildCategoricalScheme({
      raisedSurface: "#FFFFFF",
      scheme: "dark",
      tuning: { chromaScale: 0.95 },
    }),
  ).toEqual(
    buildCategoricalScheme({
      raisedSurface: "#FFFFFF",
      scheme: "dark",
      tuning: { chromaScale: 0.95 },
    }),
  )
})

test("no failure is reported on a palette that is fine", () => {
  // The mutation check on the gate itself: a `getCategoricalDistinctnessFailures`
  // that returned everything, or nothing, would look identical in
  // the green tests above.
  expect(
    getCategoricalDistinctnessFailures(
      variants[0]?.schemes.dark.categorical,
    ),
  ).toEqual([])

  const collapsed = buildCategoricalScheme({
    raisedSurface: "#FFFFFF",
    scheme: "light",
  })

  // Two indexes made identical — the exact failure the gate exists
  // for, and the one every contrast number stays green through.
  expect(
    getCategoricalDistinctnessFailures({
      ...collapsed,
      2: collapsed[1],
    }).length,
  ).toBeGreaterThan(0)
})

/**
 * The walk order, which is a different question from the ring.
 *
 * The ring is hue-ordered so a swatch picker reads as a spectrum,
 * and that is exactly why a set must not be coloured by walking it
 * in order: ring-adjacent hues are the tightest pair the palette
 * has, so a two-tile set got the two hardest colours in the family
 * to tell apart. These three assertions are what stop the sequence
 * being "tidied" back into 1..10 by somebody who reads it as an
 * unsorted list.
 */
describe("CATEGORICAL_SEQUENCE", () => {
  test("visits every index exactly once", () => {
    expect(
      [...CATEGORICAL_SEQUENCE].sort(
        (first, second) => first - second,
      ),
    ).toEqual([...CATEGORICAL_INDEXES])
  })

  /**
   * Including the WRAP. A set of eleven tiles puts the tenth beside
   * the first, and a sequence that is only checked pairwise from
   * the front can be perfectly spread and still close up there.
   */
  test("holds every neighbour, and the wrap, far apart in hue", () => {
    const getGap = (
      first: (typeof CATEGORICAL_SEQUENCE)[number],
      second: (typeof CATEGORICAL_SEQUENCE)[number],
    ) => {
      const raw = Math.abs(
        CATEGORICAL_HUES[first].hue -
          CATEGORICAL_HUES[second].hue,
      )

      return Math.min(raw, 360 - raw)
    }

    const gaps = CATEGORICAL_SEQUENCE.map(
      (index, position) =>
        getGap(
          index,
          CATEGORICAL_SEQUENCE[
            (position + 1) % CATEGORICAL_INDEX_COUNT
          ] as (typeof CATEGORICAL_SEQUENCE)[number],
        ),
    )

    // Ten steps around a circle average 108 degrees, so 100 is the
    // floor with the slack the uneven ring actually needs — the
    // hue spacing is solved for separability, not drawn at 36.
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(100)
  })

  /**
   * The regression this exists for, stated as the comparison the
   * owner made: walking the ring in order is three times worse.
   */
  test("beats walking the ring in order", () => {
    const getMinimumGap = (
      order: readonly (typeof CATEGORICAL_SEQUENCE)[number][],
    ) =>
      Math.min(
        ...order.map((index, position) => {
          const next = order[
            (position + 1) % order.length
          ] as (typeof CATEGORICAL_SEQUENCE)[number]

          const raw = Math.abs(
            CATEGORICAL_HUES[index].hue -
              CATEGORICAL_HUES[next].hue,
          )

          return Math.min(raw, 360 - raw)
        }),
      )

    expect(
      getMinimumGap(CATEGORICAL_SEQUENCE),
    ).toBeGreaterThan(
      getMinimumGap(CATEGORICAL_INDEXES) * 2,
    )
  })

  /**
   * Spacing alone picked Red first, which made Red and Lime the two
   * hues every two-tile set in the fleet got. The owner rejected it
   * and named the pair he wanted instead, so the START of the walk
   * is a decision and not an accident of the solver.
   */
  test("starts on the pair the owner asked for", () => {
    const [first, second] = CATEGORICAL_SEQUENCE

    expect(CATEGORICAL_HUES[first].label).toBe("Teal")

    expect(CATEGORICAL_HUES[second].label).toBe("Purple")
  })

  /**
   * At EVERY position, wrap included — not just at the front. Red
   * beside a green is the pair the owner rejected, and a set of any
   * size may straddle any two neighbours.
   */
  test("never puts Red beside a green", () => {
    const GREENS = ["Lime", "Green"]

    const redPosition = CATEGORICAL_SEQUENCE.indexOf(
      CATEGORICAL_INDEXES.find(
        (index) => CATEGORICAL_HUES[index].label === "Red",
      ) as (typeof CATEGORICAL_SEQUENCE)[number],
    )

    const neighbours = [
      CATEGORICAL_SEQUENCE[
        (redPosition + 1) % CATEGORICAL_INDEX_COUNT
      ],
      CATEGORICAL_SEQUENCE[
        (redPosition + CATEGORICAL_INDEX_COUNT - 1) %
          CATEGORICAL_INDEX_COUNT
      ],
    ] as (typeof CATEGORICAL_SEQUENCE)[number][]

    for (const neighbour of neighbours) {
      expect(GREENS).not.toContain(
        CATEGORICAL_HUES[neighbour].label,
      )
    }
  })
})
