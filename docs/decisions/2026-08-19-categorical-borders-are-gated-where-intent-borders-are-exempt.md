# A categorical border is gated at 3:1 where an intent border is exempt

**Status:** Accepted
**Date:** 2026-08-19
**Type:** Design
**Supersedes:** —
**Superseded by:** —

## Decision

`categorical.<n>.border on surface.raised` is enrolled in `contrastAudit.ts` at **3:1 and
not exempt**. `intent.<name>.border on surface.raised` keeps its exemption, unchanged.

This is the one place the categorical family is deliberately stricter than the intent family
it otherwise mirrors role-for-role.

## Context

`contrastAudit.ts` has reported intent borders without gating them since M0, with the reason
stated in the file:

> "a badge outline is decorative — the meaning is carried by its text, which is gated at
> 4.5:1"

And the block below it explains why that restraint matters rather than being laziness:

> "1.4.11 applies to boundaries *required to identify a control*, not to every line drawn on
> screen. Separating the two is what keeps this gate honest: gate it everywhere and it fires
> on decoration until somebody switches it off."

Measured, the fleet's intent borders sit at **1.30:1 to 3.37:1** against `surface.raised`.
Most would fail a 3:1 gate today.

## Why

**The exemption's own justification does not survive the move to a categorical badge.**

An intent pill says `failed`. Its red is a second copy of a message the words already carry,
so the outline identifies nothing on its own and gating it would be gating decoration.

A categorical pill says "Homelab". The text tells you nothing whatsoever about the colour,
and the colour is the entire reason the badge is coloured — it is what the eye scans a list
of thirty labels by. The boundary is therefore doing identification work in exactly the
sense WCAG 1.4.11 means, and it is gated like one.

Three things follow, and all three are wanted:

- **The outline is visibly heavier than an intent badge's.** That is the cost, and it is
  also the benefit: the tint under it is necessarily pale (it has to carry 7:1 text), so the
  border is what keeps a soft categorical badge distinguishable from its neighbour. The
  distinctness gate agrees — `border` clears its floor with more margin than `content` does.
- **It is not a general loosening or tightening of the gate.** The intent exemption stands
  on its stated reason, which is still true of intents. Extending it to a family whose
  colour *is* the information would have been the drift this repo keeps writing records
  about.
- **The generator solves to 3.15, not 3.00.** A value solved exactly to its threshold
  re-breaks on any later tweak to what it was solved against, which is where `hairline`'s
  dark `danger.solid` sits today at 4.50:1 and why its own comment calls it *"the next
  rounding error away from failing"*.

The alternative considered and rejected was mirroring `intent` exactly, exemption included.
It is the more consistent-looking choice and it is wrong for the same reason the exemption
is right: an exemption is a claim about what a pixel is doing, not a property of the token
name it wears.

## Evidence

- `packages/tokens/src/contrastAudit.ts` — the categorical block, and the intent border check
  immediately above it with its `exemptReason` untouched.
- `packages/tokens/src/categorical.ts` — `CATEGORICAL_BORDER_THRESHOLD` and the comment
  arguing it.
- `packages/tokens/src/contrast.test.ts` — asserts the difference in **both** directions
  (categorical `isExempt === false`, intent `isExempt === true`), so a future edit that
  quietly aligns them fails rather than passing more easily.
- Measured intent borders against `surface.raised`, all four variants, both schemes:
  1.30–3.37:1. Measured categorical borders: 3.00–3.20:1.
