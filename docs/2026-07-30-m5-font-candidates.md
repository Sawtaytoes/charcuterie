# 2026-07-30 — M5: the font bake-off

**Status:** open — awaiting the owner's pick. Nothing is wired into
`@charcuterie/tokens` yet, and nothing should be until a pairing wins.

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

## The five candidates

All self-hosted woff2, latin + latin-ext only, fetched by
`packages/docs/scripts/fetchCandidateFonts.ts` (idempotent — re-run to refresh or to add
a candidate). Every family was vetted against the workspace's
[avoid-Chinese-origin-software constraint][origin]; all five are EU/US/UK.

[origin]: ../../agentic/docs/decisions/2026-06-23-avoid-chinese-origin-software.md

| `data-font` | Pairing | Foundry | The trade |
| --- | --- | --- | --- |
| *(none)* | System | — | Today's baseline. Different on every machine. |
| `source-sans-3` | Source Sans 3 | Adobe · US | Agrees with image-viewer. Calm, narrow, disappears. The least fancy — which is either the point or the objection. |
| `inter` | Inter | Rasmus Andersson · Sweden | Tall x-height, open apertures, holds up at 13px in a dense list. Safe; reads as "a modern app" rather than as ours. |
| `fraunces` | Fraunces + Inter | Undercase Type · US | The fanciest, and the only one giving headings their own face. Variable display serif with an `opsz` axis. Body stays Inter — a serif body in a 16-bay list would be a mistake. |
| `bricolage` | Bricolage Grotesque + Public Sans | Mathieu Triay · UK / USWDS · US | Fancy without going serif. The risk is the mirror of Fraunces': the wonk may read as a rendering fault rather than as a choice. |

JetBrains Mono (JetBrains · Czech Republic) is the mono in all four.

## How to look at it

`yarn workspace @charcuterie/docs storybook` (port 6006 unless taken), then either:

- **Tokens → Fonts** — all five pairings stacked, identical content, one `data-font`
  block each. The comparison view.
- **the `Font` toolbar axis** — re-fonts *every other story* in the canvas. The in-situ
  view. It composes with Density, Variant and Scheme, so a candidate can be judged at
  `density=kiosk` (across a room) or `compact` (ripdeck's bay list), which is where the
  differences actually bite.

The specimen deliberately uses real product text — `04:12:38`, `41.2 GB`, `Bay 07` —
rather than pangrams. A face that looks lovely over "Handgloves" and falls apart on a
tabular byte count fails on the surface the fleet actually has.

## What happens after the pick

1. The winning family's woff2 moves out of `packages/docs/public/fonts` into a
   package consumers can reach, and the `@font-face` sheet ships with it. `packages/docs`
   is the Storybook host — nobody installs it, so nothing there is deliverable.
2. `fontFamily.sans` (and `mono`, if JetBrains Mono is kept) get real values in
   `defaultTypography`.
3. **Only if a two-family pairing wins:** `fontFamily.display` is added to
   `TypographyTokens`, `buildVariantProperties` emits `--font-display`, and the Tailwind
   bridge gets a `font-display` namespace entry. It is invented in
   `packages/docs/src/styles/fontCandidates.css` at preview scope precisely so that
   nothing is built on the guess that headings deserve their own face.
4. A decision record, with the losing candidates named and why — the M0 pattern, where
   the three losing variants survive as live `data-variant` values rather than deleted
   files.
5. `packages/docs/src/styles/fontCandidates.css`, `FontSpecimen*`, the `Font` toolbar axis
   and the non-winning woff2 all delete.

## Open questions for the owner

- **Do headings get their own face?** This is the real fork. Three candidates say no
  (one family, weight does the work); Fraunces and Bricolage say yes.
- **Does fleet consistency with image-viewer matter?** If yes, Source Sans 3 wins by
  default and the other three are decoration.
- **ePaper.** The profile removes animation, and it will punish a fine-stroked display
  face too — but there is no ePaper story on this page yet, because `data-profile` is
  orthogonal to the font axis and the bake-off is already four axes deep. Worth a check
  before anything is locked.
