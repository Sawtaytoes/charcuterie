---
"@charcuterie/ui": minor
---

Add `Main`'s `scrollKey`, so Back returns a list to where it was scrolled.

`Shell` makes `<main>` the page's only vertical scrollport, and a browser restores the
**document** scroller — never an arbitrary element, and never at all across a same-document
`pushState` navigation. Pass react-router's `useLocation().key` and the offset comes back.
The restore waits through a `ResizeObserver` for content that arrives after the navigation,
and gives up the moment the reader scrolls.
