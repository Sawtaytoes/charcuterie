---
"@charcuterie/tokens": minor
"@charcuterie/ui": minor
---

`CATEGORICAL_SEQUENCE` now starts on Teal and Purple, and keeps Red away from both greens.

The order becomes `6, 9, 2, 5, 8, 1, 7, 4, 10, 3` — Teal, Purple, Orange, Green, Indigo, Red,
Blue, Lime, Pink, Amber.

The previous order was chosen on one measure: keep neighbouring hues far apart. Rotating a
cycle does not change any gap in it, so that measure was indifferent to where the walk began,
and it began at index 1. That made Red and Lime the first two entries — and because almost
every tile set has two tiles, almost every set drew red beside green, which is also the pair
both common forms of colour blindness confuse.

Two properties are now pinned by tests: the walk starts on Teal and Purple, and Red never
neighbours Lime or Green at any position, the wrap included. The minimum gap between
neighbours is unchanged at 105 degrees.

`ActionTiles` and `PortraitTiles` sets that take automatic hues are repainted. A tile that
names its own `categorical` keeps it, `accent="none"` is unaffected, and nothing stored or
derived by `getCategoricalIndex` changes — the hue-ordered ring did not move.
