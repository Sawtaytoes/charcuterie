# The ring is hue-ordered and the walk is not

**Status:** Accepted
**Date:** 2026-09-03
**Type:** Tokens / colour
**Supersedes:** —
**Superseded by:** —

## Decision

The categorical palette has **two orders**, and they are different on purpose.

`CATEGORICAL_INDEXES` is the **ring**: `1..10`, hue-ordered, Red through Pink. It is the
identity of a hue, the order a swatch picker draws, and the thing a stored index means.
It does not move.

`CATEGORICAL_SEQUENCE` is the **walk**: `1, 4, 7, 10, 3, 6, 9, 2, 5, 8`. It is the order to
take hues in when a set colours itself by position. `ActionTiles` and `PortraitTiles` use
it. Any future component that auto-assigns uses it too.

A component that assigns by **hash** — `getCategoricalIndex` — keeps using the ring.

## Context

`@charcuterie/ui@4.1.0` gave `ActionTiles` and `PortraitTiles` automatic hues, taken by
position straight off the ring. Four apps adopted it the same day. The owner, looking at
the result:

> Now, the colors are in-order, so I get red and orange next to each other in my apps
> rather than contrasting colors like I used to have. I think we should keep that in mind.
> That or we change the ordering of which color is which number to ENSURE contrast at
> every indexed step.

He is describing the worst case the palette has. The ring's hue spacing is 34–41°, and
those gaps are not an oversight — they are the **solved** spacing, the output of a
coordinate ascent that maximises the minimum pairwise distance across every variant and
both schemes. Ten hues on a circle cannot be further apart than that. But it means
ring-adjacent indexes are, by construction, the two hardest colours in the family to tell
apart, and walking the ring in order hands exactly that pair to a two-tile set. Every
two-tile set in the fleet got red and orange.

## Why

**Why the walk moved.** A stride of three visits all ten before repeating and holds every
neighbouring gap — including the wrap from the tenth back to the first — at 105–115°.
That is three times the ring's spacing and about as even as ten steps around a circle can
be. It costs nothing: the same ten hues, the same tokens, one different constant.

**Why the ring did not move.** Re-numbering the hues fixes the same symptom and is what
the owner offered as the alternative. It cannot be done quietly, because **the index is
durable data**:

- Docket and mail-sifter both persist the owner's *picked* index in SQLite. mail-sifter's
  schema says so in as many words — `categorical INTEGER`, *"the owner's picked
  Charcuterie categorical index, 1-10"*. Re-numbering repaints a hand-picked colour without
  touching the row: a label deliberately made red comes back teal.
- Every hash-assigned colour moves too — `getCategoricalIndex` over Docket's projects,
  mail-sifter's queues, Folio's repo names. Those cannot be migrated at all, because they
  are derived rather than stored. There is no row to rewrite.
- The **picker** wants the spectrum. A row of ten dots is scanned by a person looking for
  "the greenish one", and a jumbled row is harder to use than an ordered one. That is the
  case the ring was ordered for, and it is still right.

So the two orders answer two different questions, and neither answer is wrong. Conflating
them is what produced the complaint.

**Why not compose the permutation onto the hash.** `getCategoricalIndex` already scatters —
FNV-1a over a key, modulo ten. Applying a permutation to a uniform output leaves it
uniform, so it buys nothing, and it would move every derived colour in the fleet for that
nothing.

## Evidence

The owner's report is quoted above, chat `f8d04598`. The before and after were rendered
from the real `AutoHues` story in both schemes and served for review before the change
landed.

Measured, and pinned by `categorical.test.ts`:

| Order | Neighbouring hue gaps | Minimum |
| --- | --- | --- |
| Ring, in order | 35 36 35 34 41 38 36 35 35, wrap 35 | **34°** |
| `CATEGORICAL_SEQUENCE` | 106 113 106 106 110 109 105 105 115, wrap 105 | **105°** |

Three assertions guard it, because a sequence that reads as an unsorted list invites being
"tidied" back to `1..10`: that it visits every index exactly once, that every neighbour
**including the wrap** clears 100°, and that it beats the ring's own minimum by more than
double. The wrap is not decoration — an eleven-tile set puts the tenth beside the first,
and a sequence checked only pairwise from the front can be perfectly spread and still close
up there.

## What this does not change

- A tile that names its own `categorical`. A pin is a pin.
- A set with `accent="none"`.
- `getCategoricalIndex`, and therefore every colour Docket, mail-sifter and Folio derive
  from a name.
- Any stored index, in any app.
- The ring, the tokens, the hues, or the contrast gate.

An app that took the automatic hues sees its tiles change colour on the next
`@charcuterie/ui` bump. Nothing needs changing to adopt it.
