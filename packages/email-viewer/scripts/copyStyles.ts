/**
 * `styles.css` is hand-written, so `tsc` does not carry it into `dist`,
 * and `exports["./styles.css"]` would point at nothing in a release
 * archive.
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
