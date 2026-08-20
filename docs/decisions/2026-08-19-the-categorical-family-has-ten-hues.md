# The categorical family has ten hues, and they are gated against each other

**Status:** Accepted
**Date:** 2026-08-19
**Type:** Design
**Supersedes:** —
**Superseded by:** —

## Decision

**Ten.** `CATEGORICAL_INDEXES` is `1…10`, and the ring is generated rather than hand-picked:
a hue angle and a contrast target per role, solved in OKLCh against the **emitted hex**.

A second gate ships with it, because the first one cannot see the thing that matters.
`getCategoricalDistinctnessFailures` measures every pair of indexes against every other in
OKLab, per role, with a floor per role:

| role | floor (ΔEok) | fleet minimum achieved |
| --- | --- | --- |
| `solid` | 0.08 | **0.0893** |
| `solidHover` | 0.07 | 0.0774 |
| `border` | 0.05 | 0.0561 |
| `content` | 0.05 | 0.0556 |
| `surfaceHover` | 0.018 | 0.0224 |
| `surface` | 0.012 | 0.0145 |
| `onSolid` | — | not an identity carrier |

**If a hue cannot meet a threshold, the hue moves. The gate does not.**
`solveLightness` throws rather than returning its last attempt, so an impossible target
fails at module load in every consumer instead of shipping a palette that quietly does not
meet the standard the audit says it meets.

## Context

A categorical palette is judged on a property no contrast audit measures. `contrastAudit.ts`
asks "is this colour readable **against the background**"; two indexes can both clear 4.5:1
on the same surface and be *the same colour as each other*, and every number on the board
stays green while the only job the family has — telling label 3 from label 4 — has stopped
being done.

That is the constraint that sets the count. Ten hues is not "as many as fit on a wheel";
360°/N is trivially satisfiable at any N. The binding constraint is that every hue must
first be pushed to whatever **lightness** AA demands in both schemes, and pushing a hue
toward either end of the lightness range narrows the gamut it has left to be different
inside. The sRGB gamut is not a cylinder: it collapses hard through the green-to-cyan arc at
the lightness a legible fill needs, and is deep and roomy through blue-to-purple.

## Why

**Ten is the most that clears an external benchmark.** The floor for `solid` — the role the
eye actually reads a badge by — is 0.08, and the number is somebody else's: **Tableau 10**,
the most-copied ten-colour categorical palette there is, has a tightest pair of **0.0835**.
Measured in the same units, for scale:

| palette | n | tightest pair (ΔEok) |
| --- | --- | --- |
| Okabe–Ito | 8 | 0.1558 |
| d3 `category10` | 10 | 0.1133 |
| ColorBrewer Set2 | 8 | 0.0899 |
| **this ring** | **10** | **0.0893** |
| Tableau 10 | 10 | 0.0835 |
| ColorBrewer Paired | 12 | 0.0796 |
| Radix 9-step accents | 10 | 0.0558 |

Twelve does not clear 0.08 anywhere, in any variant, in either scheme — and it fails in the
same place every time, the green-to-teal arc. Note the last row: a ten-hue ring of the same
kind, from a design system in wide use, sits *below* our floor. Ten with a gate is a
different artefact from ten without one.

**Ten is also the size the consuming problem wants.** Docket's user picks a label colour
out of a swatch row; ten is a row he can take in at once. Past about a dozen a picker stops
being a choice between distinguishable things and becomes a colour picker — which is
[`Swatch`'s problem](2026-08-19-categorical-is-a-curated-palette-not-ungoverned-colour.md),
and deliberately not this one.

Three consequences worth recording, because each looks like a mistake from outside:

- **The hue spacing is uneven on purpose.** Even 36° steps are the obvious ring and they
  fail. The final angles (22, 57, 93, 128, 162, 203, 241, 277, 312, 347) come from
  coordinate ascent on the fleet-wide minimum pairwise distance, with all four variants and
  both schemes in the objective — the lime-to-teal arc stretched, the blue-to-purple arc
  compressed, exactly against the gamut's shape.
- **Every fill carries a near-black label, in both schemes**, where an intent's carries
  white. `types.ts` says of intents that *"whether white or near-black wins on a given fill
  genuinely varies"*, and it does. This family picks a side because a fill dark enough to
  carry white is a fill pushed down the gamut, and through the green-to-cyan arc that is
  the difference between ten hues and seven — and because ten chips are seen at once, where
  a row with four white labels and six black ones reads as an accident rather than as
  consideration.
- **The generator targets 7:1 for tint text while the gate is 4.5:1.** Measured, the fleet's
  hand-made intent tints run **6.1:1 to 11.6:1** and never near 4.5. A categorical badge
  generated to the letter of the gate would sit beside an intent badge that is visibly
  crisper, and read as a bug in the new thing rather than as the standard being met.
  `legible` targets 7.5 and pays for it in separation, which is the right trade in the one
  variant whose premise is a garage at 2am rather than a picker.

**ePaper collapses all ten to black, deliberately.** Spectra 6 has four chromatic inks;
mapping ten indexes round-robin onto them would make index 1 and index 6 *identical*, and a
reader would trust a colour that is lying. On ePaper a categorical badge is told apart by
its label — the same trade `content.secondary` already makes there, and the reason ePaper is
skipped by the distinctness gate as it already is by
[the contrast gate](2026-07-31-epaper-is-exempt-from-the-contrast-gate.md).

## Evidence

- `packages/tokens/src/categorical.ts` — `CATEGORICAL_HUES`,
  `CATEGORICAL_DISTINCTNESS_FLOOR`, `TABLEAU_10_MINIMUM_DISTANCE`, and the solver.
- `packages/tokens/src/colourSpace.ts` — OKLab/OKLCh, chroma-only gamut mapping (a
  per-channel clip shifts hue, which would make the distinctness gate measure a different
  ring from the one specified), and `getColourDistance`.
- `packages/tokens/src/categorical.test.ts` — adjacent pairs including the wrap from 10 back
  to 1, the Tableau 10 benchmark asserted per variant per scheme, and a mutation check that
  collapsing two indexes onto one colour is *reported* (it passes every contrast number).
- `yarn check:contrast`: 63 gated pairs per scheme becomes **113**, all passing, tightest
  margin 3.00:1 on `border.strong` and 3.15:1 on the categorical borders.
- Reference palettes measured with the same `getColourDistance`, from published hex values:
  d3 `category10`, Tableau 10, Okabe–Ito, ColorBrewer Set2 and Paired, Radix 9-step accents.
