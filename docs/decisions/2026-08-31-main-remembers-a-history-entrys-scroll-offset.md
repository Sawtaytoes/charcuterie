# `Main` remembers a history entry's scroll offset, because no browser does

**Status:** Accepted
**Date:** 2026-08-31
**Type:** Component / behaviour
**Supersedes:** —
**Superseded by:** —
**Extends:** [2026-08-29-main-is-the-app-shells-vertical-scroll-region.md](2026-08-29-main-is-the-app-shells-vertical-scroll-region.md)

## Decision

`Main` takes `scrollKey` — the history entry's key, which is `useLocation().key` under
react-router. Given one, it remembers where that entry was scrolled to and puts the offset
back when the reader returns to it.

```tsx
const location = useLocation()

<Main scrollKey={location.key}>
  <Outlet />
</Main>
```

Omitted, nothing is remembered. That is the right default for a page with no history to
remember, and it keeps the prop out of the eight consumers that do not route.

Three rules decide when a restore stops: the offset lands, the reader scrolls, or three
seconds pass. Offsets live in memory, capped at fifty entries, least-recently-written
evicted — never `sessionStorage`.

## Context

The owner, on Docket's Projects page:

> "If I scroll, click on an item, then go back, it resets me to the top. We had programmed
> that in when clicking on a link, but it shouldn't do it every time the history changes. It
> should remember where the scroll position was previously. Isn't this handled by Chrome
> already?"

**No, and the reason is this library's own 2026-08-29 decision.** `Shell` fills the viewport
and `Main` — not the document — is the app's one vertical scroll region, so the Header and
the Rail stay available while a page scrolls. A browser's scroll restoration does not follow
it there:

- It remembers **the document scroller's** offset per history entry. `<main>` is an element
  with `overflow-y: auto`, and no browser files an element's offset against a history entry.
- It restores nothing at all across a **same-document `pushState`** navigation, which is
  every link press in a single-page app.

`history.scrollRestoration` therefore has no bearing on this page in either direction, and
there is no browser setting that changes the outcome. Measured against the deployed app:
`document.documentElement.scrollHeight` is 900 on a 900px window while `main.scrollHeight` is
4,422 — the document does not scroll, so there is nothing for the browser to restore.

Nothing had been "programmed in" to scroll to the top, either. The reset is what falls out of
a persistent scrollport whose children are replaced: the new page is shorter, so the browser
clamps the offset to `0`. That has a second consequence the report did not name — navigating
**forward** into a page taller than the offset kept the old scroll position, which is the same
defect pointing the other way. Both go away with the same fix.

## Why

**In `Main`, not in each app.** Five apps in the fleet render a `Shell` with a router. The
scrollport is this library's, the reason it exists is this library's decision, and an app
cannot fix it without reaching into a component it does not own.

**A prop, not a router import.** `@charcuterie/ui`'s main entry must stay router-free —
`sourceRules.test.ts` asserts it — and the fleet runs five different routers. One string prop
is the same seam `contentWidth` uses for the adaptive-columns hook: no import in either
direction.

**The restore has to wait for the content, and that is the whole engineering.** A one-shot
`scrollTop = offset` does nothing on a real page. The commit that changes the route draws a
skeleton; the rows land a fetch later; an offset written against an empty scrollport is
clamped to `0`. Every check a one-shot version could make still passes — the offset was
remembered, the write happened — and the reader is looking at the top of the list. So the
restore re-applies through a `ResizeObserver` on the scrollport and on its content column.

**It gives up on the reader's first scroll.** `wheel`, `touchstart`, `keydown` and
`pointerdown` on the scrollport end the restore. A page that jumps out from under somebody
who has already started reading is a worse bug than the one being fixed.

**The save is suppressed while a restore is in flight**, or the feature eats itself: writing
`scrollTop` on a still-short page clamps to `0` and fires a `scroll` event reading `0`, which
would be saved over the very offset being restored.

**Memory, not `sessionStorage`.** A history key survives a reload; the DOM it described does
not. The app re-fetches, re-measures and often re-orders, so a pixel offset from before the
reload points at a different row. Restoring a stale number is worse than restoring nothing,
because it looks deliberate.

## Evidence

Chat: the owner's report above, with a screenshot of Docket's Projects grid.

Measured in a real chromium against `https://docket.octen.dev/projects` before the fix:
`history.scrollRestoration` is `"auto"`, `main.scrollTop` set to 1800, click a project card,
press Back — `main.scrollTop` reads `0` at +50ms, +200ms, +600ms and +1500ms, with
`main.scrollHeight` back at 4,422 the whole time. The content was there; the offset was not.

Three tests in `Main.test.tsx`, each proved load-bearing by breaking the implementation:

| Removed | Fails |
| --- | --- |
| `scrollKey` from the story | "back returns the list to where it was scrolled" **and** "a restore waits for content" |
| `observer.observe(…)` | "a restore waits for content that arrives after the navigation" |
| the reader-intent listeners | "a reader scrolling during a restore keeps their own position" |
