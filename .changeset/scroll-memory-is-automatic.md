---
"@charcuterie/ui": major
---

Scroll memory is automatic, and a filter no longer throws the reader to the top.

Two changes, both in the same week-old feature.

**`Main`'s `scrollKey` prop is removed.** The history entry now arrives on a context, and
`ReactRouterAdapter` — new, in the `@charcuterie/ui/react-router` subpath — puts it at the
app root beside the link seam:

```tsx
import { ReactRouterAdapter } from "@charcuterie/ui/react-router"

<BrowserRouter>
  <ReactRouterAdapter>
    <App />
  </ReactRouterAdapter>
</BrowserRouter>
```

A prop is the wrong shape for this, and one release was enough to prove it: the library
shipped the memory, one app wired the prop, and the other three carried on losing the
reader's place with the fix sitting right there in the dependency they already had. A seam
an app has to know about is a seam most apps will not have. One component at the root also
means a seam added later reaches every app that already renders it, on its next release.

An app on another router renders `ScrollMemoryProvider` itself, with any value that
identifies the history **entry** rather than the URL. No provider, no memory — which is
what an app with no router should get.

**An entry now remembers its path, and a new entry on the same path leaves the scrollport
alone.** This is a defect the first release shipped, and it was worse than the bug it
fixed. A filter chip, an expanded group and a selected tab each write a search param;
`setSearchParams` **navigates**, so each one mints a history entry the memory has never
seen. Read as "unseen ⇒ start at the top", pressing a filter threw the reader to the top of
the list they were reading. Measured live on Docket: scrolled to 1200, pressed a group
toggle, landed at 0. So there are three answers rather than two:

| The entry | What happens |
| --- | --- |
| One we have seen | Its remembered offset. Back and Forward land where you left them. |
| New, **same** path | Nothing. The scrollport stays exactly where the reader put it — which is what the page did before any of this existed, so it cannot itself be a regression. |
| New, **different** path | The top, which is what a browser does for a new document. |

An entry is also **seeded on arrival** rather than on its first `scroll` event. A reader who
opens a group and then follows a link never scrolls in between, so the entry they came from
was one the memory had never seen, and Back sent them to the top of a list they were
half-way down.

One leak fixed on the way: the effect's cleanup now disconnects the `ResizeObserver`
unconditionally. It ran through `stopRestoring`, which early-returns once a restore has
landed — so a completed restore left an observer and four listeners on an element the next
entry was about to use.
