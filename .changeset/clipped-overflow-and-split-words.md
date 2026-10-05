---
"@charcuterie/playwright-config": minor
---

`expectNoHorizontalOverflow` now also fails when a box with `overflow-x: hidden` or `clip` holds content wider than itself. In an app built on `Shell` (`overflow-x: clip`) and `Main` (`overflow-x: hidden`) the document is structurally never wider than the window, so overflow is cut off out of sight and the old document-only check passed it — tally-marks found both of its narrow-window defects in screenshots after the check had passed. Deliberate side-scrollers (`overflow-x: auto`), ellipsis truncation and visually hidden elements are not flagged; a component that clips on purpose is excluded with `{ ignore: [selector] }`.

New: `expectNoSplitWords(page, { selector? })` fails when a visible heading breaks a word across two lines — what a squeezed layout looks like under `Main`'s `wrap-anywhere`.

A suite that passed 2.0 may now fail: each new failure is content a person could not see or reach in that window.
