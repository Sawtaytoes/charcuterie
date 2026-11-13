/**
 * The first-paint plugin: injects the `@charcuterie/tokens`
 * first-paint script into `<head>`, ahead of every stylesheet.
 *
 * Its own entry point (`@charcuterie/vite-config/first-paint`), so
 * a consumer of the base config never resolves
 * `@charcuterie/tokens`. An Electron renderer or a library build
 * has no theme to paint.
 *
 * The script sets `<html data-scheme>` from the stored choice (or
 * the OS setting) and paints the canvas in the matching surface
 * colour before the token stylesheet arrives. Without it, a dark
 * app opens with a full-page white flash.
 *
 * The colours are derived from the variant object rather than
 * pasted as hexes. Docket once shipped a pasted copy whose colours
 * belonged to `daylight` while its document declared
 * `data-variant="hairline"`, so the canvas painted cool and then
 * snapped warm the instant the token stylesheet landed. Deriving
 * them gives the palette and the anti-flash colour one source.
 *
 * Eight apps carried a copy of this plugin, and the copies had
 * already drifted, which is why it lives here now.
 */

import {
  buildFirstPaintScript,
  DEFAULT_COLOR_SCHEME_STORAGE_KEY,
  daylight,
} from "@charcuterie/tokens"

const OPENING_SCRIPT_TAG_REGEX = /^<script>\r?\n?/u
const CLOSING_SCRIPT_TAG_REGEX = /\r?\n?<\/script>\s*$/u

/**
 * The script's body, without its `<script>` wrapper. Vite's tag
 * descriptor adds the wrapper back, so leaving it on would nest
 * one script tag inside another.
 *
 * @param {import("./firstPaint.d.ts").FirstPaintOptions} [options]
 * @returns {string}
 */
export const buildFirstPaintScriptBody = ({
  storageKey = DEFAULT_COLOR_SCHEME_STORAGE_KEY,
  variant = daylight,
} = {}) =>
  buildFirstPaintScript(variant, { storageKey })
    .replace(OPENING_SCRIPT_TAG_REGEX, "")
    .replace(CLOSING_SCRIPT_TAG_REGEX, "")

/**
 * @param {import("./firstPaint.d.ts").FirstPaintOptions} [options]
 * @returns {import("vite").Plugin}
 */
export const createFirstPaintPlugin = (options = {}) => {
  const scriptBody = buildFirstPaintScriptBody(options)

  return {
    name: "charcuterie:first-paint",
    transformIndexHtml: {
      handler: () => [
        {
          children: scriptBody,
          injectTo: "head-prepend",
          tag: "script",
        },
      ],
      order: "pre",
    },
  }
}
