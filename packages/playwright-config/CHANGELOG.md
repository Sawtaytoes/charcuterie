# @charcuterie/playwright-config

## 2.1.0

### Minor Changes

- 753b54e: `expectNoHorizontalOverflow` now also fails when a box with `overflow-x: hidden` or `clip` holds content wider than itself. In an app built on `Shell` (`overflow-x: clip`) and `Main` (`overflow-x: hidden`) the document is structurally never wider than the window, so overflow is cut off out of sight and the old document-only check passed it — tally-marks found both of its narrow-window defects in screenshots after the check had passed. Deliberate side-scrollers (`overflow-x: auto`), ellipsis truncation and visually hidden elements are not flagged; a component that clips on purpose is excluded with `{ ignore: [selector] }`.

  New: `expectNoSplitWords(page, { selector? })` fails when a visible heading breaks a word across two lines — what a squeezed layout looks like under `Main`'s `wrap-anywhere`.

  A suite that passed 2.0 may now fail: each new failure is content a person could not see or reach in that window.

## 2.0.0

### Major Changes

- f9aedc2: Every browser test now runs in four named windows: `narrow` (384x824, a Galaxy S23 Ultra),
  `tall` (1080x1920, a portrait monitor), `wide` (1920x1080) and `ultrawide` (3440x1440).

  **`@charcuterie/vitest-config` — breaking.** `createVitestConfig()` builds one Chromium
  instance per window, named `<project>-<window>` (`ui-dom-narrow`, or `chromium-narrow`
  when the project has no `test.name`), instead of a single unnamed one at Vitest's 414x896
  default, so a browser suite runs four times. The project's name leads because Vitest wants
  every instance name unique across the whole run, and a root config that lists several
  browser projects would otherwise define `chromium-narrow` once per project and refuse to
  start. A test reads its window with `inject("viewport")`; `vitest --project '*-narrow'`
  runs one window. New exports: `viewports`, `viewportNames`,
  `createViewportInstances({ names?, project? })`, `createCiTimeouts()` (the factory's 30s CI
  budget, for a hand-rolled config that cannot adopt the whole factory — four windows is four
  times the runner's load), and the
  `@charcuterie/vitest-config/viewports.js` subpath. An app's own `test.browser.instances`
  now **replaces** the default rather than being concatenated onto it.

  **`@charcuterie/playwright-config` — breaking.** The default `projects` are the same four
  windows (`chromium-narrow` …) instead of one `chromium` project, so `--project chromium`
  no longer matches. `narrow` sets `isMobile`, `hasTouch` and a 3.75 pixel ratio. New
  exports: `createViewportProjects(names?)`, and `expectNoHorizontalOverflow(page)` from
  `@charcuterie/playwright-config/responsive.js`, which fails when anything makes the page
  wider than the window and names the widest offenders.

### Patch Changes

- Updated dependencies [f9aedc2]
  - @charcuterie/vitest-config@2.0.0

## 1.1.0

### Minor Changes

- 63d307a: Give a test and an assertion a bigger budget on CI, where the runner is shared. Playwright waits 5s for an assertion and 30s for a test; Vitest waits 5s for a test. Both defaults are sized for a machine running one suite, and this fleet's runner is not that machine — it takes every repo's jobs, so one merge round puts several repos' CI plus image builds on the same host. On 2026-09-22 that cost mail-sifter both test jobs on its default branch: `unit-tests` timed out on one synchronous better-sqlite3 test that takes 33ms locally, while its 65 siblings in the same file passed, and `e2e-tests` could not find `getByRole("dialog")` inside 5s on two consecutive retries, on a commit that had passed on its own pull request four minutes earlier. A failed test job skips `docker-deploy`, so the merge did not ship. On CI, Playwright now allows 15s an assertion and 90s a test, and Vitest allows 30s a test and 30s a hook. Off CI every default is unchanged, so a real hang still fails fast while you are writing the test. A larger budget costs a passing test nothing: the clock stops when the assertion resolves or the test returns. An app's own `timeout`, `expect.timeout` or `testTimeout` still wins.

## 1.0.1

### Patch Changes

- 4e4ab17: Ship TypeScript declarations for the factory functions so strict-TS apps can import them in `vitest.config.ts` / `vite.config.ts` / `playwright.config.ts` without an implicit-any (TS7016) error.
