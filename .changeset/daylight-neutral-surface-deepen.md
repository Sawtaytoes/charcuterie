---
"@charcuterie/tokens": patch
---

daylight/light: deepen `intent.neutral.surface` `#EDF0F5`→`#E6EBF2` and
`surfaceHover` `#E3E8EF`→`#DEE4EF`. The neutral surface was only ΔE≈12 from the
page base, so a `ghost`/`outline` neutral hover — which lands on `surface` — was
nearly imperceptible on light chrome (the affordance the owner originally
flagged; dark mode already read). The new surface is ΔE≈21, matching how the
chromatic intents already read; the two-step `soft` ramp (surface at rest,
surfaceHover on hover) is preserved and `surfaceHover` stays distinct from the
`#DDE2EA` border so `soft`'s outline does not vanish on hover. Neutral content
on the new surface is 8.29:1 (was 8.70:1); all variants still clear WCAG 2.2 AA.
See the daylight-neutral-surface-deepened decision.
