# Scroll memory is automatic, and a filter is not a navigation

**Status:** Accepted
**Date:** 2026-09-02
**Type:** Component / behaviour
**Supersedes:** [2026-08-31-main-remembers-a-history-entrys-scroll-offset.md](2026-08-31-main-remembers-a-history-entrys-scroll-offset.md)
**Superseded by:** —

## Decision

Two changes to the scroll memory that shipped two days ago.

**1. There is no prop.** `Main`'s `scrollKey` is removed. The history entry arrives on
`ScrollMemoryContext`, and `ReactRouterAdapter` — new, in the `@charcuterie/ui/react-router`
subpath — supplies it at the app root along with the link seam:

```tsx
import { ReactRouterAdapter } from "@charcuterie/ui/react-router"

<BrowserRouter>
  <ReactRouterAdapter>
    <App />
  </ReactRouterAdapter>
</BrowserRouter>
```

It must sit **inside** the router, because it reads `useLocation()`, and **outside** the
routes, because what it provides belongs to the whole app. `RouterLinkProvider`,
`ReactRouterLink` and `ScrollMemoryProvider` all stay exported for an app on another router,
or one that wants a single seam. No provider, no memory.

**2. An entry remembers its path, and a new entry on the same path leaves the scrollport
alone.** Three answers rather than two:

| The entry | What happens |
| --- | --- |
| One we have seen | Its remembered offset. Back and Forward land where you left them. |
| New, **same** path | Nothing. The scrollport stays where the reader put it. |
| New, **different** path | The top, which is what a browser does for a new document. |

An entry is seeded on arrival rather than on its first `scroll` event.

## Context

The 2026-08-31 record is two days old and both halves of it are corrected here, so this
supersedes it rather than extending it. Its diagnosis stands unchanged and is not repeated:
a browser restores **the document scroller** per history entry, `Shell` makes `<main>` the
app's one vertical scroll region, and nothing is restored across a same-document
`pushState`. The mechanism stands too — the `ResizeObserver` retry, the three stop
conditions, the suppressed save, the fifty-entry in-memory cap.

What was wrong was the shape and one of the rules.

### The prop reached one app out of four

The owner's original report was about Docket. The survey that followed found Folio,
QueuePilot and mux-magic have the identical defect, for the identical reason — they all
render `Shell` and `Main`. The 08-31 change shipped the fix to the library and the prop to
Docket, and left the other three broken with the fix sitting inside a dependency they
already had.

That is not an adoption backlog, it is the wrong seam. The owner named it before the code
was written:

> "That's a problem. I can think of 2 fixes: 1. Put the app into a Web Component or Shadow
> DOM […] 2. Program this into the Charcuterie shell to record scroll positions per route."

Asked which, he chose the automatic form: *"Add a router-aware wrapper in the existing
`@charcuterie/ui/react-router` subpath, so an app that uses it gets scroll memory with no
prop at all."*

Shadow DOM was checked and does not work: a shadow root is not a separate document. It
shares the page's document, history and scroll restoration, and only an `<iframe>` has its
own. The first option was closed on fact rather than on preference.

### A filter is not a navigation

This is the part that was a defect, not merely a shape.

A search param is a navigation to a router and not to a reader. `setSearchParams` pushes a
history entry, so a filter chip, an expanded group and a selected tab each mint a key the
memory has never seen — **on the page the reader is already looking at**. The 08-31 rule
read "unseen ⇒ start at the top", so opening a group threw the reader to the top of the list
they were reading. Before the memory existed the page simply stayed put, which makes this
strictly worse than the bug it was fixing.

Confirmed live on `docket.octen.dev`, on the shipped build: scrolled the Backlog to 1200,
pressed a project-group toggle, the URL became `?open=project_…`, the scrollport went to 0.

Comparing the **path** is what separates the two cases, and "leave it alone" has to be a
third answer rather than a missing one — it is exactly what the page did before any of this
existed, so it can never itself be a regression.

The seeding is the same class of mistake, found while fixing this one. An entry used to be
recorded only when a `scroll` event fired on it. A reader who opens a group and then follows
a link never scrolls in between, so the entry they came from was unknown when they pressed
Back, and they landed at the top of a list they were half-way down.

## Why

**A seam an app has to know about is a seam most apps will not have.** One release measured
that: one app out of four. One component at the root also means a seam added later arrives
in every app that already renders it, on its next release — which is the property a fleet
library needs and a prop cannot give.

**The link seam and the scroll seam ship together for the same reason.** They are both "the
router, injected", both wanted by exactly the apps that route, and splitting them would
repeat the mistake at half scale.

**A major, not a minor.** `scrollKey` is removed rather than deprecated. It has one consumer,
it is two days old, and leaving it would leave a prop whose behaviour is the regression
above.

## Evidence

- Owner's report, on Docket: *"If I scroll, click on an item, then go back, it resets me to
  the top. […] It should remember where the scroll position was previously. Isn't this
  handled by Chrome already?"*
- Owner's two candidate fixes, and his choice of the automatic one, quoted above.
- The regression, measured on the shipped Docket build: scroll 1200 → group toggle → 0.
- `Main.test.tsx` — "expanding a group is a new history entry that does not move the
  scrollport". It fails at `0` against the 08-31 rule and passes at `900` with the path
  comparison; the toggle is in the header rather than in the list, because a control inside
  the scrollport is scrolled into view before it is pressed.
- `ReactRouterAdapter.test.tsx` — a real `MemoryRouter`, a real `useLocation()`, both seams
  from one component. It fails at `0` with `ScrollMemoryProvider` removed from the adapter.
- `scrollMemory.test.ts` — the three-answer table, entry by entry.
