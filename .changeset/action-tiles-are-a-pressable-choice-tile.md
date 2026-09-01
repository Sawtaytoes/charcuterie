---
"@charcuterie/ui": minor
---

`ActionTiles` — a set of actions drawn as tiles. A bordered card carrying a name and a line
of help, in a grid that gains columns with its container. A tile presses (`onChoose`) or
navigates (`href`, routed through the `RouterLinkProvider` seam); nothing stays selected,
because nothing was chosen.

This is `RadioGroup itemShape="tile"` with the radio taken away, and it is the case the
2026-08-25 choice-tile record named under *"What this deliberately does not cover"* — a link
is not a radio, and giving one `aria-checked` would be worse than the paint it replaced.

The box now lives in `tileStyles.ts` and both components read it, so the two tile shapes
cannot drift; the test compares **computed** styles rather than class names, the same
discipline `ButtonLink` applies to `Button`.

Reach for it instead of a `Button` with `height: auto`. A `Button` is sized by
`h-(--control-height-md)` and carries no block padding at all, so overriding the height
leaves a two-line card with `padding: 0` down the block axis — title flush against the top
border, description flush against the bottom one — and nothing reports it.

`RadioGroup` is unchanged: same values, same classes, same behaviour.
