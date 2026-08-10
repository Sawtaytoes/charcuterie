---
"@charcuterie/ui": minor
---

Add the unified app shell — `Shell`, `Header`, `Rail`, `Main` — the fleet's largest
duplicated surface. Ten of twelve UI repos hand-roll the page chrome, three of them in a
file named `AppShell.tsx`, and mail-sifter's and points-market's header elements are a
byte-identical class string arrived at independently.

`Shell` owns the grid frame, the skip-to-content link (missing from all ten hand-rolled
shells), and the single `contentWidth` that `Header` and `Main` both read through context —
points-market ships those two disagreeing, with an 80rem header row above an uncapped
`<main>`. `contentWidth` takes a `screen.*` step (`"lg"` by default), `"full"`, or a
`` `${number}rem` `` literal, which is the seam rip-deck's `contentMaxWidthRem(columns)`
drops into with no import in either direction. `max-w-*` is deliberately not used: Tailwind
v4 owns `--container-*` at different sizes than our `screen.*`.

`Header`'s `isSticky` (default `true`) writes `position: sticky` **and**
`z-index: var(--layer-sticky)` together — mux-magic's `PageHeader` is documented as sticky
and sets only the z-index, so it scrolls away with no error and no failing gate.

`Rail` takes `side="start" | "end"`, a `landmark` of `"complementary"` or `"navigation"`,
and a required `label`. It collapses below `md` into a horizontally-scrolling strip by
restyling the same element — never by rendering a second copy behind `hidden`/`lg:hidden`,
which is what mux-magic and mail-sifter do and which puts every control in the DOM twice at
every viewport.

`Main` is the `<main>` landmark and the capped content column, with `tabIndex={-1}` so the
skip link moves focus rather than only the scroll position, and an `@container` on the
capped column (not on `<main>`, which is wider than its own content) so app grids answer to
the column rather than the window.

The shell refuses to scroll sideways, and it takes three mechanisms because there are three
shapes of the bug: `minmax(0, 1fr)` on the middle grid track, `wrap-anywhere` on the content
column (**not** `wrap-break-word` — only `anywhere` shrinks the min-content size a flex or
grid item's automatic minimum resolves against, so `break-word` still lets a long token
force a column open with no overflowing element box), and `position: relative` +
`overflow-x: clip` on the frame for a panel parked off-screen by a transform, which a
transform does not remove from the document's scrollable overflow region.

Gated at a real 390px viewport: `document.documentElement.scrollWidth <= clientWidth`
against a story carrying all three shapes at once, each separately asserted to overflow.
Removing the clip fails it at 742px. `Shell.mdx` ships three copy-wholesale templates.
