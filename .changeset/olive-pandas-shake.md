---
"@charcuterie/ui": minor
---

**`Slider` — a single-value range control, so the fleet stops choosing between a native `<input type="range">` and a hand-rolled one.**

`ProgressBar` looks like the answer and is not: it is output, it takes no input, and `role="progressbar"` says so. A range input's thumb and track are UA pseudo-elements that the two engines disagree about, and Windows paints its own — the same reason `Select` is deprecated. This is `role="slider"` on a focusable `div`, the APG's own pattern, with every pixel ours.

The role, the tab stop and the pointer target are all the **track**, not the thumb: on the thumb the widget is a 16px box, so a press on the bar does nothing and a Playwright bounding box is the handle.

`onChange` fires per movement and `onChangeEnd` once on release, because the expensive consumer of a slider is rarely the paint — a seek scrubber calling the network from `onChange` sends one request per pointer sample and lands on the right offset last. During a drag the component paints from its own value, or a controlled slider committing only on `onChangeEnd` would pin the thumb under the finger at the old position.

Keyboard: arrows by `step`, Page keys by `largeStep` (a tenth of the range by default), Home and End. `valueFormat` writes `aria-valuetext`, so a scrubber announces `21:14` rather than `1274`. `isReadOnly` is focusable and full contrast, distinct from `isDisabled`. The arithmetic is a tested pure module: steps anchor on `min` rather than zero, a snap never escapes the range, and `fromFraction` takes `isRtl` because `getBoundingClientRect()` is physical.
