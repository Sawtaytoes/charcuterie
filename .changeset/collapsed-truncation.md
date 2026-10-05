---
"@charcuterie/playwright-config": minor
---

`expectNoHorizontalOverflow` now fails when an ellipsis truncation (`text-overflow: ellipsis`) is squeezed narrower than one character, so it shows no text at all. The ellipsis exemption is for a label that runs out of room, not one that has none: at 384px every seated pad's name in portly-controllers was 0px wide — a row of swatches nobody could tell apart — and 2.1 passed it. A truncation that still shows a character, and a 1px-by-1px `sr-only` element, still pass.
