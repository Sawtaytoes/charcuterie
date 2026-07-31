/**
 * M6g — the widened ePaper flat-fill palette, on a page.
 *
 * Per `docs/runbooks/ui-design-previews.md`: mock in HTML, serve,
 * `devshare`, owner looks, *then* it counts. Same rule the M0
 * bake-off board followed, and the same trick that makes it more
 * than a mockup — **every colour here is read out of
 * `src/epaper.ts`**, not typed into this file. If a blend changes,
 * the board changes; there is nothing to keep in sync.
 *
 * The checkerboards are real. A blend is authored as one flat hex
 * and the panel-side quantizer turns it into a 50/50 A-B-A-B
 * pattern of two inks — verified by pushing all fifteen pairs
 * through castkit's `ditherToPanel` over a flat field and counting
 * pixels. So the board draws the pattern the panel draws, at true
 * scale *and* magnified, rather than showing the flat hex and
 * asking anyone to imagine it.
 *
 * Output is one self-contained `.html` — no build step, no CDN.
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  epaperPanels,
  getIsReachableBlend,
  monoBlends,
  spectra6Blends,
} from "../src/epaper.ts"

const scriptDirectory = dirname(
  fileURLToPath(import.meta.url),
)

const spectra6 = epaperPanels.spectra6
const mono = epaperPanels.mono

if (
  spectra6.family !== "fixedInk" ||
  mono.family !== "fixedInk"
) {
  throw new Error("both fleet panels are fixed-ink")
}

// ---------------------------------------------------------------
// Colour maths — only for the *recorded* numbers on the page
// ---------------------------------------------------------------

const toChannels = (hex: string) => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
]

const toHex = (channels: number[]) =>
  `#${channels
    .map((channel) =>
      Math.round(channel)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase(),
    )
    .join("")}`

const toLinear = (channel: number) => {
  const scaled = channel / 255

  return scaled <= 0.04045
    ? scaled / 12.92
    : ((scaled + 0.055) / 1.055) ** 2.4
}

const toEncoded = (linear: number) => {
  const scaled =
    linear <= 0.0031308
      ? linear * 12.92
      : 1.055 * linear ** (1 / 2.4) - 0.055

  return Math.round(scaled * 255)
}

/**
 * What the eye receives from a 50/50 checkerboard: the
 * **linear-light** mix of the two *emitted* inks, because reflected
 * light adds linearly. Different arithmetic from the authored
 * midpoint on purpose — that one is in the quantizer's encoded
 * space, this one is in the world's.
 *
 * A computation, not a measurement. Nobody has photographed a panel
 * showing these.
 */
const getPerceivedColour = ({
  emittedA,
  emittedB,
}: {
  emittedA: string
  emittedB: string
}) => {
  const channelsB = toChannels(emittedB)

  return toHex(
    toChannels(emittedA).map((channel, channelIndex) =>
      toEncoded(
        (toLinear(channel) +
          toLinear(channelsB[channelIndex])) /
          2,
      ),
    ),
  )
}

const getRelativeLuminance = (hex: string) => {
  const [red, green, blue] = toChannels(hex).map(toLinear)

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

const getContrastRatio = ({
  colourA,
  colourB,
}: {
  colourA: string
  colourB: string
}) => {
  const [lighter, darker] = [
    getRelativeLuminance(colourA),
    getRelativeLuminance(colourB),
  ].sort((first, second) => second - first)

  return (lighter + 0.05) / (darker + 0.05)
}

// ---------------------------------------------------------------
// Blend bookkeeping
// ---------------------------------------------------------------

const splitBlendKey = (blendKey: string) => {
  const boundary = blendKey.search(/[A-Z]/)

  return [
    blendKey.slice(0, boundary),
    blendKey.slice(boundary).toLowerCase(),
  ]
}

type BlendRow = {
  blendKey: string
  inkNameA: string
  inkNameB: string
  inkA: string
  inkB: string
  authored: string
  perceived: string
  blackOnIt: number
}

const buildBlendRows = ({
  blends,
  inks,
  emittedInks,
}: {
  blends: Record<string, string>
  inks: Record<string, string>
  emittedInks: Record<string, string>
}): BlendRow[] =>
  Object.entries(blends).map(([blendKey, authored]) => {
    const [inkNameA, inkNameB] = splitBlendKey(blendKey)

    const perceived = getPerceivedColour({
      emittedA: emittedInks[inkNameA],
      emittedB: emittedInks[inkNameB],
    })

    return {
      blendKey,
      inkNameA,
      inkNameB,
      authored,
      perceived,
      blackOnIt: getContrastRatio({
        colourA: "#000000",
        colourB: perceived,
      }),
      inkA: inks[inkNameA],
      inkB: inks[inkNameB],
    }
  })

const spectra6Rows = buildBlendRows({
  blends: spectra6Blends,
  inks: spectra6.inks,
  emittedInks: spectra6.emittedInks,
})

const monoRows = buildBlendRows({
  blends: monoBlends,
  inks: mono.inks,
  emittedInks: mono.emittedInks,
})

/**
 * The two pairs that do not survive, and what the panel puts up
 * instead. Derived, so this section cannot claim a rejection the
 * code does not actually make.
 */
const rejectedPairs = Object.keys(spectra6.inks)
  .flatMap((inkNameA, indexA) =>
    Object.keys(spectra6.inks)
      .slice(indexA + 1)
      .map((inkNameB) => [inkNameA, inkNameB] as const),
  )
  .filter(
    (inkNames) =>
      !getIsReachableBlend({
        inks: spectra6.inks,
        inkNames,
      }),
  )

const REJECTION_REASON: Record<string, string> = {
  "black+yellow":
    "green and red both sit closer to the midpoint than either parent does, so the panel puts up a red/green checkerboard instead — which is <code>redGreen</code>, a blend that already exists.",
  "yellow+blue":
    "the midpoint is chroma 26, exactly the neutral guard, so castkit dithers it against black and white only. Nudging the chroma past the guard does not help: green and red are still nearer than yellow or blue, and the result becomes a three-ink mush.",
}

// ---------------------------------------------------------------
// Markup
// ---------------------------------------------------------------

const checkerStyle = ({
  inkA,
  inkB,
  cellSize,
}: {
  inkA: string
  inkB: string
  cellSize: number
}) =>
  [
    `background-color:${inkB}`,
    `background-image:linear-gradient(45deg,${inkA} 25%,transparent 25%,transparent 75%,${inkA} 75%),linear-gradient(45deg,${inkA} 25%,transparent 25%,transparent 75%,${inkA} 75%)`,
    `background-size:${cellSize * 2}px ${cellSize * 2}px`,
    `background-position:0 0,${cellSize}px ${cellSize}px`,
  ].join(";")

const buildBlendCard = (row: BlendRow) => `
    <article class="card">
      <div class="card__swatches">
        <div class="swatch swatch--true" style="${checkerStyle({ inkA: row.inkA, inkB: row.inkB, cellSize: 1 })}">
          <span class="swatch__tag">on the panel</span>
        </div>
        <div class="swatch swatch--zoom" style="${checkerStyle({ inkA: row.inkA, inkB: row.inkB, cellSize: 8 })}">
          <span class="swatch__tag">×8</span>
        </div>
      </div>
      <h3 class="card__name">${row.blendKey}</h3>
      <dl class="card__facts">
        <dt>author</dt><dd><code>${row.authored}</code></dd>
        <dt>inks</dt><dd>${row.inkNameA} + ${row.inkNameB}</dd>
        <dt>perceived</dt>
        <dd>
          <span class="dot" style="background:${row.perceived}"></span>
          <code>${row.perceived}</code>
        </dd>
        <dt>black on it</dt><dd>${row.blackOnIt.toFixed(2)}</dd>
      </dl>
    </article>`

const buildInkCard = ({
  inkName,
  ink,
  emitted,
}: {
  inkName: string
  ink: string
  emitted: string
}) => `
    <article class="card card--ink">
      <div class="card__swatches">
        <div class="swatch swatch--true" style="background:${ink}">
          <span class="swatch__tag">authored</span>
        </div>
        <div class="swatch swatch--zoom" style="background:${emitted}">
          <span class="swatch__tag">emitted</span>
        </div>
      </div>
      <h3 class="card__name">${inkName}</h3>
      <dl class="card__facts">
        <dt>author</dt><dd><code>${ink}</code></dd>
        <dt>emitted</dt><dd><code>${emitted}</code></dd>
        <dt>black on it</dt>
        <dd>${
          emitted === "#000000"
            ? "&mdash;"
            : getContrastRatio({
                colourA: "#000000",
                colourB: emitted,
              }).toFixed(2)
        }</dd>
      </dl>
    </article>`

/**
 * A 1px-tall rule has **one row** for the dither to work in, so the
 * pattern degenerates from a checkerboard to an alternation along
 * x — which is a dotted line, not a line. Drawn as the 1-D
 * repeating gradient it actually becomes rather than as a squashed
 * 2-D checkerboard, because the squashed version would be a
 * flattering lie.
 */
const dottedRuleStyle = ({
  inkA,
  inkB,
  cellSize,
}: {
  inkA: string
  inkB: string
  cellSize: number
}) =>
  `background-image:repeating-linear-gradient(90deg,${inkA} 0 ${cellSize}px,${inkB} ${cellSize}px ${cellSize * 2}px)`

const primitiveDemo = (() => {
  const row = spectra6Rows.find(
    (candidate) => candidate.blendKey === "yellowRed",
  ) as BlendRow

  return `
  <div class="primitives">
    <div class="primitives__panel" style="background:${spectra6.inks.white}">
      <p class="primitives__label">
        A large fill in <code>yellowRed</code> &mdash; what blends are for. The 1px
        checkerboard has room to average, and the eye receives the mix.
      </p>
      <div class="fill" style="${checkerStyle({ inkA: row.inkA, inkB: row.inkB, cellSize: 1 })}"></div>
    </div>
    <div class="primitives__panel" style="background:${spectra6.inks.white}">
      <p class="primitives__label">
        The <em>same</em> colour as a 1px rule and as 11px text &mdash; what it is
        <strong>not</strong> for. One row of pixels leaves the dither nowhere to go.
      </p>
      <div class="hairline" style="${dottedRuleStyle({ inkA: row.inkA, inkB: row.inkB, cellSize: 1 })}"></div>
      <p class="primitives__caption">&uarr; the 1px rule: a dotted line, not a line</p>
      <div class="hairline hairline--zoom" style="${dottedRuleStyle({ inkA: row.inkA, inkB: row.inkB, cellSize: 8 })}"></div>
      <p class="primitives__caption">&uarr; the same rule at &times;8</p>
      <p class="tiny" style="${checkerStyle({ inkA: row.inkA, inkB: row.inkB, cellSize: 1 })};-webkit-background-clip:text;background-clip:text;color:transparent">Rip 1.2.5 — bay 14 — 41%</p>
      <p class="tiny" style="color:${spectra6.inks.black}">Rip 1.2.5 — bay 14 — 41% <span class="tiny__note">(the same line in a single ink)</span></p>
    </div>
  </div>`
})()

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ePaper flat-fill palette — 6 inks, 19 colours</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 2.5rem clamp(1rem, 4vw, 3rem) 5rem;
    background: #F4F5F6;
    color: #14181D;
    font: 15px/1.55 ui-sans-serif, system-ui, sans-serif;
  }
  h1 { font-size: 1.9rem; margin: 0 0 .4rem; letter-spacing: -.02em; }
  h2 {
    font-size: 1.15rem;
    margin: 3rem 0 .35rem;
    padding-block-end: .5rem;
    border-block-end: 1px solid #D4D8DC;
  }
  p.lede { margin: 0 0 .25rem; max-inline-size: 74ch; color: #3C444D; }
  p.note { margin: .5rem 0 0; max-inline-size: 74ch; color: #5A636D; font-size: .875rem; }
  code { font-family: ui-monospace, monospace; font-size: .84em; background: #E4E7EA; padding: .1em .35em; border-radius: 3px; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(184px, 1fr));
    gap: 1rem;
    margin-block-start: 1.25rem;
  }
  .card {
    background: #FFF;
    border: 1px solid #D9DDE1;
    border-radius: 8px;
    overflow: hidden;
  }
  .card--ink { border-color: #14181D; }
  .card__swatches { display: grid; grid-template-columns: 1fr 1fr; block-size: 96px; }
  .swatch { position: relative; }
  .swatch--zoom { border-inline-start: 1px solid #FFF; }
  .swatch__tag {
    position: absolute;
    inset-block-end: 4px;
    inset-inline-start: 5px;
    font-size: 9px;
    letter-spacing: .04em;
    text-transform: uppercase;
    background: rgba(255,255,255,.86);
    color: #14181D;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .card__name { margin: .6rem .75rem .35rem; font-size: .95rem; font-family: ui-monospace, monospace; }
  .card__facts {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: .1rem .5rem;
    margin: 0 .75rem .75rem;
    font-size: .78rem;
    color: #4A525B;
  }
  .card__facts dt { color: #8B939B; }
  .card__facts dd { margin: 0; display: flex; align-items: center; gap: .3rem; }
  .dot { inline-size: 10px; block-size: 10px; border-radius: 50%; border: 1px solid #0002; }
  table { border-collapse: collapse; margin-block-start: 1rem; font-size: .84rem; }
  th, td { text-align: start; padding: .4rem .8rem .4rem 0; border-block-end: 1px solid #E2E5E8; vertical-align: top; }
  th { color: #8B939B; font-weight: 600; }
  td.reason { max-inline-size: 52ch; color: #4A525B; }
  .primitives { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-block-start: 1.25rem; }
  .primitives__panel { padding: 1rem 1.15rem 1.4rem; border: 1px solid #D9DDE1; border-radius: 8px; }
  .primitives__label { margin: 0 0 .8rem; font-size: .8rem; color: #3C444D; }
  .fill { block-size: 92px; border-radius: 4px; }
  .hairline { block-size: 1px; }
  .hairline--zoom { block-size: 8px; }
  .primitives__caption { margin: .25rem 0 1.1rem; font-size: .72rem; color: #6C757E; }
  .tiny { font-size: 11px; margin: 0 0 .5rem; font-weight: 600; }
  .tiny__note { font-weight: 400; opacity: .55; }
  .panelfam { margin-block-start: 1rem; }
</style>
</head>
<body>

<h1>ePaper flat-fill palette — six inks, nineteen colours</h1>
<p class="lede">
  <strong>Six is what one <em>pixel</em> can be, not what the panel can show.</strong>
  Every swatch below is read out of <code>packages/tokens/src/epaper.ts</code>. The
  checkerboards are drawn at the panel&rsquo;s real 1px cell, and again at &times;8 so the
  structure is visible; a blend is authored as one flat hex and the panel-side quantizer
  produces the pattern &mdash; measured 50.0% / 50.0% through castkit&rsquo;s real
  <code>ditherToPanel</code>, for every pair here.
</p>

<h2>The six inks &mdash; what a pixel can be</h2>
<p class="note">
  Authored is the value the quantizer maps 1:1. Emitted is the muted tone the physical
  ink produces, which is what the eye receives and what the contrast number is measured
  against.
</p>
<div class="grid">${Object.keys(spectra6.inks)
  .map((inkName) =>
    buildInkCard({
      inkName,
      ink: spectra6.inks[inkName],
      emitted: spectra6.emittedInks[inkName],
    }),
  )
  .join("")}
</div>

<h2>The thirteen blends &mdash; what a <em>fill</em> can be</h2>
<p class="note">
  Fills and large areas only. Keys name the ink pair rather than the colour, because
  &ldquo;perceived&rdquo; is a computation &mdash; a linear-light mix of the two emitted
  inks &mdash; and not a photograph of a panel.
</p>
<div class="grid">${spectra6Rows.map(buildBlendCard).join("")}
</div>

<h2>The two that do not survive</h2>
<table>
  <thead><tr><th>pair</th><th>authored midpoint</th><th>what the panel puts up instead</th></tr></thead>
  <tbody>${rejectedPairs
    .map(([inkNameA, inkNameB]) => {
      const key = `${inkNameA}+${inkNameB}`

      return `
    <tr>
      <td><code>${inkNameA} + ${inkNameB}</code></td>
      <td><code>${toHex(
        toChannels(spectra6.inks[inkNameA]).map(
          (channel, channelIndex) =>
            (channel +
              toChannels(spectra6.inks[inkNameB])[
                channelIndex
              ]) /
            2,
        ),
      )}</code></td>
      <td class="reason">${REJECTION_REASON[key] ?? ""}</td>
    </tr>`
    })
    .join("")}
  </tbody>
</table>
<p class="note">
  Both are absent from <code>spectra6Blends</code> rather than present and wrong. A token
  that silently renders as a different pair is worse than one that does not exist.
</p>

<h2>Why the six-ink rule still holds for small geometry</h2>
<p class="note">
  &ldquo;While more complex algorithms like Rotated Bayer or Error Diffusion are excellent
  for photographic gradients, <strong>they often struggle with small-scale graphical
  primitives</strong> &hellip; introduced noticeable geometric artifacts that distracted
  from the clean lines of the UI elements.&rdquo; &mdash; <em>Beyond 6 Colors</em>. A 1px
  rule made of a 1px checkerboard is half a line; small text made of one is a smear.
</p>
${primitiveDemo}

<h2>The mono panel</h2>
<p class="note">
  The Inky pHAT is 1-bit and pure &mdash; two inks, one blend, which is a grey it has no
  ink for.
</p>
<div class="grid">${monoRows.map(buildBlendCard).join("")}
</div>

<h2>Panel families</h2>
<table class="panelfam">
  <thead><tr><th>panel</th><th>family</th><th>colour constraint</th><th>in the fleet</th></tr></thead>
  <tbody>
    <tr><td><code>spectra6</code></td><td>fixedInk</td><td>6 inks, 13 blends</td><td>yes &mdash; 7.3&Prime; E6 + 2 &times; 13.3&Prime; E673</td></tr>
    <tr><td><code>mono</code></td><td>fixedInk</td><td>2 inks, 1 blend</td><td>yes &mdash; Inky pHAT</td></tr>
    <tr><td><code>gallery3</code></td><td>continuousTone</td><td class="reason">none &mdash; roughly 50,000 colours natively (4-particle ACeP). No fixed ink set, so no palette to get wrong. It carries no <code>inks</code> and no <code>blends</code>, and the type makes forcing it through a six-hex set unrepresentable.</td><td>no &mdash; shopping list only</td></tr>
  </tbody>
</table>

</body>
</html>
`

const outputPath = join(
  scriptDirectory,
  "..",
  "preview",
  "epaper-palette.html",
)

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, html, "utf8")

console.log(
  `wrote ${outputPath} — ${Object.keys(spectra6.inks).length} inks + ${spectra6Rows.length} blends`,
)
