/**
 * sRGB ↔ OKLab/OKLCh, and the one perceptual distance the token
 * layer measures.
 *
 * **Why a colour space lives in a token package at all.** Every
 * hex in `variants/*.ts` was hand-picked, and that is the right
 * shape for six intents a designer argues about one at a time. It
 * is the wrong shape for the categorical family: N hues x 7 roles x
 * 2 schemes x 4 variants is several hundred literals nobody can
 * check by eye, and `epaper.ts` already learned what happens when
 * a set of colours is typed out rather than derived — *"This used
 * to be six hardcoded hexes, and the hexes were invented."* So the
 * categorical family is **generated**, and generating it needs a
 * space where "same hue, different lightness" and "how different do
 * these two look" are both real questions.
 *
 * OKLab rather than HSL or CIELAB, for the two properties the
 * generator depends on:
 *
 *  - **Lightness is perceptual and hue-independent.** In HSL,
 *    `hsl(60 100% 50%)` (yellow) and `hsl(240 100% 50%)` (blue) are
 *    the same "lightness" and differ by 8:1 in measured contrast.
 *    A contrast solver walking HSL lightness walks a different
 *    distance per hue; walking OKLab `L` does not.
 *  - **Euclidean distance approximates perceived difference**,
 *    which is the whole of {@link getColourDistance} and therefore
 *    the whole of the adjacent-hue gate. CIELAB has the same claim
 *    and is measurably worse in the blue region — exactly where a
 *    ten-hue ring puts two of its members.
 *
 * Zero dependencies, no `Math.random`, no I/O: this package is
 * React-free and Satori-safe, and the generator runs at module
 * load in every consumer that imports a variant.
 *
 * Constants are Björn Ottosson's published OKLab matrices.
 */

/** Non-linear sRGB, each channel 0–1. */
type Rgb = {
  blue: number
  green: number
  red: number
}

/** OKLab. `lightness` 0–1; `a`/`b` roughly -0.4…0.4. */
export type OkLab = {
  a: number
  b: number
  lightness: number
}

/**
 * OKLCh — the polar form, and the one a palette is written in.
 *
 * `hue` is in **degrees**, because that is how a colour wheel is
 * discussed and how `CATEGORICAL_HUES` is read. `chroma` is
 * absolute rather than a percentage of the gamut: the sRGB gamut's
 * maximum chroma varies enormously by hue (yellow reaches ~0.21,
 * blue ~0.31), so a percentage would silently mean a different
 * saturation at every hue.
 */
export type OkLch = {
  chroma: number
  hue: number
  lightness: number
}

const toLinearChannel = (channel: number) =>
  channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4

const toGammaChannel = (channel: number) =>
  channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * channel ** (1 / 2.4) - 0.055

const toOkLabFromLinear = ({
  blue,
  green,
  red,
}: Rgb): OkLab => {
  const long = Math.cbrt(
    0.4122214708 * red +
      0.5363325363 * green +
      0.0514459929 * blue,
  )

  const medium = Math.cbrt(
    0.2119034982 * red +
      0.6806995451 * green +
      0.1073969566 * blue,
  )

  const short = Math.cbrt(
    0.0883024619 * red +
      0.2817188376 * green +
      0.6299787005 * blue,
  )

  return {
    lightness:
      0.2104542553 * long +
      0.793617785 * medium -
      0.0040720468 * short,
    a:
      1.9779984951 * long -
      2.428592205 * medium +
      0.4505937099 * short,
    b:
      0.0259040371 * long +
      0.7827717662 * medium -
      0.808675766 * short,
  }
}

const toLinearFromOkLab = ({
  a,
  b,
  lightness,
}: OkLab): Rgb => {
  const long =
    (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3

  const medium =
    (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3

  const short =
    (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3

  return {
    red:
      4.0767416621 * long -
      3.3077115913 * medium +
      0.2309699292 * short,
    green:
      -1.2684380046 * long +
      2.6097574011 * medium -
      0.3413193965 * short,
    blue:
      -0.0041960863 * long -
      0.7034186147 * medium +
      1.707614701 * short,
  }
}

const toOkLabFromOkLch = ({
  chroma,
  hue,
  lightness,
}: OkLch): OkLab => {
  const radians = (hue * Math.PI) / 180

  return {
    lightness,
    a: chroma * Math.cos(radians),
    b: chroma * Math.sin(radians),
  }
}

const IN_GAMUT_EPSILON = 0.0001

const getIsInGamut = ({ blue, green, red }: Rgb) =>
  red >= -IN_GAMUT_EPSILON &&
  red <= 1 + IN_GAMUT_EPSILON &&
  green >= -IN_GAMUT_EPSILON &&
  green <= 1 + IN_GAMUT_EPSILON &&
  blue >= -IN_GAMUT_EPSILON &&
  blue <= 1 + IN_GAMUT_EPSILON

const GAMUT_SEARCH_STEPS = 24

/**
 * The colour sRGB can actually show, nearest to the one asked for.
 *
 * **Chroma is what gives**, never lightness and never hue. Clipping
 * the three channels independently — the obvious implementation —
 * shifts hue, and a hue shift is the one error this whole family
 * cannot absorb: two indexes that were 36° apart in the source
 * arrive 20° apart on screen, and the adjacent-hue gate is
 * measuring the wrong thing while reporting the right one. Holding
 * `lightness` fixed matters for the same reason in the other
 * direction: the contrast solver has already chosen it, so a clip
 * that moves it un-solves the gate it just satisfied.
 *
 * Binary search rather than an analytic cusp: 24 steps is exact to
 * well under one 8-bit code, it needs no per-hue gamut boundary
 * table, and it cannot be wrong in a way a table can.
 */
export const toGamut = (colour: OkLch): OkLch => {
  if (
    getIsInGamut(
      toLinearFromOkLab(toOkLabFromOkLch(colour)),
    )
  ) {
    return colour
  }

  let low = 0

  let high = colour.chroma

  for (let step = 0; step < GAMUT_SEARCH_STEPS; step += 1) {
    const middle = (low + high) / 2

    if (
      getIsInGamut(
        toLinearFromOkLab(
          toOkLabFromOkLch({ ...colour, chroma: middle }),
        ),
      )
    ) {
      low = middle
    } else {
      high = middle
    }
  }

  return { ...colour, chroma: low }
}

const toHexChannel = (channel: number) =>
  Math.min(255, Math.max(0, Math.round(channel * 255)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase()

/**
 * OKLCh → the six-digit uppercase hex the token layer is made of.
 *
 * Gamut-mapped first, so this never emits a channel that was
 * clipped on the way out — `variants.test.ts` requires opaque
 * 6-digit hex, and `contrast.ts` refuses anything else.
 */
export const toHex = (colour: OkLch): string => {
  const { blue, green, red } = toLinearFromOkLab(
    toOkLabFromOkLch(toGamut(colour)),
  )

  return `#${toHexChannel(toGammaChannel(red))}${toHexChannel(
    toGammaChannel(green),
  )}${toHexChannel(toGammaChannel(blue))}`
}

export const toOkLab = (hex: string): OkLab => {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())

  if (!match?.[1]) {
    throw new Error(
      `Not a 6-digit hex colour: "${hex}". The token layer is opaque hex on purpose.`,
    )
  }

  const digits = match[1]

  return toOkLabFromLinear({
    red: toLinearChannel(
      Number.parseInt(digits.slice(0, 2), 16) / 255,
    ),
    green: toLinearChannel(
      Number.parseInt(digits.slice(2, 4), 16) / 255,
    ),
    blue: toLinearChannel(
      Number.parseInt(digits.slice(4, 6), 16) / 255,
    ),
  })
}

/**
 * How different two colours look, in OKLab units.
 *
 * **This is the property a contrast gate structurally cannot
 * see.** Contrast measures each colour against the *background*;
 * two swatches can both clear 4.5:1 against the same surface and
 * be the same colour as each other. Telling label 3 from label 4
 * is the entire job of a categorical palette, and nothing in
 * `contrastAudit.ts` asks about it.
 *
 * Scale, for the thresholds in `categorical.ts`: ~0.02 is about
 * one just-noticeable difference under good conditions, and the
 * usual working figure for "unmistakably a different colour at a
 * glance, at small size" is several times that. Black to white is
 * 1.0.
 */
export const getColourDistance = (
  first: string,
  second: string,
) => {
  const one = toOkLab(first)

  const other = toOkLab(second)

  return Math.hypot(
    one.lightness - other.lightness,
    one.a - other.a,
    one.b - other.b,
  )
}
