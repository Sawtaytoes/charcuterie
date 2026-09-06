---
"@charcuterie/ui": patch
---

`Main` is the containing block for its own content, so a page stops drawing a second
scrollbar.

`<main>` is the page's only vertical scrollport, but it was `position: static` — so an
absolutely positioned descendant resolved against `Shell`, which sits outside the
scrollport. `<main>`'s `overflow-y` had no authority over it, and its static position deep
down a long document landed as scrollable overflow on `documentElement`. The page grew to
reach it and the reader got a **second scrollbar** beside `<main>`'s own.

The box does not have to be exotic, which is why this went unnoticed. Tailwind's `sr-only`
is `position: absolute`, so one visually hidden `(opens in a new tab)` span in a document
footer is enough. Measured on Folio at 1440x900: `<main>` 835px tall,
`document.documentElement.scrollHeight` 2085 — the span's offset, exactly.

`Main` now sets `position: relative`, and `overflow-x: hidden` with it. The `relative` moves
every absolutely positioned descendant's containing block from `Shell` to `<main>`, which
also moves what clips them sideways — `Shell`'s `overflow-x: clip` no longer reaches them, so
a drawer parked at `translateX(110%)` inside `Main` would otherwise draw a horizontal
scrollbar on the scrollport. `hidden` rather than `clip` because `<main>` already scrolls on
the other axis, where the browser computes `clip` to `hidden` anyway.

An app's own parked chrome still belongs in `Shell`, beside `Main` rather than in it. Nothing
in an app changes.
