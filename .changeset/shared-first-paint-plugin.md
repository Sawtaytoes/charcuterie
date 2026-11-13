---
"@charcuterie/vite-config": minor
---

Add `createFirstPaintPlugin()` at `@charcuterie/vite-config/first-paint`. It injects the `@charcuterie/tokens` first-paint script at the top of `<head>`, so a themed app sets `data-scheme` and paints its canvas before the first frame. It replaces the `vite/firstPaint.ts` copy that eight apps carried. `variant` and `storageKey` are optional, and `buildFirstPaintScriptBody()` returns the script without its wrapper for tests.
