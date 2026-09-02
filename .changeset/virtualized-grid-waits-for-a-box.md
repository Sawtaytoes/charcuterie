---
"@charcuterie/ui": minor
---

`VirtualizedGrid` mounts nothing until its container has a box, so a grid inside a `hidden` tab panel no longer scrolls the page when it is revealed.

`display: none` gives an element no boxes, so a grid inside one measured a 0px container (one column) and 0px-tall rows and stored both as facts. Revealing the panel corrected every one of them at once, and `@tanstack/react-virtual` is entitled to read a correction as a resize and compensate the scroll position for it — which moved Docket's Triage page by up to 1,190px and took the tab bar off the top of the screen.

`useAdaptiveColumns` now returns `isLaidOut`, which is what the grid gates on. A zero inline size is the absence of a measurement, not a measurement of zero.
