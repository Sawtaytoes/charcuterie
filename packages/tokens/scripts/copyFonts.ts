/**
 * Carries `src/fonts.css` and the `fonts/` woff2 into `dist`.
 *
 * Same reasoning as `packages/ui/scripts/copyStyles.ts`: `tsc` only
 * emits what it compiles, so an `exports["./fonts.css"]` pointing at
 * a file nothing copied fails at the consumer's `@import` — after
 * publish, which is the worst possible place to find out.
 *
 * The **layout** matters as much as the copy. `fonts.css` references
 * its woff2 as `./fonts/<name>.woff2`, so the directory has to sit
 * beside the sheet in `dist` exactly as it does in `src`. Flatten it
 * and every `@font-face` 404s silently — the browser falls back to
 * the next family in the stack and the page merely looks a bit
 * wrong, with nothing in the console to say why.
 */

import {
  copyFileSync,
  mkdirSync,
  readdirSync,
} from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const packageDirectory = dirname(
  dirname(fileURLToPath(import.meta.url)),
)

const distDirectory = join(packageDirectory, "dist")
const distFontDirectory = join(distDirectory, "fonts")

mkdirSync(distFontDirectory, { recursive: true })

copyFileSync(
  join(packageDirectory, "src", "fonts.css"),
  join(distDirectory, "fonts.css"),
)

const fontFiles = readdirSync(
  join(packageDirectory, "fonts"),
).filter((name) => name.endsWith(".woff2"))

for (const name of fontFiles) {
  copyFileSync(
    join(packageDirectory, "fonts", name),
    join(distFontDirectory, name),
  )
}

console.log(
  `wrote dist/fonts.css + dist/fonts/ (${fontFiles.length} woff2)`,
)
