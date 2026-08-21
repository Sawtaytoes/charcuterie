---
"@charcuterie/ui": minor
---

**`Stepper`** — an ordered sequence of steps, with what belongs to each one under it.

Docket asked for it: its phases (*"these 3 cards have to be done in order"*) were a
hand-rolled numbered rail with the connector drawn in a `::before`, plus a `ProgressBar`
per phase for the count. Neither says which things go together, which is the whole
question a sequence view exists to answer — so a step takes `content`.

Four statuses, and `blocked` is deliberately not a worse `upcoming`: upcoming means its
turn has not come, blocked means its turn HAS come and something is in the way. One is a
thing to wait for and the other is a thing to go and fix.

Status never reaches the screen as colour alone — a `VisuallyHidden` word beside the
label, a filled marker behind finished work and an outlined one ahead of it. The marker is
the ordinal and never a tick, because a `✓` the font lacks paints as an empty box in the
one position where an empty box reads as an error.

`orientation="horizontal"` is a request rather than a promise: it collapses to the vertical
column below `cq-md`.
