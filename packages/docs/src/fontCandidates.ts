/**
 * The M5 candidate lists — one per axis, no components.
 *
 * Heading and body are separate axes because round one's fixed
 * pairings were the wrong shape: liking a heading and disliking the
 * body it arrived with left nothing to click. Every heading composes
 * with every body, here and in the toolbar.
 */

export type Candidate = {
  /**
   * The `data-heading-font` / `data-body-font` / `data-mono-font`
   * value. `null` means the baseline, and renders as an explicit
   * `"system"` rather than as a missing attribute.
   *
   * That distinction is load-bearing. Modelling the baseline as
   * "omit the attribute and inherit" worked only while the toolbar
   * defaults were themselves `system`; once they became the owner's
   * picks, every row labelled "System" inherited the winner from
   * `<html>` and showed it under the baseline's name.
   */
  readonly id: string | null
  readonly name: string
  readonly foundry: string
  /** The trade, not the sales pitch. */
  readonly note: string
}

export const HEADINGS: readonly Candidate[] = [
  {
    id: null,
    name: "System",
    foundry: "—",
    note: "Today's baseline: no display family at all, just the body face at a heavier weight.",
  },
  {
    id: "fraunces",
    name: "Fraunces",
    foundry: "Undercase Type · US",
    note: "Variable display serif with an optical-size axis, so a large heading gets the display cut automatically.",
  },
  {
    id: "fraunces-soft",
    name: "Fraunces Soft",
    foundry: "Undercase Type · US",
    note: "The same face with SOFT at 100 and WONK on — blunted terminals and the cursive-influenced single-storey forms. A rounder serif drawn by the designer rather than faked with a stroke effect, and the more honest answer to 'rounder' than swapping families.",
  },
  {
    id: "bricolage",
    name: "Bricolage Grotesque",
    foundry: "Mathieu Triay · UK",
    note: "Fancy without going serif. The wonk either reads as character or as a rendering fault.",
  },
  {
    id: "baloo",
    name: "Baloo 2",
    foundry: "Vernon Adams / Cyreal",
    note: "Fully rounded terminals at heavy weights — the roundest thing here that still reads as a heading. Warm to the point of informal: watch whether a failing rip announced in it reads as friendly rather than as urgent.",
  },
  {
    id: "inter",
    name: "Inter",
    foundry: "Rasmus Andersson · Sweden",
    note: "The no-display-face option: same family as the body, weight doing all the work.",
  },
  {
    id: "source-sans-3",
    name: "Source Sans 3",
    foundry: "Adobe · US",
    note: "As above, but the face image-viewer already runs.",
  },
]

/**
 * Monospace. Became an axis once the owner named a specific face
 * rather than accepting the house default.
 *
 * Dank Mono is the pick and the others are the licensable fallback
 * plan, not rival proposals — see `dankMono.css` for why a paid font
 * cannot simply be committed to a public design system.
 */
export const MONOS: readonly Candidate[] = [
  {
    id: "dank-mono",
    name: "Dank Mono",
    foundry: "Grazil Ltd · UK · paid",
    note: "The owner's editor font, and the pick. Ligatures plus a genuinely cursive italic — the thing the free monos mostly lack. The catch is distribution, not licensing: the EULA covers using it across the whole fleet, but forbids redistributing it, and this repo is public. Rendering here only because the woff2 were copied off the NAS by a script and gitignored.",
  },
  {
    id: "victor-mono",
    name: "Victor Mono",
    foundry: "Rune Bjørnerås · Norway · OFL",
    note: "The closest open-licence analogue: cursive italics and ligatures both. Narrower and sharper than Dank Mono, and the only candidate here that could actually ship inside a public package while keeping the cursive.",
  },
  {
    id: "fira-code",
    name: "Fira Code",
    foundry: "Nikita Prokopov / Mozilla · OFL",
    note: "The largest ligature set of the four, and the most widely recognised. No cursive italic — its italic is an obliqued roman.",
  },
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    foundry: "JetBrains · Czech Republic · OFL",
    note: "Round one's mono, here because it is worth knowing it already has ligatures — if ligatures were the whole ask, this was always going to satisfy it. Tall x-height makes it the most legible of the four at kiosk distance.",
  },
  {
    id: null,
    name: "System",
    foundry: "—",
    note: "Today's baseline: ui-monospace, no ligatures, different on every machine.",
  },
]

export const BODIES: readonly Candidate[] = [
  {
    id: null,
    name: "System",
    foundry: "—",
    note: "What ships today. Segoe on the Windows boxes, Roboto on the Pis — the design system has no typographic opinion at all.",
  },
  {
    id: "nunito",
    name: "Nunito",
    foundry: "Vernon Adams / Cyreal",
    note: "Actual rounded terminals, and the roundest face here that is still a genuine UI workhorse: 200–1000 weights and a big x-height, so it survives 13px in a dense list.",
  },
  {
    id: "dm-sans",
    name: "DM Sans",
    foundry: "Colophon Foundry · UK",
    note: "Low-contrast geometric with very circular bowls, drawn tight. Round via the skeleton rather than the terminals — the round option that stays closest to a neutral UI face.",
  },
  {
    id: "figtree",
    name: "Figtree",
    foundry: "Erik Kennedy · US",
    note: "Friendly geometric-humanist, drawn for interfaces rather than adapted to them. Rounder than Inter without reading as soft.",
  },
  {
    id: "rubik",
    name: "Rubik",
    foundry: "Hubert & Fischer · Germany",
    note: "Rounded corners rather than rounded terminals — the subtlest option here, and the one most likely to survive a 16-bay list at compact density.",
  },
  {
    id: "outfit",
    name: "Outfit",
    foundry: "Rodrigo Fuenzalida · Chile",
    note: "Geometric with wide circular bowls. Rounder and more open than DM Sans, at the cost of running wider — which a dense table will notice.",
  },
  {
    id: "nunito-sans",
    name: "Nunito Sans",
    foundry: "Vernon Adams / Cyreal",
    note: "Nunito without the rounded terminals. Here as the control: flipping between the two shows how much of 'rounder' is the terminals and how much is the humanist skeleton under them.",
  },
  {
    id: "quicksand",
    name: "Quicksand",
    foundry: "Andrew Paglinawan · Philippines",
    note: "The roundest possible answer, and the upper bound rather than a real proposal — geometric circles, a low x-height and light strokes are exactly what a dense bay list does not want. Here so the others have something to be measured against.",
  },
  {
    id: "inter",
    name: "Inter",
    foundry: "Rasmus Andersson · Sweden",
    note: "Round one's neutral, kept as the reference point for 'boring but safe'.",
  },
  {
    id: "source-sans-3",
    name: "Source Sans 3",
    foundry: "Adobe · US",
    note: "The fleet-consistency reference: what image-viewer runs.",
  },
]
