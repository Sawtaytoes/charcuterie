---
"@charcuterie/ui": patch
---

`ProgressBar` renders its overlay grid wrapper only when `overlay` is set. From 4.9.0 the wrapper was always present, so the `role="progressbar"` track was no longer a direct child of the root, and an app that sized the track against its parent (`block-size: 100%`) lost its fill.
