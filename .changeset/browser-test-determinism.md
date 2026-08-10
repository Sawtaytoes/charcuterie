---
"@charcuterie/storybook-config": minor
---

Add `@charcuterie/storybook-config/testing` — `FREEZE_MOTION_CSS` and `freezeMotion(document)`,
the motion/caret/scroll freeze that keeps an automated look at a story deterministic.

It ships as its own subpath rather than from the Node-half barrel so the string never
reaches a browser bundle: the built Storybook a developer opens contains neither the rule
nor the injector, because **motion is part of the design and freezing it in the dev server
would hide the thing being reviewed**.

Consumed by both of this repo's automated suites — the VRT capture (which already had a
local copy of the rule, now deduplicated) and the `ui-dom` Vitest project (which had
nothing). See
`docs/decisions/2026-08-10-automated-suites-freeze-motion-fonts-and-post-mount-effects.md`.
