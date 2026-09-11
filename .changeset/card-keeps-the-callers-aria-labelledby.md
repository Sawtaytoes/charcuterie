---
"@charcuterie/ui": patch
---

`Card`: a caller's own `aria-labelledby` survives when there is no `heading`.

`aria-labelledby` is written **after** the caller's props are spread, and it was written as
`heading ? headingId : undefined`. On a card with no `heading` that `undefined` did not mean
"leave the call site's pointer alone" — it overwrote it, React dropped the attribute, and the
card's accessible name fell back to its **whole subtree**. Nothing reported it: valid markup,
satisfied types, and axe is content with a name made of everything.

Two `role="button"` tiles in mail-sifter were hit. `RecentTile` passes
`aria-labelledby="recent-tile-heading"` and announced as "Recent Mail 6 40 arrived in the
last 24 hours, 34 done" instead of "Recent Mail"; `QueueTileCard` passes a generated heading
id and lost its name the same way. Both draw their own title row — a name beside a count, one
line `heading` cannot express — so neither can move to `heading` to get the name back.

The caller's value is now the **fallback**. `heading` still wins where it is given, because
that is the text the reader can see and the component renders it.

`aria-label` is unchanged and needs no equivalent: `Card` never writes one, so the spread
already carried the caller's through. A test now asserts that, so a later change that starts
writing `aria-label` here cannot take the caller's with it the way this one took
`aria-labelledby`.

**Why `patch` and not `minor`**: no prop, no type and no default changed — `aria-labelledby`
has always been part of `ComponentPropsWithRef<"section">`. A card that passed one and got
`undefined` back was getting the documented behaviour of neither ARIA nor this component. The
one visible difference is that such a card is now a named `region`, so `getAllByRole("region")`
in a consumer's test counts one more where a call site does this.
