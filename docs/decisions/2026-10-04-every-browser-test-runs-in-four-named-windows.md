# Every browser test runs in four named windows

- **Status:** Accepted
- **Date:** 2026-10-04
- **Type:** Testing convention
- **Supersedes:** —
- **Superseded by:** —

## Decision

Every browser test in the fleet runs once in each of four windows, and the list lives in
one file, `packages/vitest-config/src/viewports.js`:

| Name | Size | Reference |
| --- | --- | --- |
| `narrow` | 384x824 | a large Android phone — a Galaxy S23 Ultra in Chrome |
| `tall` | 1080x1920 | a 1080p monitor in portrait |
| `wide` | 1920x1080 | 16:9 |
| `ultrawide` | 3440x1440 | 21:9 |

`createVitestConfig()` builds one Chromium instance per window (`chromium-narrow` …), and
each provides its name to `inject("viewport")`. `createPlaywrightConfig()` builds one
project per window; `narrow` adds `isMobile`, `hasTouch` and the phone's 3.75 pixel ratio,
and a test reads `testInfo.project.metadata.viewport`. A hand-rolled config uses
`createViewportInstances()` or `createViewportProjects()`. A package whose tests call
`inject("viewport")` brings the type in with one ambient file that imports
`@charcuterie/vitest-config/viewports.js` (see `packages/ui/src/vitestProvidedContext.d.ts`).

**A test that fails in a new window is triaged, never pinned back to one window.** Either
the code is wrong at that size — fix it, here when the shape is shared — or the test
measured the window by accident, and it is made to measure what it claims. An assertion
that is genuinely about one kind of window is split with `test.skipIf` / `test.runIf` on
`inject("viewport")`, and the other windows get the assertion that is true for them.

A fixed-size box in a story or a test is `shrink-0`, or it is not fixed.

An app with no browser test runs `expectNoHorizontalOverflow(page)` over its top-level
routes in all four windows.

## Context

Vitest's own default browser window is 414x896 — a phone. Nearly every browser suite in
the fleet named no size, so the fleet had tested at a phone-like width only, by accident,
with no desktop, portrait or ultrawide coverage. The owner asked for the phone, the
portrait screen, 16:9 and ultrawide in every app.

## Why

- A responsive layout breaks on the screens people hold, not on the widths that straddle a
  media query.
- One list feeds three runners — component suites, end-to-end suites and, later,
  screenshots — so a disagreement between them is the app's.
- Pinning a failing test back to one window reopens exactly the gap this closes. Every
  failure in Charcuterie's own first run was informative.

## Evidence

Charcuterie's first four-window run failed 8 of 2568 tests, and none was fixed by pinning:
four were `ContainerBoard`, whose panels were flex items that shrank to a 384px window
while its comment called them fixed; the `lg` Dialog test asserted a width only a wide
window allows; the HtmlEditor test looked for **Bold** in a row that folds into the
overflow panel on a phone (every command there is disabled too, so the editor was right);
the VirtualizedGrid test waited for bottom padding that is correctly 0 when all 48 cards
fit a 3440x1440 window; and two were load races, one of them a synchronous read of a
heading CodeMirror had not drawn yet.

After the fixes the Storybook suite passed 1936 of 1936 and the logic suite 204 of 204.
