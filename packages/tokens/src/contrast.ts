/**
 * Contrast is a test, not a guideline.
 *
 * Two algorithms, deliberately playing different roles:
 *
 *  - **WCAG 2.2** is the *gate*. It is the normative standard, it
 *    is what an audit will be run against, and it is what CI
 *    fails on.
 *  - **APCA** is *reported alongside*. It models perceived
 *    lightness contrast far better on dark UI — where WCAG 2.1's
 *    ratio is well known to be over-permissive for light-on-dark
 *    — but it is still unofficial (WCAG 3 is a working draft), so
 *    gating on it would mean gating on a moving target.
 *
 * Reporting both is what stops a beautiful-but-unreadable
 * direction winning M0.
 */

export type ContrastResult = {
  /** WCAG 2.2 contrast ratio, 1–21. */
  ratio: number
  /** APCA lightness contrast, roughly -108…106. */
  lc: number
  /** WCAG 2.2 AA for normal-size text (4.5:1). */
  isAaNormal: boolean
  /** WCAG 2.2 AA for large text / UI components (3:1). */
  isAaLarge: boolean
  isAaaNormal: boolean
}

type Rgb = [number, number, number]

const parseHex = (hex: string): Rgb => {
  const normalized = hex.trim().replace(/^#/, "")

  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new Error(
      `Not a 6-digit hex colour: "${hex}". Tokens are opaque hex on purpose — translucency hides contrast failures.`,
    )
  }

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ]
}

// ---------------------------------------------------------------
// WCAG 2.2 — the gate
// ---------------------------------------------------------------

const toLinear = (channel: number) => {
  const srgb = channel / 255

  return srgb <= 0.04045
    ? srgb / 12.92
    : ((srgb + 0.055) / 1.055) ** 2.4
}

const getRelativeLuminance = (rgb: Rgb) =>
  0.2126 * toLinear(rgb[0]) +
  0.7152 * toLinear(rgb[1]) +
  0.0722 * toLinear(rgb[2])

export const getContrastRatio = (
  foreground: string,
  background: string,
) => {
  const foregroundLuminance = getRelativeLuminance(
    parseHex(foreground),
  )

  const backgroundLuminance = getRelativeLuminance(
    parseHex(background),
  )

  const lighter = Math.max(
    foregroundLuminance,
    backgroundLuminance,
  )

  const darker = Math.min(
    foregroundLuminance,
    backgroundLuminance,
  )

  return (lighter + 0.05) / (darker + 0.05)
}

// ---------------------------------------------------------------
// APCA (SAPC-APCA W3, constants from revision 0.1.9) — reported
// ---------------------------------------------------------------

const MAIN_TRC = 2.4
const RED_COEFFICIENT = 0.2126729
const GREEN_COEFFICIENT = 0.7151522
const BLUE_COEFFICIENT = 0.072175

const NORM_BACKGROUND = 0.56
const NORM_TEXT = 0.57
const REVERSE_TEXT = 0.62
const REVERSE_BACKGROUND = 0.65

const BLACK_THRESHOLD = 0.022
const BLACK_CLAMP = Math.SQRT2
const SCALE_BLACK_ON_WHITE = 1.14
const SCALE_WHITE_ON_BLACK = 1.14
const LOW_OFFSET = 0.027
const LOW_CLIP = 0.1
const DELTA_Y_MIN = 0.0005

const getApcaLuminance = (rgb: Rgb) => {
  const luminance =
    RED_COEFFICIENT * (rgb[0] / 255) ** MAIN_TRC +
    GREEN_COEFFICIENT * (rgb[1] / 255) ** MAIN_TRC +
    BLUE_COEFFICIENT * (rgb[2] / 255) ** MAIN_TRC

  // Soft-clamp near black, where display flare dominates.
  return luminance < BLACK_THRESHOLD
    ? luminance +
        (BLACK_THRESHOLD - luminance) ** BLACK_CLAMP
    : luminance
}

/**
 * APCA Lc. Sign carries meaning: negative is light-on-dark.
 * Magnitude is what to read — Lc 60 is roughly "body text ok",
 * Lc 45 "large text ok", Lc 30 "non-text / disabled floor".
 */
export const getApcaLc = (
  foreground: string,
  background: string,
) => {
  const textLuminance = getApcaLuminance(
    parseHex(foreground),
  )

  const backgroundLuminance = getApcaLuminance(
    parseHex(background),
  )

  if (
    Math.abs(backgroundLuminance - textLuminance) <
    DELTA_Y_MIN
  ) {
    return 0
  }

  if (backgroundLuminance > textLuminance) {
    const contrast =
      (backgroundLuminance ** NORM_BACKGROUND -
        textLuminance ** NORM_TEXT) *
      SCALE_BLACK_ON_WHITE

    return contrast < LOW_CLIP
      ? 0
      : (contrast - LOW_OFFSET) * 100
  }

  const contrast =
    (backgroundLuminance ** REVERSE_BACKGROUND -
      textLuminance ** REVERSE_TEXT) *
    SCALE_WHITE_ON_BLACK

  return contrast > -LOW_CLIP
    ? 0
    : (contrast + LOW_OFFSET) * 100
}

export const getContrast = (
  foreground: string,
  background: string,
): ContrastResult => {
  const ratio = getContrastRatio(foreground, background)

  return {
    ratio,
    lc: getApcaLc(foreground, background),
    isAaNormal: ratio >= 4.5,
    isAaLarge: ratio >= 3,
    isAaaNormal: ratio >= 7,
  }
}
