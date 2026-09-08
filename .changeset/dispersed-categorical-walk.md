---
"@charcuterie/tokens": minor
"@charcuterie/ui": minor
---

A tile set walks the palette so its neighbours contrast.

`CATEGORICAL_SEQUENCE` is new in `@charcuterie/tokens`: the same ten
indexes, in the order to walk them when a set colours itself by
position. `ActionTiles` and `PortraitTiles` use it instead of
`CATEGORICAL_INDEXES`.

The ring is hue-ordered so a swatch picker reads as a spectrum, and
that is what made walking it in order the worst possible assignment
for a set — ring neighbours are 34-41 degrees apart, the tightest
pair the palette has, so every two-tile set in the fleet got red and
orange. The sequence visits the same ten and holds every neighbour,
including the wrap, at 105 degrees or more.

**Tiles that name their own `categorical` are unaffected**, and so is
`getCategoricalIndex` — it hashes, so it already scatters, and
composing a permutation onto it would move every derived colour in
the fleet for nothing. The ring itself does not move, which is what
keeps a stored index meaning what it meant: Docket and mail-sifter
both persist the owner's picked 1-10 in SQLite.

An app that took the automatic hues sees its tiles change colour.
Nothing needs changing to adopt it.
