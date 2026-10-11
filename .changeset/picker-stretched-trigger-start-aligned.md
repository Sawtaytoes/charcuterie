---
"@charcuterie/ui": patch
---

`Picker`: a trigger stretched wider than its content — inside a `Field`, or under `w-full` — now reads like a select. The value sits at the inline start, the chevron at the inline end, and a value too long for the trigger truncates with an ellipsis instead of overflowing. A trigger at its content width renders exactly as before.
