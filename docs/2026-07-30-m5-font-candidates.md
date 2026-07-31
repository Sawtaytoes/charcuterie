# 2026-07-30 — M5: the font bake-off

**Status:** open — awaiting the owner's pick. Nothing is wired into
`@charcuterie/tokens` yet, and nothing should be until the faces are chosen.

**Settled so far (2026-07-30):** headings get their own display face, with a plainer
body under it. Round one's body candidates read as too boring, so round two adds seven
**rounder** sans options and splits heading and body into independent axes.

## The gap

Charcuterie ships **no typeface**. `defaultTypography.fontFamily` in
`packages/tokens/src/variantDefaults.ts` is a pure system stack for both `sans` and
`mono`, and all four variants (`daylight`, `hairline`, `layered`, `legible`) spread
`defaultTypography` without overriding a single typography key. M0 held type constant on
purpose — the bake-off was about colour, density and motion, and a fifth axis would have
muddied it — but the consequence is that the design system currently renders in Segoe on
the Windows boxes and Roboto on the Pis. It has no typographic opinion at all.

There is also **no display/heading family token**. `TypographyTokens.fontFamily` has
exactly two slots, `sans` and `mono`; headings today are the body face at a heavier
weight.

## What the rest of the fleet does

| Repo | Font |
| --- | --- |
| `image-viewer` | **Source Sans Pro**, self-hosted, two locked decisions behind it |
| `mux-magic` | none — no `font-family` declared anywhere |
| `xander` | `Trebuchet MS` / system, per-page, ad hoc |

image-viewer is the only app that ever had an opinion, and it also already settled the
delivery question: [self-host the woff2, never the Google CDN][self-host]. That rule is
inherited here rather than re-litigated — a kiosk Pi waiting on `fonts.gstatic.com`
before it can paint is exactly the round-trip that decision removed, and a *design
system* that ships a CDN dependency hands that cost to every consumer at once.

[self-host]: ../../image-viewer/docs/decisions/2026-06-30-self-host-fonts-locally.md

## The candidates — two axes, not pairings

Round one shipped five fixed *pairings*. That was the wrong shape: liking a heading and
disliking the body it arrived with left nothing to click. Heading and body are now
**independent axes** — `data-heading-font` drives `--font-display`, `data-body-font`
drives `--font-sans` — so all 7 x 10 combinations are reachable from the toolbar.

All self-hosted woff2, latin + latin-ext only, fetched by
`packages/docs/scripts/fetchCandidateFonts.ts` (idempotent — re-run to refresh or to add
a candidate). Every family was vetted against the workspace's
[avoid-Chinese-origin-software constraint][origin]; all are EU/US/UK/LatAm/SEA.

[origin]: ../../agentic/docs/decisions/2026-06-23-avoid-chinese-origin-software.md

### Headings (`--font-display`)

| `data-heading-font` | Face | Foundry | The trade |
| --- | --- | --- | --- |
| *(none)* | System | — | No display family at all: the body face, bolder. The baseline. |
| `fraunces` | Fraunces | Undercase Type · US | Variable display serif, `opsz` axis, so a large heading gets the display cut automatically. |
| `fraunces-soft` | Fraunces Soft | Undercase Type · US | The same face with `SOFT` 100 and `WONK` 1. A **rounder serif drawn by the designer** rather than faked with a stroke effect — the honest answer to "rounder" that doesn't change families. |
| `bricolage` | Bricolage Grotesque | Mathieu Triay · UK | Fancy without going serif. The wonk reads as character or as a rendering fault. |
| `baloo` | Baloo 2 | Vernon Adams / Cyreal | Fully rounded terminals; the roundest thing that still reads as a heading. Warm to the point of informal — watch whether a failing rip announced in it reads as friendly rather than urgent. |
| `inter` / `source-sans-3` | — | — | The no-display-face options: same family as the body, weight doing the work. |

### Bodies (`--font-sans`), roundest-workhorse first

| `data-body-font` | Face | Foundry | The trade |
| --- | --- | --- | --- |
| *(none)* | System | — | Today's baseline. Different on every machine. |
| `nunito` | Nunito | Vernon Adams / Cyreal | Actual rounded terminals, and the roundest face here that is still a real UI workhorse — 200–1000 weights, big x-height, survives 13px. |
| `dm-sans` | DM Sans | Colophon Foundry · UK | Circular bowls, drawn tight. Round via the skeleton, not the terminals; stays closest to a neutral UI face. |
| `figtree` | Figtree | Erik Kennedy · US | Friendly geometric-humanist, drawn for interfaces. Rounder than Inter without reading soft. |
| `rubik` | Rubik | Hubert & Fischer · Germany | Rounded *corners* rather than terminals. The subtlest option, most likely to survive a 16-bay list at compact density. |
| `outfit` | Outfit | Rodrigo Fuenzalida · Chile | Wide circular bowls. Rounder and more open than DM Sans, at the cost of running wider — a dense table will notice. |
| `nunito-sans` | Nunito Sans | Vernon Adams / Cyreal | The **control**: Nunito minus the rounded terminals, so flipping between the two isolates how much of "rounder" is terminals versus skeleton. |
| `quicksand` | Quicksand | Andrew Paglinawan · Philippines | The roundest possible answer, included as the **upper bound rather than a proposal** — geometric circles, low x-height and light strokes are what a dense bay list least wants. |
| `inter` / `source-sans-3` | — | — | Round one's references: "boring but safe", and what image-viewer runs. |

JetBrains Mono (JetBrains · Czech Republic) is the mono throughout, deliberately **not**
an axis: a tabular byte count changing family between blocks would be a second variable
in a comparison that already has two.

## How to look at it

`yarn workspace @charcuterie/docs storybook` (port 6006 unless taken), then either:

- **Tokens → Fonts** — two lists. Each pins its own axis and lets the other float to
  whatever the toolbar says, so picking a heading and then scanning bodies under it is
  one toolbar click rather than a rebuild.
- **the `Heading` and `Body` toolbar axes** — re-font *every other story* in the canvas.
  The in-situ view. They compose with Density, Variant and Scheme, so a candidate can be
  judged at `density=kiosk` (across a room) or `compact` (ripdeck's bay list), which is
  where the differences actually bite.

The specimen deliberately uses real product text — `04:12:38`, `41.2 GB`, `Bay 07` —
rather than pangrams. A face that looks lovely over "Handgloves" and falls apart on a
tabular byte count fails on the surface the fleet actually has.

## What happens after the pick

1. The winning family's woff2 moves out of `packages/docs/public/fonts` into a
   package consumers can reach, and the `@font-face` sheet ships with it. `packages/docs`
   is the Storybook host — nobody installs it, so nothing there is deliverable.
2. `fontFamily.sans` (and `mono`, if JetBrains Mono is kept) get real values in
   `defaultTypography`.
3. `fontFamily.display` is added to `TypographyTokens`, `buildVariantProperties` emits
   `--font-display`, and the Tailwind bridge gets a `font-display` namespace entry. This
   step was conditional in round one; the owner has since settled that headings do get
   their own face, so it is now expected work rather than a branch.
4. A decision record, with the losing candidates named and why — the M0 pattern, where
   the three losing variants survive as live `data-variant` values rather than deleted
   files.
5. `packages/docs/src/styles/fontCandidates.css`, `FontSpecimen*`,
   `HeadingCandidateRow`, `BodyCandidateBlock`, `fontCandidates.ts`, both toolbar axes
   and the non-winning woff2 all delete.

## Open questions for the owner

- **Do headings get their own face?** ~~The real fork.~~ **Settled 2026-07-30:** the
  owner wants a display face for headings with a plainer body under it, so
  `--font-display` is being promoted. Which display face is still open.
- **How round is too round for the body?** The open question now. `nunito` and
  `quicksand` bracket it; `nunito-sans` is the control that isolates the terminals.
- **Does fleet consistency with image-viewer matter?** If yes, Source Sans 3 wins the
  body by default and the round candidates are decoration.
- **ePaper.** The profile removes animation, and it will punish a fine-stroked display
  face too — but there is no ePaper story on this page yet, because `data-profile` is
  orthogonal to the font axis and the bake-off is already four axes deep. Worth a check
  before anything is locked.
