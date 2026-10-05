---
"@charcuterie/vitest-config": major
"@charcuterie/playwright-config": major
---

Every browser test now runs in four named windows: `narrow` (384x824, a Galaxy S23 Ultra),
`tall` (1080x1920, a portrait monitor), `wide` (1920x1080) and `ultrawide` (3440x1440).

**`@charcuterie/vitest-config` — breaking.** `createVitestConfig()` builds one Chromium
instance per window (`chromium-narrow`, `chromium-tall`, `chromium-wide`,
`chromium-ultrawide`) instead of a single unnamed one at Vitest's 414x896 default, so a
browser suite runs four times. A test reads its window with `inject("viewport")`. New
exports: `viewports`, `viewportNames`, `createViewportInstances(names?)`, and the
`@charcuterie/vitest-config/viewports.js` subpath. An app's own `test.browser.instances`
now **replaces** the default rather than being concatenated onto it.

**`@charcuterie/playwright-config` — breaking.** The default `projects` are the same four
windows (`chromium-narrow` …) instead of one `chromium` project, so `--project chromium`
no longer matches. `narrow` sets `isMobile`, `hasTouch` and a 3.75 pixel ratio. New
exports: `createViewportProjects(names?)`, and `expectNoHorizontalOverflow(page)` from
`@charcuterie/playwright-config/responsive.js`, which fails when anything makes the page
wider than the window and names the widest offenders.

