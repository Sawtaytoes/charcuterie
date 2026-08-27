---
"@charcuterie/ui": minor
---

Add `NavBar` — the app's destinations across the top of a header, folding into one menu
button when the row stops fitting.

It folds **whole**: every destination is in the bar, or every destination is in the menu.
`Toolbar` collapses progressively because its items are ranked; a nav's order is the shape
of the product, so half of it behind a button is a rule no reader can learn.

Every row stays a real `<a href>`, in the bar and in the menu. A `ToolbarAction` is
`{ label, onSelect }` and a collapsed one becomes a `MenuItem` of the same shape, so a nav
folded into a `Toolbar` would be a row of `<button>`s below a certain width — no new tab,
no status bar, nothing to copy, and identical in a screenshot.

The fold is measured rather than breakpointed: it reuses `Toolbar`'s `useToolbarOverflow`,
so there is no `collapseAt` and no media query, and a longer label or a reader at 175% zoom
moves the fold on its own. `menuAlign="end"` puts the folded trigger beside the header's own actions instead of
hugging the wordmark; it reaches only the folded row, so the links' own position stays out
of the API. `getIsCurrentHref` is exported alongside it — a parent path is
current for its children, `/` is exact, and the query string is not part of the answer.
