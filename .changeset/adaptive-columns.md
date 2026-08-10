---
"@charcuterie/tokens": minor
"@charcuterie/ui": minor
---

Add `AdaptiveGrid` and `useAdaptiveColumns` — a wrapping grid that spends height before it
spends width.

Every wrapping grid in the fleet today is `auto-fill, minmax()`, which takes every column
the window allows and lands on seven items strung across an ultrawide with nothing below
the fold. Meanwhile the pages around them are one column at a very large max-width, so a
1440px monitor renders a 56rem ribbon of content down the middle. This is both halves of
that, lifted out of rip-deck's `useLayoutColumns` and made generic.

A column is added only when the items will **not** stack inside the viewport; the
container's inline size can only ever cap that answer, never produce it. The visible
consequence is deliberately non-monotonic — 1440x900 takes three columns while a larger
1920x1080 takes two, because the taller window stacks the same items in fewer stacks. The
content cap then widens with the count (1 column → 56rem, 2 → 72rem, 3 → 106rem), so a page
earns its width by having something to fill it with.

- `chooseColumns` is the rule as a pure fold, checked in Node against the eleven-size spec
  table it was ported with. Every number rip-deck kept module-private is now a parameter:
  the column floor, the item block size, the chrome block size, and the caps.
- `useAdaptiveColumns` measures its container with a `ResizeObserver` rather than reading
  `window.innerWidth`, so a grid beside a rail is told the truth about the room it has. The
  block size stays a viewport question behind an injectable resolver, because a grid in
  normal flow is exactly as tall as its contents and would always answer "it fits".
- `contentInlineSize` joins `@charcuterie/tokens` beside `screen` and `containerQuery`, and
  emits `--content-inline-size-*`. How far the eye should track across a line is a
  structural fact about the fleet, not something a visual variant gets to change.
- The column floor defaults to `containerQuery.sm` instead of rip-deck's hand-measured
  380px. A test asserts the two agree on every row of the spec table, so it is a rename
  rather than a behaviour change.
