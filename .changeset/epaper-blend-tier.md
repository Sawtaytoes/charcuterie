---
"@charcuterie/tokens": minor
---

ePaper: widen the flat-fill palette from 6 colours to 19, and key panels by family

**Six is what one _pixel_ can be, not what the panel can show.** The profile's docstring
claimed its palette was "six colours … that the panel can physically render", which is
false — a Spectra 6 panel sets each pixel to one of six inks, but a region of pixels
renders far more, and the fleet's photo path has always depended on that. That one
sentence is why the restriction read as arbitrary. It is retired.

The rule is now keyed to what is being drawn: photographs get the full dithered gamut,
**flat fills get 19 colours**, and borders / small text / icons keep the six.

**New:**

- **`spectra6Blends`** — the thirteen two-ink 50% checkerboards Spectra 6 can actually be
  asked for, and **`monoBlends`** — the pHAT's one. Each is reached by authoring a single
  flat hex; the panel-side quantizer produces the pattern. Fills and large areas only.
- **`epaperPanels`** — a registry keyed by panel and discriminated on `family`.
  `fixedInk` panels carry `inks` / `emittedInks` / `blends`; `continuousTone` panels carry
  none of them. `gallery3` is listed (~50,000 colours, ACeP, `isInFleet: false`) with no
  palette, because a continuous-tone panel has none to enumerate.
- **`getIsReachableBlend`** and **`listReachableBlendPairs`** — the derivation, exported so
  a new panel gets its blend tier without anyone guessing which pairs survive.
- `EpaperPanelId`, `EpaperPanelFamily`, `EpaperFixedInkPanel`,
  `EpaperContinuousTonePanel`, `EpaperPanel` types.

**Not a breaking change.** `epaperColours`, `epaperMotion` and `EpaperPalette` are
unchanged, and the six ink values are byte-identical — they are now *derived* from
Pimoroni's `DESATURATED_PALETTE`/`SATURATED_PALETTE` at the fleet's `saturation = 0.5`
rather than typed by hand, with the literals kept in `epaper.test.ts` as an independent
pin. Role colours are still built from the six inks alone, and a test holds them there.

Two ink pairs are **absent rather than present-and-wrong**: `blackYellow` and
`yellowBlue` quantize to a different pair entirely. Measured, not predicted — all fifteen
pairs were pushed through castkit's real `ditherToPanel`.

Board: `docs/previews/2026-07-31-m6g-epaper-palette.html`.
