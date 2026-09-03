/**
 * `categorical` — the numbered, non-semantic colour family.
 *
 * `intent` is the fleet's only multi-value colour family and every
 * one of its six members **means** something: `danger` is not a
 * colour, it is a claim about what happens if you press the thing.
 * That is exactly right for a status pill and useless for the case
 * the fleet keeps hitting anyway — a user picking a colour for a
 * label, a project, a series on a chart. A "Homelab" label is not a
 * `danger`, and colouring it red would be a lie the design system
 * told on the user's behalf.
 *
 * So: `--color-categorical-<n>-<role>`, **numbered because there is
 * nothing to name**. Same seven roles as an intent (`surface`,
 * `surfaceHover`, `border`, `content`, `solid`, `solidHover`,
 * `onSolid`), because a categorical badge is a badge — it needs the
 * tinted pill, the saturated fill, and a stated foreground for
 * each, for identical reasons.
 *
 * ### Why this is not `Swatch`
 *
 * `Swatch.tsx` carries a long argument that a user-chosen colour is
 * data rather than a token — *"A design system owns `intent.danger`;
 * it does not own the colour of the dot somebody stuck on a game
 * controller"* — and that argument is still right. The two answer
 * different questions:
 *
 *  - `Swatch` takes an **ungoverned** colour arriving from the
 *    world: a physical sticker, an accent castkit extracts off an
 *    album. Arbitrary, unthemeable, uncheckable, and re-theming it
 *    would be re-theming the hardware.
 *  - `categorical` is a **curated set the user picks from**.
 *    Finite, re-themed per variant like everything else here, and
 *    contrast-gated in both schemes — so the user *cannot* pick one
 *    that is unreadable, which is the failure `Swatch` structurally
 *    cannot prevent and is not trying to.
 *
 * Full argument:
 * `docs/decisions/2026-08-19-categorical-is-a-curated-palette-not-ungoverned-colour.md`.
 *
 * ### Generated, not typed out
 *
 * Ten hues x seven roles x two schemes x four variants is 560
 * hexes. Hand-writing them produces exactly what `epaper.ts`
 * describes finding in itself — *"This used to be six hardcoded
 * hexes, and the hexes were invented"* — except eighty times over
 * and with no driver to check them against. Every value here is
 * solved from a hue and a contrast target against the **emitted
 * hex** rather than against the pre-rounding float, so what the
 * gate measures is what the browser paints.
 */

import { getColourDistance, toHex } from "./colourSpace.ts"
import { getContrastRatio } from "./contrast.ts"
import type { IntentRole, Scheme } from "./types.ts"

/**
 * Deliberately the **same union as `IntentRole`**, not a copy.
 *
 * The two families have identical role structure and that is the
 * point — a categorical badge is a badge. Aliasing rather than
 * restating means a new state role (a `solidPressed`, say) lands in
 * both families at once, and both halves of `contrastAudit.ts`'s
 * derived enumeration pick it up. That derivation is the mechanism
 * that caught `solidHover` going unmeasured for the library's whole
 * life; two hand-maintained copies of the same seven names is how
 * the gap reopens.
 */
export type CategoricalRole = IntentRole

/**
 * **Ten.** The number is a decision, not a default — see
 * `docs/decisions/2026-08-19-the-categorical-family-has-ten-hues.md`.
 *
 * The short version: ten is the most hues that survive the gate
 * that actually matters. Contrast against the background is *not*
 * what a categorical palette lives or dies on — telling swatch 3
 * from swatch 4 is — and the ring has to stay separable after every
 * hue has been pushed to whatever lightness AA demands in **both**
 * schemes, which flattens exactly the differences a raw colour
 * wheel relies on. At ten, the tightest pair in the whole fleet is
 * ΔEok 0.089 on `solid`, which clears the 0.084 that Tableau 10 —
 * the most-copied ten-colour categorical palette there is —
 * achieves for itself. Twelve does not clear it anywhere, in any
 * variant, because the sRGB gamut collapses through the
 * green-to-cyan arc once those hues are dark enough to carry a
 * label.
 *
 * It is also the size the consuming problem wants. Docket's user
 * picks a colour for a label out of a swatch row; ten is a row he
 * can take in at once. Past about a dozen a picker stops being a
 * choice between distinguishable things and becomes a colour
 * picker — which is `Swatch`'s problem, and deliberately not this
 * one.
 */
export const CATEGORICAL_INDEXES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
] as const

/**
 * One of the ten hues. **1-based** — `1..10`, matching the token
 * names (`--color-categorical-1-*`), not an array position.
 *
 * ⚠️ Never reach this type with `as`. Every consumer of an index is
 * a plain `Record<CategoricalIndex, …>`, so a `0` from an off-by-one
 * resolves to `undefined` and the next property read throws — which
 * is a blank page, not a type error. `index as CategoricalIndex` over
 * an `Array.map` position is exactly that mistake, and it type-checks
 * because an assertion is a claim rather than a check. It shipped
 * once, in QueuePilot's landing.
 *
 * Derive the value instead. Indexing the tuple already yields this
 * union, so nothing needs asserting:
 *
 * ```ts
 * CATEGORICAL_INDEXES[position % CATEGORICAL_INDEX_COUNT]
 * ```
 *
 * Or let the component take it by position for you — `ActionTiles`
 * and `PortraitTiles` both do, and an item only names its own hue
 * when the order is not the answer.
 */
export type CategoricalIndex =
  (typeof CATEGORICAL_INDEXES)[number]

export const CATEGORICAL_INDEX_COUNT =
  CATEGORICAL_INDEXES.length

/**
 * The ring. `hue` is an OKLCh angle in degrees; `label` is what a
 * human calls it.
 *
 * **The label is not decoration, and it is not a semantic.**
 * `Swatch` already settled that a colour is not a name — a screen
 * reader gets nothing at all from a `background-color`, and
 * `getByRole("img", { name })`, the query an agent writes, has
 * nothing to match — so a picker offering ten coloured dots owes
 * each of them a name or it is unusable by anyone not looking at
 * it. "Amber" describes the pixels in the way "warning" would not;
 * nothing in the library branches on it.
 *
 * **The spacing is measured, not drawn.** Even 36° steps are the
 * obvious ring and they fail: OKLCh hue is far more perceptually
 * uniform than HSL but is not perfectly so, and more importantly
 * the sRGB gamut is not a cylinder — it collapses hard through
 * 120–210° at the lightness a legible fill needs, and is deep and
 * roomy through 240–320°. So the arc from lime to teal is
 * stretched and the blue-to-purple arc is compressed, by
 * coordinate ascent on the fleet-wide minimum pairwise distance
 * with every variant and both schemes in the objective. The result
 * is a ring whose gaps look uneven written down and even to the
 * eye, which is the only place it matters.
 */
export const CATEGORICAL_HUES: Record<
  CategoricalIndex,
  { hue: number; label: string }
> = {
  1: { hue: 22, label: "Red" },
  2: { hue: 57, label: "Orange" },
  3: { hue: 93, label: "Amber" },
  4: { hue: 128, label: "Lime" },
  5: { hue: 162, label: "Green" },
  6: { hue: 203, label: "Teal" },
  7: { hue: 241, label: "Blue" },
  8: { hue: 277, label: "Indigo" },
  9: { hue: 312, label: "Purple" },
  10: { hue: 347, label: "Pink" },
}

/**
 * How far the solver moves per step, in OKLab lightness.
 *
 * A scan rather than a binary search, and the reason is rounding.
 * The gate measures the **emitted six-digit hex**, so a solver that
 * converges on a float and then rounds can land a hundredth under
 * its own threshold — which is the shape of the note on
 * `hairline`'s `danger.solid`, sitting at exactly 4.50:1 and *"the
 * next rounding error away from failing"*. Stepping until the
 * **hex** clears the target cannot do that. 0.002 is under half an
 * 8-bit code at mid lightness, so nothing is skipped, and the whole
 * family costs a few milliseconds at module load.
 */
const LIGHTNESS_STEP = 0.002

const LIGHTNESS_LIMIT = 0.995

/**
 * Walk lightness until the emitted hex clears `threshold` against
 * `background`, and stop at the **first** value that does.
 *
 * Stopping at the first rather than overshooting to a comfortable
 * margin is deliberate: every step away from the starting lightness
 * is chroma the hue does not get to keep, and chroma is what the
 * distinctness gate spends.
 */
const solveLightness = ({
  background,
  chroma,
  hue,
  isDarkening,
  startLightness,
  threshold,
}: {
  background: string
  chroma: number
  hue: number
  isDarkening: boolean
  startLightness: number
  threshold: number
}) => {
  let lightness = startLightness

  while (
    lightness > LIGHTNESS_STEP &&
    lightness < LIGHTNESS_LIMIT
  ) {
    const hex = toHex({ chroma, hue, lightness })

    if (getContrastRatio(hex, background) >= threshold) {
      return { hex, lightness }
    }

    lightness += isDarkening
      ? -LIGHTNESS_STEP
      : LIGHTNESS_STEP
  }

  throw new Error(
    `No lightness at hue ${hue} / chroma ${chroma} reaches ${threshold}:1 against ${background}. Fix the hue — do not lower the gate.`,
  )
}

/**
 * What a variant is allowed to say about its own categorical ring.
 *
 * Everything else is derived. A variant states its **character** —
 * `hairline` is low-chroma by premise, `legible` aims past AA — and
 * never a hex, because the moment a variant can state a hex the
 * family is 560 hand-checked literals again.
 */
export type CategoricalTuning = {
  /**
   * Multiplies the chroma budget every role starts from. Most hues
   * are gamut-bound at the lightness their contrast target forces,
   * so this moves the reds, blues and purples more than it moves
   * the greens — which is the honest version of "a variant is
   * quieter", rather than a flat desaturation that the gamut would
   * silently ignore in half the ring.
   */
  chromaScale?: number
  /**
   * What the **generator** aims `content` at, against the hovered
   * tint. Distinct from what `contrastAudit.ts` **gates** it at,
   * which is WCAG's 4.5:1 and nothing more.
   *
   * The default is 7 because that is where the fleet's hand-made
   * intent tints already sit — measured, every variant and both
   * schemes: 6.1:1 to 11.6:1, never near 4.5. A categorical badge
   * generated to the letter of the gate would sit next to an intent
   * badge that is visibly crisper, and read as a bug in the new
   * thing rather than as the standard being met.
   */
  contentContrast?: number
}

const DEFAULT_CONTENT_CONTRAST = 7

/**
 * What the generator aims a fill at, against its own label.
 *
 * Above the 4.5:1 gate rather than at it, for the reason
 * `hairline`'s `danger.solid` comment gives about living at exactly
 * 4.50:1: a value solved to the threshold has no room for the next
 * tweak to anything it was solved against.
 */
const ON_SOLID_CONTRAST = 4.7

/**
 * **3:1, and NOT exempt** — the one place this family is
 * deliberately stricter than `intent`.
 *
 * `contrastAudit.ts` reports `intent.<name>.border` and does not
 * gate it, on the stated grounds that *"a badge outline is
 * decorative — the meaning is carried by its text, which is gated
 * at 4.5:1"*. That is true of an intent badge: the pill says
 * `failed`, and the red is a second copy of a message the words
 * already carry.
 *
 * It is **false here**. A categorical badge's entire information
 * content is which of ten it is; its text says "Homelab", which
 * tells you nothing about the colour, and the colour is what the
 * eye scans the list by. So the boundary is doing identification
 * work in the sense WCAG 1.4.11 means, and it is gated like one.
 * The cost is a visibly heavier outline than an intent badge's,
 * and that is the right trade — it is also what keeps a
 * necessarily-pale tint distinguishable from its neighbour.
 *
 * Solved a little above the gate for the same headroom reason as
 * {@link ON_SOLID_CONTRAST}.
 */
export const CATEGORICAL_BORDER_THRESHOLD = 3

const BORDER_CONTRAST = 3.15

/**
 * Where each role starts its walk, per scheme.
 *
 * These are **starting** lightnesses, not results: the solver moves
 * away from each until the emitted hex clears its threshold and
 * then stops. `surface` and `surfaceHover` are the exception and
 * are stated outright, because nothing is drawn behind a tint to
 * solve it against — it *is* the background.
 */
const SCHEME_GEOMETRY = {
  light: {
    surfaceLightness: 0.955,
    surfaceChroma: 0.032,
    surfaceHoverLightness: 0.925,
    surfaceHoverChroma: 0.042,
    borderChroma: 0.1,
    borderStartLightness: 0.82,
    contentChroma: 0.13,
    contentStartLightness: 0.62,
    solidChroma: 0.16,
    solidStartLightness: 0.72,
  },
  dark: {
    surfaceLightness: 0.265,
    surfaceChroma: 0.045,
    surfaceHoverLightness: 0.315,
    surfaceHoverChroma: 0.052,
    borderChroma: 0.11,
    borderStartLightness: 0.45,
    contentChroma: 0.14,
    contentStartLightness: 0.68,
    solidChroma: 0.17,
    solidStartLightness: 0.66,
  },
} as const

/**
 * How far a fill moves when a pointer lands on it.
 *
 * **Brighter, in both schemes**, which is the opposite of what
 * `daylight`'s dark accent button had to do — and for the same
 * stated reason. *"A hover moves away from its own label's
 * lightness."* An intent fill carries a white label and therefore
 * has to deepen; a categorical fill carries a near-black one (see
 * {@link getOnSolid}) and therefore brightens.
 */
const SOLID_HOVER_LIGHTNESS_DELTA = 0.05

/**
 * The label on a categorical fill: a very dark tone of the fill's
 * **own hue**, on every index, in both schemes.
 *
 * `types.ts` says of intents that *"whether white or near-black
 * wins on a given fill genuinely varies per intent"*, and it does —
 * `daylight`'s dark `danger` carries white while its `success`
 * carries `#04150D`. This family picks a side and holds it, for
 * two reasons that do not apply to intents:
 *
 *  - **Chroma is the budget the distinctness gate spends.** A fill
 *    dark enough to carry white is a fill pushed down the gamut,
 *    and through the green-to-cyan arc that is where the ring stops
 *    being separable. Bright fill + dark label keeps the hues where
 *    they are widest, which is the difference between ten hues and
 *    seven.
 *  - **Ten chips are seen at once.** An intent appears once or
 *    twice in a view, so a per-intent answer reads as considered. A
 *    row of ten where four have white text and six have black reads
 *    as an accident.
 *
 * A tone of the hue rather than a shared `#000000`, exactly as
 * `intent.success.onSolid: "#04150D"` already is by hand: pure
 * black on a saturated fill reads as a hole punched in it.
 */
const getOnSolid = (hue: number) =>
  toHex({ chroma: 0.03, hue, lightness: 0.17 })

const buildCategoricalColour = ({
  index,
  raisedSurface,
  scheme,
  tuning,
}: {
  index: CategoricalIndex
  raisedSurface: string
  scheme: Scheme
  tuning: CategoricalTuning
}): Record<CategoricalRole, string> => {
  const { hue } = CATEGORICAL_HUES[index]

  const geometry = SCHEME_GEOMETRY[scheme]

  const chromaScale = tuning.chromaScale ?? 1

  const isLight = scheme === "light"

  const surface = toHex({
    chroma: geometry.surfaceChroma * chromaScale,
    hue,
    lightness: geometry.surfaceLightness,
  })

  const surfaceHover = toHex({
    chroma: geometry.surfaceHoverChroma * chromaScale,
    hue,
    lightness: geometry.surfaceHoverLightness,
  })

  // Solved against `surfaceHover`, the harder of the two in both
  // schemes: the light tint darkens under a pointer and the dark
  // tint lightens, and either way the hovered row is the one that
  // closes on its own text. Clearing it clears the resting tint for
  // free — and `contrastAudit.ts` measures both regardless, because
  // a derived enumeration is what stopped this library trusting
  // "the resting state passes" as an answer.
  const content = solveLightness({
    background: surfaceHover,
    chroma: geometry.contentChroma * chromaScale,
    hue,
    isDarkening: isLight,
    startLightness: geometry.contentStartLightness,
    threshold:
      tuning.contentContrast ?? DEFAULT_CONTENT_CONTRAST,
  }).hex

  const border = solveLightness({
    background: raisedSurface,
    chroma: geometry.borderChroma * chromaScale,
    hue,
    isDarkening: isLight,
    startLightness: geometry.borderStartLightness,
    threshold: BORDER_CONTRAST,
  }).hex

  const onSolid = getOnSolid(hue)

  const solidChroma = geometry.solidChroma * chromaScale

  // Brightening, because the label is dark. See `getOnSolid`.
  const solid = solveLightness({
    background: onSolid,
    chroma: solidChroma,
    hue,
    isDarkening: false,
    startLightness: geometry.solidStartLightness,
    threshold: ON_SOLID_CONTRAST,
  })

  const solidHover = solveLightness({
    background: onSolid,
    chroma: solidChroma,
    hue,
    isDarkening: false,
    startLightness:
      solid.lightness + SOLID_HOVER_LIGHTNESS_DELTA,
    threshold: ON_SOLID_CONTRAST,
  }).hex

  return {
    border,
    content,
    onSolid,
    solid: solid.hex,
    solidHover,
    surface,
    surfaceHover,
  }
}

/**
 * One scheme's worth of the categorical family, for one variant.
 *
 * `raisedSurface` is the variant's own `surface.raised`, because
 * that is the background `contrastAudit.ts` measures a border
 * against, and a badge is a thing that sits on a card.
 */
export const buildCategoricalScheme = ({
  raisedSurface,
  scheme,
  tuning = {},
}: {
  raisedSurface: string
  scheme: Scheme
  tuning?: CategoricalTuning
}): Record<
  CategoricalIndex,
  Record<CategoricalRole, string>
> =>
  Object.fromEntries(
    CATEGORICAL_INDEXES.map((index) => [
      index,
      buildCategoricalColour({
        index,
        raisedSurface,
        scheme,
        tuning,
      }),
    ]),
  ) as Record<
    CategoricalIndex,
    Record<CategoricalRole, string>
  >

/**
 * Adjacent pairs on the ring, **including the wrap** from the last
 * index back to the first.
 *
 * The wrap is not pedantry. The ring is a wheel, so 10 and 1 are
 * neighbours in hue even though nothing in a swatch row puts them
 * side by side — and a generator that drifts closes the gap
 * exactly there, where no visual review would look.
 */
export const CATEGORICAL_ADJACENT_PAIRS: [
  CategoricalIndex,
  CategoricalIndex,
][] = CATEGORICAL_INDEXES.map((index, position) => [
  index,
  CATEGORICAL_INDEXES[
    (position + 1) % CATEGORICAL_INDEXES.length
  ] as CategoricalIndex,
])

/**
 * Every unordered pair, which is what the gate actually asks about.
 *
 * Adjacent pairs are the binding case — the ring is hue-ordered, so
 * neighbours are always the closest — but "no two indexes look
 * alike" is the property, and asking it of all 45 pairs costs
 * nothing and cannot be quietly satisfied by a reordering.
 */
export const CATEGORICAL_PAIRS: [
  CategoricalIndex,
  CategoricalIndex,
][] = CATEGORICAL_INDEXES.flatMap((first, position) =>
  CATEGORICAL_INDEXES.slice(position + 1).map(
    (second): [CategoricalIndex, CategoricalIndex] => [
      first,
      second,
    ],
  ),
)

/**
 * The floor each role has to clear, in the OKLab units
 * {@link getColourDistance} returns — where ~0.02 is roughly one
 * just-noticeable difference and black-to-white is 1.0.
 *
 * Keyed by every `CategoricalRole` so a new role cannot be added
 * without somebody saying whether two indexes are allowed to look
 * alike in it. `null` is "not an identity carrier": `onSolid` is a
 * near-black on every hue by construction, so requiring two of them
 * to differ would be requiring the text on two buttons to be
 * different colours.
 *
 *  - **`solid` — 0.08.** The identity carrier, and the number is
 *    external: Tableau 10's own tightest pair measures 0.0835, and
 *    d3's `category10` 0.1133. A ring that clears 0.08 in every
 *    variant and both schemes is in that company rather than merely
 *    in compliance with itself. For scale, the six **intents** are
 *    only 0.0329 apart at their tightest (`layered`'s coral accent
 *    beside its danger red, which that file admits to).
 *  - **`content` — 0.05, `border` — 0.05.** Both are pushed to a
 *    contrast target rather than chosen for chroma, so both live
 *    nearer the ends of the lightness range where the gamut is
 *    narrow. 0.05 is ~2.5 JND, and the achieved fleet minimum
 *    (0.056) is within a hair of what the **six** hand-made intent
 *    contents achieve between themselves (0.059).
 *  - **`solidHover` — 0.07**, below `solid` on purpose: exactly one
 *    element is hovered at a time, so no one ever compares two
 *    hovered fills. It is gated at all as a drift alarm.
 *  - **`surface` — 0.012, `surfaceHover` — 0.018.** A pale tint
 *    *cannot* be pushed far from its neighbour without ceasing to
 *    be pale, and it is not what identifies the pill — the border
 *    and the text are, both gated far higher. The floor here is a
 *    drift alarm, not a claim that ten tints are individually
 *    recognisable.
 */
export const CATEGORICAL_DISTINCTNESS_FLOOR: Record<
  CategoricalRole,
  number | null
> = {
  border: 0.05,
  content: 0.05,
  onSolid: null,
  solid: 0.08,
  solidHover: 0.07,
  surface: 0.012,
  surfaceHover: 0.018,
}

/**
 * Tableau 10's own tightest pair, in the same units.
 *
 * Kept as a named constant because it is the only number here that
 * comes from outside the library, and a benchmark nobody can find
 * the provenance of stops being a benchmark.
 */
export const TABLEAU_10_MINIMUM_DISTANCE = 0.0835

export type CategoricalDistinctnessFailure = {
  distance: number
  first: CategoricalIndex
  floor: number
  role: CategoricalRole
  second: CategoricalIndex
}

/**
 * Every pair of indexes that is too close to tell apart.
 *
 * **The gate a contrast audit structurally cannot be.**
 * `contrastAudit.ts` measures each colour against the
 * *background*: two indexes can both clear 4.5:1 on the same
 * surface and be the same colour as each other, and every number on
 * the board stays green. Distinguishing swatch 3 from swatch 4 is
 * the only job a categorical palette has, and nothing that existed
 * before this function asked about it.
 */
export const getCategoricalDistinctnessFailures = (
  categorical: Record<
    CategoricalIndex,
    Record<CategoricalRole, string>
  >,
): CategoricalDistinctnessFailure[] =>
  CATEGORICAL_PAIRS.flatMap(([first, second]) =>
    (
      Object.keys(
        CATEGORICAL_DISTINCTNESS_FLOOR,
      ) as CategoricalRole[]
    ).flatMap((role) => {
      const floor = CATEGORICAL_DISTINCTNESS_FLOOR[role]

      if (floor === null) {
        return []
      }

      const distance = getColourDistance(
        categorical[first][role],
        categorical[second][role],
      )

      return distance >= floor
        ? []
        : [{ distance, first, floor, role, second }]
    }),
  )
