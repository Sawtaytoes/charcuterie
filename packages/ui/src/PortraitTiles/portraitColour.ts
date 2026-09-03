/**
 * The paint for a portrait whose colour came from DATA rather than
 * from the palette.
 *
 * `Swatch` already argues the case this file serves: a colour that
 * "arrived from the world" — a sticker, an extracted album accent,
 * the NFC card a child taps — is not a token, so it cannot be
 * re-themed and cannot be a Tailwind class. It reaches the paint as
 * custom properties on the tile, and the classes read those
 * properties.
 *
 * Four properties rather than one, because the same hue has to do
 * four jobs and only one of them can use it raw:
 *
 *  - the **fill** behind the initials — the colour itself, exactly;
 *  - the **initials** on top of it — black or white, whichever the
 *    fill can actually carry;
 *  - the **halo** around the face — a transparent wash of the hue,
 *    standing in for what `categorical-N-surface` is on the palette
 *    side;
 *  - the **number** — the hue pulled toward the scheme's own text
 *    colour, so a pale card colour stays readable on a pale surface
 *    and a dark one stays readable on a dark surface. Mixing toward
 *    `content-primary` moves lightness and keeps hue, which is the
 *    smallest change that keeps the number *this person's colour*
 *    while remaining a number somebody can read.
 */

import { getReadableTextColour } from "@charcuterie/tokens"

export const PORTRAIT_COLOUR_PROPERTY =
  "--charcuterie-portrait-colour"

export const PORTRAIT_ON_COLOUR_PROPERTY =
  "--charcuterie-portrait-on-colour"

export const PORTRAIT_HALO_PROPERTY =
  "--charcuterie-portrait-halo"

export const PORTRAIT_STAT_PROPERTY =
  "--charcuterie-portrait-stat"

/**
 * The four properties for one portrait.
 *
 * `srgb` rather than `oklab` for both mixes, matching `Swatch`'s
 * existing `color-mix(in srgb, …)` — one interpolation space across
 * the library, so two components handed the same colour do not
 * produce two different washes of it.
 *
 * The initials colour is `getReadableTextColour`, which lives in
 * `@charcuterie/tokens` beside the contrast maths rather than here.
 * It is total on purpose: it runs inside a render, on a colour out
 * of a database, and a throw would blank the whole picker.
 */
export const getPortraitColourProperties = (
  color: string,
): Record<string, string> => ({
  [PORTRAIT_COLOUR_PROPERTY]: color,
  [PORTRAIT_HALO_PROPERTY]: `color-mix(in srgb, ${color} 28%, transparent)`,
  [PORTRAIT_ON_COLOUR_PROPERTY]:
    getReadableTextColour(color),
  [PORTRAIT_STAT_PROPERTY]: `color-mix(in srgb, ${color} 62%, var(--color-content-primary))`,
})
