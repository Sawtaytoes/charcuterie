# The walk starts at Teal, and Red never sits beside a green

**Status:** Accepted
**Date:** 2026-09-08
**Type:** Tokens / colour
**Supersedes:** [2026-09-03 — The ring is hue-ordered and the walk is not](2026-09-03-the-ring-is-hue-ordered-and-the-walk-is-not.md)
**Superseded by:** —

## Decision

`CATEGORICAL_SEQUENCE` is `6, 9, 2, 5, 8, 1, 7, 4, 10, 3` —
**Teal, Purple, Orange, Green, Indigo, Red, Blue, Lime, Pink, Amber**.

Two properties are load-bearing and both are pinned by tests:

1. The walk **starts on Teal and Purple**.
2. **Red never neighbours Lime or Green**, at any position, the wrap included.

Everything the superseded record decided is carried forward unchanged. There are still two
orders. `CATEGORICAL_INDEXES` is still the hue-ordered ring, it is still what a stored index
means and what the swatch picker draws, and it still does not move. Only the walk's order
changed.

## Context

The superseded record chose the walk by one measure: keep every neighbouring hue far apart.
A stride of three did that, and starting it at index 1 gave
`1, 4, 7, 10, 3, 6, 9, 2, 5, 8` — a minimum gap of 105 degrees against the ring's 34.

The number was right and the result was wrong. Almost every tile set in the fleet has two
tiles, so almost every set drew the first two entries: **Red and Lime**. Four apps deployed
that. The owner looked at it:

> I don't really want red and green. We had a kinda teal and purple that looked nice in the
> past.

and, when asked nothing further:

> Red and green as the 2 main ones.

Red beside green is also the pair the two common forms of colour blindness confuse, so the
one combination the walk led with was the one combination worth avoiding.

## Why

**Why the start is a decision.** Rotating a cycle does not change any gap in it, so the
spacing measure is indifferent to where the walk begins. It scored ten different starts
identically and the first draft took index 1 because that is where the array happened to
start. The owner named Teal and Purple, that pair is 109 degrees apart, and it now leads.

**Why Red moved as well.** Rotating alone puts Red and Lime at positions six and seven, so a
six-tile set reproduces the complaint further down the row. The fix is one swap: exchange
Lime and Blue, so Red's neighbours become Indigo and Blue. A swap of two entries can wreck
the spacing; this one does not, because Red-to-Blue is 141 degrees and Lime-to-Pink is 141.
The minimum gap is still 105.

**Why only that one pair is constrained.** Orange beside a green is also a confusable pair,
and forbidding it too was measured rather than argued: the best achievable minimum gap falls
from **105 degrees to 71**. That is worse than a third of the whole improvement this walk
exists to deliver, spent on a pair nobody reported. So Red against the greens is the one
adjacency rule, and it is written down here so a later reader does not "tidy" a second one in.

**Why not renumber the hues instead.** Unchanged from the superseded record, and still the
reason the ring did not move: the index is durable data. Docket and mail-sifter both persist
the owner's picked 1–10 in SQLite, so renumbering repaints a hand-picked colour without
touching the row. Every hash-derived colour would move too and cannot be migrated at all,
because it is computed rather than stored. And the picker still wants a spectrum to scan.

## Evidence

The owner's words are quoted above, chat `f8d04598`. He was reviewing the deployed result of
the superseded record, served from the four live apps.

The order was chosen by exhaustive search over all 40 320 permutations that begin Teal,
Purple — not by hand — maximising the minimum gap under each candidate constraint set:

| Constraint | Best minimum gap | Order |
| --- | --- | --- |
| Teal and Purple first | 109° | `6, 9, 3, 7, 1, 5, 10, 4, 8, 2` — but this puts Red directly beside Green |
| …and Red never touches a green | **105°** | `6, 9, 2, 5, 8, 1, 7, 4, 10, 3` — **adopted** |
| …and Orange never touches a green either | 71° | rejected: costs a third of the improvement |

Measured gaps for the adopted order, the last being the wrap:
109, 105, 105, 115, 105, 141, 113, 141, 106, 110.

Four tests in `categorical.test.ts` hold it: that it visits every index exactly once, that
every neighbour **including the wrap** clears 100 degrees, that it beats the ring's own
minimum by more than double, that it **starts on Teal and Purple**, and that **Red neighbours
no green**. The last two exist because a sequence that reads as an unsorted list invites being
"corrected" back to something tidier, and the tidier answers are the rejected ones.

## What this does not change

- The ring, the tokens, the ten hues, or the contrast gate.
- `getCategoricalIndex`, and so every colour Docket, mail-sifter and Folio derive from a name.
- Any stored index, in any app.
- A tile that names its own `categorical`. A pin is still a pin.
- A set with `accent="none"`.

An app that takes the automatic hues sees its tiles change colour on the next
`@charcuterie/ui` bump. Nothing needs changing to adopt it.
