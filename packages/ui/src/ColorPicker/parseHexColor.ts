const SHORT_HEX_PATTERN = /^[0-9a-f]{3}$/i

const LONG_HEX_PATTERN = /^[0-9a-f]{6}$/i

/**
 * Reads what a person types into a hex field — `3a86ff`, `#3A86FF`,
 * `#38f`, with or without the leading mark and with stray spaces — and
 * answers the one canonical form, `#RRGGBB` in upper case, or `null`
 * when it is not a color.
 *
 * Upper case because that is how the fleet's palettes are written and
 * how a person reads a code aloud; a native `<input type="color">`
 * answers lower case, and two spellings of one color are how a
 * "is this the preset?" comparison quietly fails.
 *
 * No alpha. A child's color, a label's color, a sticker's color is
 * opaque, and an eight-digit code would let a translucent value
 * through every contrast rule an app writes against it.
 */
export const parseHexColor = (
  text: string,
): string | null => {
  const digits = text.trim().replace(/^#/, "")

  if (SHORT_HEX_PATTERN.test(digits)) {
    return `#${[...digits]
      .map((digit) => `${digit}${digit}`)
      .join("")
      .toUpperCase()}`
  }

  if (LONG_HEX_PATTERN.test(digits)) {
    return `#${digits.toUpperCase()}`
  }

  return null
}
