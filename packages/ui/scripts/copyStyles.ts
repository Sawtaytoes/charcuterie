/**
 * `styles.css` is hand-written, not generated, so `tsc` does not
 * carry it into `dist` — and a package whose
 * `exports["./styles.css"]` points at a file that was never copied
 * fails at the consumer's `@import`, after publish, which is the
 * worst possible place to find out.
 */

import { copyFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const packageDirectory = dirname(
  dirname(fileURLToPath(import.meta.url)),
)

const distDirectory = join(packageDirectory, "dist")

mkdirSync(distDirectory, { recursive: true })

copyFileSync(
  join(packageDirectory, "src", "styles.css"),
  join(distDirectory, "styles.css"),
)

console.log("wrote dist/styles.css")
