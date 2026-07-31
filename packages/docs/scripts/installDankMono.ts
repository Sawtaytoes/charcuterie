/**
 * Copies the owner's licensed Dank Mono webfonts off the NAS into
 * `public/fonts/`, where the preview can serve them.
 *
 * **This is why the woff2 are gitignored.** Dank Mono is a paid font
 * from Grazil Ltd, and its EULA is permissive about *use* — "any
 * number of devices, websites, or any other media, as long as they
 * are solely responsible for said media" covers every app in this
 * fleet — but explicit about copies: the licensee "may not make a
 * copy of the font, with the exception of personal archival purposes
 * only", and agrees "not to … re-distribute" it.
 *
 * `Sawtaytoes/charcuterie` is a **public** GitHub repository.
 * Committing the woff2 would publish them to anyone who clones, which
 * is redistribution regardless of intent. Using the font is fine;
 * shipping it in a public design system is not. So the bytes stay on
 * the NAS and this script fetches them per-checkout.
 *
 * Run: `node scripts/installDankMono.ts` from `packages/docs`.
 * Missing source is not an error — the preview falls back to the next
 * family in the stack, and a machine without the licensed copy should
 * still be able to run Storybook.
 */

import { access, copyFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * The `Web-PS/` build from the purchased archive. Its sibling
 * `dmvendor.css` is not used: it inlines every weight as base64
 * under the family name `dm`, which is both enormous and a name
 * nothing else in the fleet would guess.
 */
const SOURCE_DIR =
  "/mnt/Bunnies/Kevin/Apps/Fonts/Development/DankMono/Web-PS"

const FILES = [
  "DankMono-Regular.woff2",
  "DankMono-Italic.woff2",
  "DankMono-Bold.woff2",
]

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, "..", "public", "fonts")

const main = async () => {
  try {
    await access(SOURCE_DIR)
  } catch {
    console.log(
      `Dank Mono not found at ${SOURCE_DIR} — skipping.\n` +
        "The preview will fall back to the next mono in the stack.",
    )
    return
  }

  await mkdir(OUT_DIR, { recursive: true })

  for (const file of FILES) {
    await copyFile(
      join(SOURCE_DIR, file),
      join(OUT_DIR, file),
    )
    console.log(`  ${file}`)
  }

  console.log(
    `\n${FILES.length} files → public/fonts/ (gitignored)`,
  )
}

await main()
