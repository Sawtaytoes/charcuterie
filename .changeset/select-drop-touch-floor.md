---
"@charcuterie/ui": patch
---

Select: drop the per-component 44px min-touch-target floor so its height
matches Button (and every other control) at the same `size`. Height now comes
from the shared control-size/density system only — at desktop density `md` is
40px, not 44px; touch sizing remains the density axis's job. See the
controls-share-one-height decision.
