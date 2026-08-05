# The neutral ghost-hover deepening is swept to `layered` and `hairline` too

- **Status:** Accepted
- **Date:** 2026-08-05
- **Type:** Tokens (visual)
- **Supersedes:** —
- **Superseded by:** —

## Decision

The neutral `surface` deepening done for `daylight`
([record](2026-08-05-daylight-neutral-surface-deepened-for-ghost-hover.md)) is
applied to the two other light variants that had the same weak neutral surface:

- **layered** (light): `surface` `#EDEAF0`→`#E8E4EC`, `surfaceHover`
  `#E4E0E9`→`#DFDBE7`.
- **hairline** (light): `surface` `#EFECE6`→`#ECE8E1`. `surfaceHover` stays
  `#E7E3DB` — it was already a deep enough step, and hairline's border sits far
  below it, so only the resting surface needed to move.

**legible is deliberately left alone** — its neutral surface is already ΔE≈23
from base, on par with the chromatic intents. Dark schemes are untouched
everywhere (they already read).

## Context

The daylight record fixed the default variant and explicitly scoped itself
"daylight only — the other light variants are untouched for now." Measuring all
four light variants' neutral `surface` against their own page base settled which
of the rest actually needed it:

| variant | old ΔE(surface, base) | action |
| --- | --- | --- |
| layered | **11.1** (the weakest of all four) | deepen → 20 |
| hairline | **15.3** (borderline) | deepen → 22 |
| daylight | 11.7 → already fixed | — |
| legible | 23.2 | leave |

A neutral `ghost` button is transparent until hovered, then lands on `surface`;
below ~ΔE 18 that hover is nearly invisible on light chrome. Deepening to ΔE≈20
matches how the chromatic intents already read.

## Why

Same reasoning as the daylight record — deepen the token rather than repoint the
role, so `ghost`→`surface` stays uniform across all six intents and the two-step
`soft` ramp is preserved. Done as a sweep, per-variant by the numbers rather than
blanket, so a variant that was already fine (`legible`) is not disturbed. The
owner reviewed a served before/after of both variants (ghost toolbar + a `soft`
sanity panel) and approved.

## Evidence

- Neutral content on the new surfaces: layered **8.38:1**, hairline **8.29:1**
  (need 4.5); contrast gate reports every variant/scheme pair 0 failing.
- ΔE(surface, base): layered 11.1→**19.8**, hairline 15.3→**22.4**;
  `surfaceHover` stays lighter than each variant's border, so a `soft` outline
  survives hover.
- Before/after served over `devshare`
  (`charcuterie-ghost-hover-sweep-layered-hairline`) at review time.
