# ePaper is exempt from the contrast gate, and its palette comes from the consumer

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Design
**Supersedes:** —
**Superseded by:** —

## Decision

Two halves, settled together in M5b:

1. **The Spectra 6 palette is the one castkit measured**, not the one this repo invented.
   `epaperColours.spectra6` now uses `#D0D2D2` / `#CE2426` / `#E8DF24` / `#1F1EAF` /
   `#1DAD23`, taken from `castkit/packages/core/src/panels/palette.ts` — itself lifted from
   Pimoroni's `inky` driver (`inky_e673.py`) — at the fleet's `saturation` of 0.5. `mono`
   gets its own constants, because a 1-bit pHAT's white really is `#FFFFFF`.
2. **The ePaper profile stays outside `check:contrast`.** The measured numbers are
   recorded in `epaper.ts` instead of enforced.

## What M5b found

The old values (`#D02F2A`, `#E8C11C`, `#2B4C9B`, `#2E7D46`, and `#FFFFFF` for paper) were
plausible Spectra 6 primaries and **not one of them is a colour the pipeline maps 1:1**.
castkit renders a view, then quantizes it to the panel palette, so none of those six
values survives the render.

How bad that is on its own turned out to be worth measuring rather than assuming. Pushed
through castkit's actual pipeline (`ditherToPanel`, floyd-steinberg, `E6_DEFAULT_PALETTE`),
a 200x120 flat field comes out as a single colour every time:

| authored | rendered | distinct output colours |
| --- | --- | --- |
| `#FFFFFF` | `#D0D2D2` | 1 |
| `#D0D2D2` | `#D0D2D2` | 1 |
| `#1F4FD0` | `#1F1EAF` | 1 |
| `#1F1EAF` | `#1F1EAF` | 1 |

So the profile's own warning — that an off-palette colour dithers, and dithering a 1px
border is how you get a smeared grey line — overstates the case for flat areas: error
diffusion has nowhere to put the residual, and it converges. The cost is real at edges and
in gradients, and it is decisive for a different reason: **the authored value is not the
value that reaches the panel**, so every judgement made about it is a judgement about a
colour nobody sees. Which is exactly what happened to the contrast numbers.

The paper is the bigger miss. `#FFFFFF` is not a colour an E6 panel can produce; it shows
`#A1A4A5` ink, and the fleet's 0.5-saturation render targets `#D0D2D2`. Every contrast
number anyone computed for this profile was against a white the hardware never emits.

Measured against the ink the panel actually emits:

| emitted | on paper | black on it |
| --- | --- | --- |
| black `#000000` | — | — |
| paper `#A1A4A5` | — | 8.37 ✅ |
| yellow `#D0BE47` | 1.33 ✗ | 11.14 ✅ |
| red `#9C484B` | 2.43 ✗ | 3.44 ✗ |
| blue `#3D3B5E` | 4.21 ✗ | 1.99 ✗ |
| green `#3A5B46` | 3.03 ✗ | 2.76 ✗ |

Only **black on paper** and **black on yellow** reach AA. Blue and green clear the 3:1
non-text bar as rules and borders; red clears nothing.

The one thing the old profile got right, it got right for the wrong reason: `warning`
already refused to draw text in yellow. That was reasoning about a colour that was never
going to reach the panel, and it happens to hold for the real one too.

## Why exempt rather than enforce

Kevin's call, given the table above:

> *"Exempt ePaper from the gate, just fix the hexes."*

Enforcing AA on this profile reduces a six-ink panel to black and yellow. That is not what
the hardware is for, and a gate whose only possible passing configuration is "do not use
colour" is not measuring a design — it is banning the medium. The panels are read across a
room in daylight, where reflectance and the dither pattern do work that a flat two-colour
ratio does not model, and WCAG's contrast maths was written for emissive displays.

So the numbers live in `epaper.ts` as a table an author reads before choosing `danger` for
a panel, rather than as a red test that can only be made green by deleting the colour.
`check:contrast` continues to gate the four variants x two schemes, where it *is* the right
instrument, and still reports "All variants clear WCAG 2.2 AA" without qualification —
because ePaper is not a variant
([why](2026-07-29-epaper-is-a-profile-not-a-scheme.md)).

## What still holds it honest

`epaper.test.ts` asserts every swatch is a colour the panel's quantizer maps 1:1, now per
palette rather than from one shared set. That test passed for a whole milestone against
six hexes nobody had measured — which is the argument for a consumer milestone in one
line. It cannot pass now unless the values match the driver's.

## The direction of the fix

The tokens package has **zero dependencies** and will not grow one on `@castkit/core`, so
these are copied values with their provenance written down, not an import. The dependency
would also point the wrong way: castkit consumes charcuterie.

The copy is defensible because the source is itself a copy — Pimoroni's driver is upstream
of both, and the numbers change only when the vendor's do.
