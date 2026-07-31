# The shipped fonts are Baloo 2, Outfit and Victor Mono — and headings get their own family

**Status:** Accepted
**Date:** 2026-07-30
**Type:** Design + Packaging
**Supersedes:** —
**Superseded by:** —

## Decision

`defaultTypography.fontFamily` stops being three system stacks and becomes three real
faces, self-hosted from the tokens package:

| Token | Face | Foundry | Licence |
| --- | --- | --- | --- |
| `display` **(new)** | Baloo 2 | Vernon Adams / Cyreal | OFL |
| `sans` | Outfit | Rodrigo Fuenzalida · Chile | OFL |
| `mono` | Victor Mono | Rune Bjørnerås · Norway | OFL |

`TypographyTokens.fontFamily` gains **`display`**, a family for headings only.
`buildVariantProperties` emits `--font-display`, and `theme.css` publishes it so
`class="font-display"` exists. A variant may point `display` at `sans` to opt out;
nothing requires the two to differ.

Fonts ship from `@charcuterie/tokens` as two new entry points — `./fonts.css` (the
`@font-face` sheet) and `./fonts/*` (the woff2) — and `packages/docs` consumes them the
same single-line way a real app does.

## Context

Charcuterie shipped **no typeface**. Every variant spread `defaultTypography` without
overriding a typography key, so the design system rendered in Segoe on the Windows boxes
and Roboto on the Pis — it had no typographic opinion at all. M0 held type constant
deliberately, to keep the colour/density/motion bake-off honest; this is the milestone
that stops holding it.

Chosen over two rounds. Round one offered five fixed *pairings* and was the wrong shape —
liking a heading and disliking the body it arrived bundled with left nothing to click —
so round two split heading, body and mono into independent axes and added seven rounder
sans candidates against the feedback that round one's bodies were *"still kinda
boring"*.

## Why

**Why a separate `display` family.** A display cut at 24px is doing a different job from
body copy at 13px; one family covering both means neither is right. The owner's framing
was *"fancy for headings and regular for text"*, which is a two-family model stated
plainly. Three of round two's heading candidates said no to this (same family, weight
does the work) and were rejected.

**Why Baloo 2 over Fraunces.** Fraunces was round one's fanciest and had the better
technical story — `SOFT` and `WONK` are real variable axes, so a rounder serif could be
had without changing families. It lost anyway: this is a fleet of media and disc-ripping
apps, and a display serif reads editorial next to a progress bar. Baloo 2's rounded
terminals suit the surfaces the fleet actually has. The recorded risk stands — Baloo 2 is
warm to the point of informal, and a failing rip announced in it may read as friendly
rather than urgent.

**Why Outfit.** Round two's brief was *rounder*, and Outfit is round via the skeleton —
wide circular bowls — rather than via rounded terminals. Nunito, DM Sans, Figtree and
Rubik were the other real candidates; Quicksand was the upper bound rather than a
proposal, and Nunito Sans was the control that isolated terminals from skeleton. The cost
is that Outfit runs wide, which a dense table will notice — worth re-checking at
`density=compact` on rip-deck's bay list.

**Why Victor Mono and not Dank Mono.** This one is not a preference. See the separate
record: [the shipped mono is Victor
Mono](2026-07-30-the-shipped-mono-is-victor-mono.md).

**Why the fonts live in `@charcuterie/tokens`.** It is the zero-dependency package, and a
Satori consumer — `castkit/packages/slatecast` renders images server-side — needs the
woff2 binary rather than a stylesheet. Putting them in `@charcuterie/ui` would make an
image renderer install React to get a font file.

**Why `fonts.css` is a separate entry point from `theme.css`.** Importing tokens should
not force a font download. A Satori consumer wants the woff2 and no CSS at all; an app
that already loads these faces some other way should not fetch them twice.

**Why `--font-display` is in `THEME_BRIDGES` when it bridges nothing.** Every other entry
in that map repoints a name Tailwind already ships. `--font-display` is a name Tailwind
has never heard of, so publishing it *adds* a utility rather than redefining one — the
entry is a self-mapping. It is listed because the map is also the gate:
`tailwindCollisions.test.ts` fails on anything `theme.css` publishes that is not
declared, and adding a utility to every consumer is exactly as much of a decision as
changing one.

## Evidence

- *"I'm wondering if it would be good to configure heading and text fonts… I think the
  default fonts don't look nice and fancy."* — the ask.
- *"I like the fancy for headings and regular for text, but the text one is still kinda
  boring. I want something a bit rounder."* — what produced round two.
- *"I like Baloo 2 for headings… I think Outfit does it for me for these apps."* — the pick.
- Verified in-browser after promotion: all three faces load from the package, the
  `font-display` utility resolves to Baloo 2, Victor Mono's ligatures render (`=>` → `⇒`,
  `!=` → `≠`, `->` → `→`) and its italic is genuinely cursive.

## Consequences

- Every consumer's rendering changes on upgrade. This is the first token change in the
  project that is visible without any component change.
- Each stack keeps its system fallback, so a consumer that installs the package and never
  imports `fonts.css` gets the old behaviour rather than a broken page.
- Every face is latin-subset only. A consumer needing Cyrillic/Greek/Vietnamese must
  re-run `yarn workspace @charcuterie/tokens fetch:fonts` with wider subsets.
- The M5 bake-off scaffolding in `packages/docs` — the specimen, the three toolbar axes,
  the fourteen candidate families — is deleted by this change. The runners-up are named
  here and in `docs/2026-07-30-m5-font-candidates.md`; unlike M0's losing variants, they
  do not survive as live values, because a losing font is a 30 KB download rather than a
  line of config.
- **Not yet done:** ePaper has no font story. That profile removes animation and will
  punish a fine-stroked face too; Baloo 2's rounded terminals are probably fine and
  Victor Mono's are probably not, but neither has been looked at.
