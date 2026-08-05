---
"@charcuterie/tokens": patch
---

layered + hairline (light): deepen `intent.neutral.surface` the same way daylight
was, so a neutral `ghost`/`outline` hover reads on light chrome. `layered`
`#EDEAF0`→`#E8E4EC` (ΔE 11→20 — it was the weakest of all four variants) and its
`surfaceHover` `#E4E0E9`→`#DFDBE7`; `hairline` `#EFECE6`→`#ECE8E1` (ΔE 15→22,
`surfaceHover` already deep enough so only `surface` moves). `legible` is left
untouched — its neutral surface is already ΔE≈23. Neutral content on the new
surfaces stays 8.2–8.4:1; all variants clear WCAG 2.2 AA. See the neutral-ghost
-hover-swept decision.
