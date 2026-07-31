# ePaper restricts colour by what is being drawn, not by what the panel can render

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Architecture
**Supersedes:** the palette paragraph of [2026-07-29-epaper-is-a-profile-not-a-scheme.md](2026-07-29-epaper-is-a-profile-not-a-scheme.md) — that ADR's *non-composition* holding stands unchanged
**Superseded by:** —

## Decision

**Six is what one *pixel* can be, not what the panel can show.** The claim that the
ePaper palette is *"a fixed six colours … that the panel can physically render"* is
false, and it is retired.

The restriction is real, but it is a **UI rule keyed to what is being drawn**, not a
hardware ceiling:

| what | what it may use | count on Spectra 6 |
| --- | --- | --- |
| photographs | the full dithered gamut — not this profile's business | near-continuous |
| flat fills, large areas | `inks` **+ `blends`** | **19** |
| borders, small text, icons | `inks` only | 6 |

Three things follow.

**1. `@charcuterie/tokens/epaper` gains a blend tier.** `spectra6Blends` ships the
**thirteen** two-ink 50% checkerboards the fleet pipeline can actually be asked for, and
`monoBlends` ships the pHAT's one. Fills and large areas only.

**2. Every ink and blend is *derived*, never typed.** `SPECTRA_6` is computed from
Pimoroni's `DESATURATED_PALETTE` and `SATURATED_PALETTE` at the fleet's
`IMMICH_SATURATION = 0.5`; the blends are computed from those inks. The literals now
live only in `epaper.test.ts`, where they are an independent pin instead of a second
copy of the same guess.

**3. Panels are modelled by *family*, so Gallery 3 has somewhere to live.**
`epaperPanels` is keyed by panel and discriminated on `family`: `fixedInk` carries
`inks`/`emittedInks`/`blends`, `continuousTone` carries neither and cannot. `gallery3`
is listed as `continuousTone`, `isInFleet: false`.

## Context

Kevin, on being shown the profile:

> "the 6-color displays were tuned for sure. They're not just 6 colors though because of
> dithering, so I don't even know **why** we have those color restrictions. I can
> understand black and white displays and others, but these 6-color ones are designed to
> be full-color."

He is right about the hardware. The panels render far more than six colours, and the
fleet's photo path already depends on that —
`home-displays/epaper-clients/immich_impression_frame.py` hands the image straight to
inky's Floyd–Steinberg at `saturation=0.5`.

The profile was never applied to photographs; it paints UI chrome through Satori, where
error diffusion genuinely does fall apart on small geometry. But the docstring did not
say that. It said the panel *could not render* anything else, which is untrue, and that
one sentence is why the whole rule read as arbitrary.

The full investigation is
`agentic/docs/research/2026-07-31-epaper-palette-restriction-is-a-ui-rule-not-a-hardware-limit.md`.

## Why

**The false claim was load-bearing.** A restriction justified by a hardware limit that
does not exist is a restriction nobody can reason about — it can only be obeyed or
resented. Restated as "these are the colours that survive at UI scale", it becomes a
rule with a scope, and the scope is the useful part: it tells an author that a fill and
a hairline are not the same problem.

**Twelve-ish colours were being thrown away for no reason.** The blend tier is the
actual fidelity loss. Six inks admit fifteen pairs; thirteen of those pairs are reachable
as clean 50% checkerboards. That is 19 flat-fill colours where the profile allowed 6.

**No Satori-side dither was needed, contrary to the research doc's estimate.** The
routing note assumed the blend tier needed "a real dither implementation on the Satori
side to emit the pattern, so it is a milestone, not a patch." It does not. **Authoring a
single flat hex is enough** — the arithmetic midpoint of two inks in the quantizer's own
8-bit space — because the panel-side error diffusion distributes residual linearly and
splits it evenly between the two nearest inks. The downstream consumer was already doing
the work; the token only had to name the right input.

**The reachability rule had to be measured, not assumed** — that is the whole lesson of
this file's history. See Evidence.

**Small primitives keep the six-ink rule, and now say why.** The original intuition was
right and unsourced. It now carries the citation:

> While more complex algorithms like Rotated Bayer or Error Diffusion are excellent for
> photographic gradients, **they often struggle with small-scale graphical primitives** …
> introduced noticeable geometric artifacts that distracted from the clean lines of the
> UI elements.

— [Beyond 6 Colors](https://myembeddedstuff.com/e-ink-spectra-6-color)

A 1px rule is worse than "smeared": it has **one row** for the dither to work in, so the
checkerboard degenerates to an alternation along x and the line becomes a dotted line.
That is on the board.

**Gallery 3 is a family problem, not a palette problem, so a variant axis was the wrong
shape.** The obvious alternatives were both rejected:

- *A variant axis* — resurrects the exact modelling error the 2026-07-29 ADR rejected.
  ePaper does not compose with axes; a Gallery 3 "variant" of a six-ink profile still
  implies the six inks apply.
- *Another `EpaperPalette` member* — the union welded a fixed-ink palette to every panel
  name, so the only way to add Gallery 3 was to invent six hexes for a panel nobody owns.
  That is precisely the M5b failure, repeated.

Discriminating on `family` makes the wrong thing **unrepresentable** rather than merely
unwise — the same argument that kept ePaper out of `data-scheme`. A `continuousTone`
panel has no `inks` field to fill in wrongly. Gallery 3 is listed with only sourced facts
(4-particle ACeP, ~50,000 colours, not in the fleet); if one ever lands, the work is a
set of role colours, not a palette to guess at.

**It is gated, not merely documented.** `buildCss.ts` emits zero ePaper CSS by design —
Satori cannot evaluate `var()` — so enforcement here is necessarily test-only. The tests
that matter: role colours must stay on the six inks and may never be a blend; the shipped
blend keys must equal the derived reachable set; `epaperColours` may only be keyed by
`fixedInk` panels.

## Evidence

**The reachable set was measured through the real consumer, not predicted.** All fifteen
Spectra 6 ink pairs were pushed through castkit's `ditherToPanel` at `floyd-steinberg`
over a flat 96×96 field, and the output pixels counted:

- **13 pairs returned an exact 50.0% / 50.0% census** of their two inks.
- `black`+`yellow` (`#747012`) came back **green + red**. Green (108) and red (119) both
  sit nearer the midpoint than black (162) or yellow (162), so error diffusion never
  reaches for the parents. Not fixable by nudging the hex.
- `yellow`+`blue` (`#847F6A`) came back **black + white**. Its chroma is 26 — exactly
  castkit's `NEUTRAL_CHROMA_THRESHOLD` — so the neutral guard dithers it against the
  monochrome sub-palette. Pushing the chroma past the guard does not help either: green
  and red are still nearer, and the result becomes three-ink mush.

The predicate now in `epaper.ts` (neutral guard, then two-nearest in Euclidean RGB)
reproduces that measurement **15 times out of 15**. Both unreachable pairs are absent
from `spectra6Blends` rather than present-and-wrong.

**The board.** `docs/previews/2026-07-31-m6g-epaper-palette.html` — generated from
`src/epaper.ts`, so nothing on it is drawn by hand. It renders each blend as its real 1px
checkerboard and again at ×8. The rendered `yellowRed` fill was itself screenshotted and
counted: **49.4% red / 49.4% yellow** (the remainder is the card's rounded corners),
matching the quantizer.

**Why the derivation is not optional.** From
`2026-07-31-epaper-is-exempt-from-the-contrast-gate.md`, on the six hexes this profile
shipped before M5b:

> The old values … were plausible Spectra 6 primaries and **not one of them is a colour
> the pipeline maps 1:1**.
>
> That test passed for a whole milestone against six hexes nobody had measured.

The test held the same invented set the source did, so it could only ever agree with
itself. Computing the inks from the driver's two palettes and leaving the literals in the
test is what makes the two independent.
