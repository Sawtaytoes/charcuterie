/**
 * Pulls the M5 font candidates down from Google Fonts as
 * **self-hosted** woff2 plus a local `@font-face` sheet.
 *
 * Self-hosted, not CDN-linked, because the fleet already settled
 * that question once: image-viewer's
 * `2026-06-30-self-host-fonts-locally` is locked, and a kiosk Pi
 * that waits on fonts.gstatic.com before it can paint text is the
 * same round-trip that decision removed. A design system that
 * ships a CDN dependency hands that cost to every consumer.
 *
 * Latin only. The fleet is an English-language homelab, and the
 * Cyrillic/Greek/Vietnamese slices are dead bytes on an ePaper
 * display.
 *
 * Run: `node scripts/fetchCandidateFonts.ts` from `packages/docs`.
 * Idempotent — re-running overwrites, so it doubles as the
 * refresh path when a candidate is added or dropped.
 */

import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * A modern-browser UA is load-bearing: the css2 endpoint content-
 * negotiates, and Node's default UA gets TrueType back instead of
 * woff2.
 */
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"

/**
 * Every candidate family, with the variable axis range we
 * actually use. Requesting a range (`100..900`) rather than a
 * list gets one variable file per subset instead of nine static
 * ones.
 */
const FAMILIES = [
  // ── Heading candidates ──────────────────────────────────────
  // Undercase Type (US). The display serif — `opsz` drives the
  // optical size, so headings get the display cut for free, and
  // `SOFT` is a genuine roundness axis rather than a weight trick.
  "Fraunces:opsz,wght,SOFT,WONK@9..144,100..900,0..100,0..1",
  // Mathieu Triay (UK). The expressive grotesque.
  "Bricolage+Grotesque:opsz,wght@12..96,200..800",
  // Vernon Adams / Cyreal. Rounded terminals on a *display* serif-
  // adjacent face — the roundest thing that still reads as a
  // heading rather than as a children's book.
  "Baloo+2:wght@400..800",

  // ── Body candidates: the round ones ─────────────────────────
  // Vernon Adams / Cyreal. Actual rounded terminals — the roundest
  // face here that is still a real UI workhorse.
  "Nunito:wght@200..1000",
  // The same family's non-rounded sibling, as the control: it
  // isolates how much of "rounder" is the terminals versus the
  // humanist skeleton underneath them.
  "Nunito+Sans:opsz,wght@6..12,200..1000",
  // Colophon Foundry (UK). Geometric, low contrast, very circular
  // bowls. Round via the skeleton rather than via the terminals.
  "DM+Sans:opsz,wght@9..40,100..1000",
  // Erik Kennedy (US). Friendly geometric-humanist, drawn for UI.
  "Figtree:wght@300..900",
  // Hubert & Fischer (Germany). Slightly rounded *corners* — the
  // subtlest of the round options, and the safest at 13px.
  "Rubik:wght@300..900",
  // Rodrigo Fuenzalida (Chile). Geometric and wide-bowled.
  "Outfit:wght@100..900",
  // Andrew Paglinawan (Philippines). The roundest possible answer,
  // and included as the upper bound rather than as a real
  // proposal — low x-height and light strokes are the opposite of
  // what a dense bay list wants.
  "Quicksand:wght@300..700",

  // ── Reference bodies, carried over from round one ────────────
  // Rasmus Andersson (Sweden). The screen-first neutral.
  "Inter:wght@100..900",
  // Adobe (US). What image-viewer already runs, one major on.
  "Source+Sans+3:wght@200..900",
  // US Web Design System (US government, public domain).
  "Public+Sans:wght@100..900",

  // ── Mono candidates ─────────────────────────────────────────
  // Dank Mono is the owner's pick but cannot live here: it is paid,
  // and its EULA forbids redistribution from a public repo. See
  // `installDankMono.ts`. These three are the licensable fallbacks,
  // and all of them ship contextual-alternate ligatures.
  //
  // Rune Bjørnerås (Norway). Cursive italics plus ligatures — the
  // closest open-licence analogue to Dank Mono's defining trick.
  "Victor+Mono:ital,wght@0,100..700;1,100..700",
  // Nikita Prokopov (Fira Code) on Mozilla's Fira Mono. The largest
  // ligature set of the three, no cursive.
  "Fira+Code:wght@300..700",
  // JetBrains (Czech Republic). Round one's mono — already has
  // ligatures, which is worth knowing before switching for them.
  "JetBrains+Mono:ital,wght@0,100..800;1,100..800",
]

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, "..", "public", "fonts")

/** `/* latin *\/` and `/* latin-ext *\/` blocks only. */
const isLatinBlock = (block: string) =>
  /\/\*\s*latin(-ext)?\s*\*\//.test(block)

const slugify = (url: string) => {
  const [family, , file] = url.split("/").slice(-3)
  return `${family}-${file}`
}

const main = async () => {
  await mkdir(OUT_DIR, { recursive: true })

  const sheets: string[] = []

  for (const family of FAMILIES) {
    const href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`
    const response = await fetch(href, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
    })

    if (!response.ok) {
      throw new Error(
        `${family}: ${response.status} from css2`,
      )
    }

    const css = await response.text()

    /**
     * Split on the subset comments Google emits, so each
     * `@font-face` keeps the `unicode-range` that belongs to it.
     * Dropping a block is safe; rewriting one is not.
     */
    const blocks = css
      .split(/(?=\/\*\s*[a-z-]+\s*\*\/)/)
      .filter(isLatinBlock)

    if (blocks.length === 0) {
      throw new Error(
        `${family}: no latin subset in the response`,
      )
    }

    for (const block of blocks) {
      let rewritten = block
      const urls = [
        ...block.matchAll(/url\((https:[^)]+\.woff2)\)/g),
      ]

      for (const [, url] of urls) {
        const name = slugify(url)
        const file = await fetch(url, {
          headers: { "User-Agent": BROWSER_USER_AGENT },
        })

        if (!file.ok) {
          throw new Error(
            `${name}: ${file.status} from gstatic`,
          )
        }

        await writeFile(
          join(OUT_DIR, name),
          Buffer.from(await file.arrayBuffer()),
        )
        rewritten = rewritten.replace(url, `/fonts/${name}`)
        console.log(`  ${name}`)
      }

      sheets.push(rewritten.trim())
    }

    console.log(
      `${family.split(":")[0].replaceAll("+", " ")} ✓`,
    )
  }

  const header = [
    "/* GENERATED by scripts/fetchCandidateFonts.ts — do not hand-edit.",
    " *",
    " * Self-hosted woff2 for the M5 font bake-off. Latin subsets",
    " * only. Re-run the script to refresh or to add a candidate.",
    " */",
    "",
  ].join("\n")

  await writeFile(
    join(OUT_DIR, "candidates.css"),
    `${header}${sheets.join("\n\n")}\n`,
  )
  console.log(
    `\n${sheets.length} @font-face blocks → public/fonts/candidates.css`,
  )
}

await main()
