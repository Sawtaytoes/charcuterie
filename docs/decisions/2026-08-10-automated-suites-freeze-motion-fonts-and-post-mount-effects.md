# The automated suites freeze motion, wait for fonts, and settle post-mount effects — the dev Storybook does none of it

**Status:** Accepted
**Date:** 2026-08-10
**Type:** Testing
**Supersedes:** —
**Superseded by:** —

## Decision

Both automated suites that look at a rendered story — the **VRT capture** and the
**`ui-dom`** Vitest project — run behind the same three-part preamble:

1. **Motion off.** `FREEZE_MOTION_CSS` zeroes `animation-duration`, `animation-delay`,
   `transition-duration` and `transition-delay`, transparents `caret-color`, and forces
   `scroll-behavior: auto`.
2. **Fonts first.** `await document.fonts.ready` before anything measures anything.
3. **Post-mount effects settled.** One frame past mount before the DOM is read.

The definition is **shared**, at `@charcuterie/storybook-config/testing` — its own subpath,
not the Node-half barrel, so the string never reaches a browser bundle.

**None of it applies to the Storybook a developer opens.** Motion is part of the design and
the owner reviews it; a dev server that freezes it hides the thing being designed.

## Context

The owner asked for the first part directly:

> "We should be able to disable animations in Storybook for the purposes of running VRTs
> and always when running tests. That should help a lot. I do this at work, but I don't know
> exactly what we used to disable them outright. Something to consider if we wanna keep
> reliability."

The trigger was CI flake. Three different `ui-dom` tests had failed intermittently across
branches — `ButtonLink > is a link, not a button` (axe `color-contrast`, 4.47 against the
4.5 threshold, reported at "font size: 11.3pt (15px)"), `Toast > the region names itself…`,
and `Dialog > a long body scrolls inside the clamp` (axe `scrollable-region-focusable`) —
while the same commit passed **five runs in a row locally**. Green on a quiet machine and
red on a busy one is the signature of a race, not of a broken assertion.

`vrtCapture.mjs` already had all three mitigations. It learned them the expensive way:
`vrt` was the sole failing job across three master runs, non-deterministic enough that one
commit produced "2 changed" and then "1 changed" on a re-run. **`ui-dom` had none of them.**
That asymmetry — one suite hardened, its sibling not — is the whole finding.

## Why

**A shared definition, because the two suites had already drifted.** The capture script's
`freezeStyle` was a local constant, so nothing connected it to the sibling project with the
same problem. It is now imported by both.

**An override stylesheet rather than emulating `prefers-reduced-motion`.** The alternative
was tempting: this repo genuinely honours that media query — `styles.css` switches the four
looping `charcuterie-*` affordances off inside it, because a `0ms` looping animation still
holds its first keyframe — so emulating it would exercise a real code path instead of
bolting an override on top. It was rejected on two counts. It would make both suites test
the **reduced-motion rendering**, which is not the rendering the owner reviews; and it would
re-baseline every VRT shot containing one of those affordances. The override is surgical: it
zeroes durations without switching the page to a different documented rendering. The
reduced-motion path keeps its own coverage in `tailwindCandidates.test.ts`, which asserts
every looping class is switched off inside the media query.

**Fonts, because the fallback is a different size.** Chromium lays out with fallback metrics
until Victor Mono / Outfit / Baloo arrive, and the fallback has different widths and line
heights. Whether a body overflows its clamp, whether a label truncates, and how tall a
region is are then decided by a race against the network. `Dialog > a long body scrolls
inside the clamp` asserts on exactly that overflow, and it is one of the tests that failed
in CI on a branch that does not touch it. Top-level `await` in the setup file is a barrier,
not a hint: it is awaited before any test in that file runs.

**The settle, because axe runs the instant `run()` resolves.**
`storybook-addon-pseudo-states` applies its forced `:hover`/`:focus`/`:active` classes **a
tick after render**, not during it — `vrtCapture.mjs` documents that window and closes it
after "a real flake seen on `*--all-states` stories". `ui-dom` had the identical window and
never closed it, and the consequence there is worse than a pixel diff: the a11y addon's
`afterEach` audits the story the moment the mount resolves, so a forced state that lands
late is audited un-forced and one that lands early is audited hovered. That is a contrast
check reading `intent-accent-solid` on one run and `intent-accent-solid-hover` on the next
— precisely the shape of `ButtonLink`'s intermittent failure, whose reported colour
`#6A64F0` **is** the daylight `solidHover`.

## Evidence

**Two hypotheses were tested and refuted before this one was built**, both worth recording
so they are not re-proposed:

1. **"`page.viewport()` resizes the shared browser window, so concurrent files see 390px
   mid-run."** False. In Vitest browser mode `page.viewport()` posts a `viewport` event
   carrying an `iframeId`, and the orchestrator's `setIframeViewport` resizes **that iframe
   element** (plus a CSS scale) — it never calls Playwright's `page.setViewportSize()`. With
   `isolate` defaulting to true, each file gets its own iframe keyed by filepath. Measured
   with a probe that threw on any width other than the 414px default: across a full run only
   the three files that call it ever reported another width; every other file, including all
   three flaky ones, reported exactly 414 every time.
2. **"A stale mouse position leaves an element in `:hover` when the next file's axe scan
   runs."** Plausible — it would explain a `solidHover` colour — but a probe asserting
   `document.querySelectorAll(":hover")` was empty at the start of every test found nothing
   across three full runs. Not the mechanism here, though it remains the reason the settle
   is about *forced* pseudo-state classes rather than real pointer state.

**The settle's first implementation broke three tests, which is itself the evidence for how
it is written now.** A naive double `requestAnimationFrame` barrier turned
`Toast.test.tsx`'s three passing tests into a flat 15-second timeout: that file **stubs
`requestAnimationFrame` and holds the callbacks**, deliberately, to prove a dismiss arriving
during the enter frame is not undone by it. The settle handed its own continuation to that
stub and was never released. It now binds the native `requestAnimationFrame` at module load,
before any test can replace it — a true frame barrier that a stub cannot capture, and which
leaves the stubbing test's own frames alone.

**Five consecutive full `ui-dom` runs on the final commit: 222/222 passing every time**, at
11–12s wall each — the same as before the change, so the settle costs nothing measurable.
The baseline was also 5/5 locally, which is the point: local runs never reproduced the CI
flake, so the fix is justified by mechanism and by parity with the suite that already had
it, not by a red-to-green local run.

**The dev Storybook is untouched, verified rather than asserted.** After a clean
`build:storybook`, `charcuterie-freeze-motion` appears **zero** times in
`storybook-static` and the `freezeMotion` identifier is absent from every chunk. (One
`caret-color: transparent !important` does appear there — it is Storybook's own internal
rule, paired with `animation-play-state: paused`, and predates this change.)
