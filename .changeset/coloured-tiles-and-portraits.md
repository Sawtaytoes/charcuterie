---
"@charcuterie/ui": minor
---

`ActionTiles` is coloured, its icon sits beside the name, and `PortraitTiles` is new.

**`ActionTiles` colours itself by default.** A tile wears a bar down its leading edge —
`Card`'s own accent-edge pseudo-element, so a tile and a card on one page draw the same
bar and it follows the corner instead of running past it. The icon takes the same hue and
the box hovers in it. Hues come from the ten-wide `categorical` palette, walked in order by
position, so a set of five needs no colour props at all.

- `categorical` on an item pins its hue; the rest go on walking from their own positions.
- `accent="none"` is the previous neutral paint, kept as an opt-out.

**The icon moved beside the name.** `icon` and `label` are now one head row with `hint`
under both, which is how mux-magic, Gallery Downloader and points-market had all drawn this
card by hand.

**`PortraitTiles`** is a set of people — a round picture, a name and one big number, each
subject in its own hue. It reflows from a row to a column on a container query over the
**set**, so a picker in a narrow sidebar stays a list of rows however wide the window is,
and every length is a token, so `data-density="kiosk"` grows it. A picture that 404s falls
back to the initials rather than leaving a torn hole where a face was.

**`TILE_PADDING_CLASS.lg` grows** from `px-4 py-3.5` to `px-6 py-5`. `lg` is the
landing-page tile and was carrying a control's padding under a card's name.
`RadioGroup itemShape="tile"` grows with it — the box is shared on purpose.

Also exported: `CATEGORICAL_HOVER_BORDER_CLASS` and `CATEGORICAL_RING_CLASS`.
