# A top nav folds whole into a menu, and every row stays a real link

**Status:** Accepted
**Date:** 2026-08-26
**Type:** Component · Navigation · Accessibility
**Supersedes:** —
**Superseded by:** —

## Decision

`@charcuterie/ui` gains **`NavBar`** — the app's destinations across the top of a header —
and it settles two things that `Toolbar` answers differently on purpose.

1. **It folds WHOLE.** Below the width where the row fits, **every** destination goes into
   the menu together. There is no half-collapsed state: not "four in the bar and five
   behind a button".
2. **A folded destination is still an `<a href>`.** The panel is a `Popover`
   (`role="dialog"`) holding real anchors, never a `Menu` of `onSelect` items.

It **reuses `Toolbar`'s measurement** — `useToolbarOverflow`, unchanged — so there is one
tape measure in the package, not two. `NavBar` reads a single fact off it: whether the
count that fits is the count there is.

## Context

Docket's header nav grew from four destinations to nine. The bar was a CSS grid that gave
the nav a full-width **second row** below the wordmark whenever nine would not fit beside
it, and the CSS said so in a comment:

> NOTHING IS HIDDEN AND NOTHING SCROLLS. All five destinations stay in the document, in tab
> order, at every width — the nav row wraps to a second line instead. […] a disclosure would
> have put a menu between the owner and a link he presses all day.

That reasoning was written when there were **five**. At nine the second row is a third row,
and the owner asked for the fold:

> *"Docket top-nav items don't fold into a menu on narrow/mobile view."*

Asked which shape, he chose the whole fold over a progressive "More" overflow:

> *"Full hamburger below a width"* — below the breakpoint the whole nav becomes one menu
> button; above it, every destination shows. Nothing partial.

Asked where it should be built, he chose the library:

> *"Charcuterie first, then adopt"*

## Why

**Why whole, and not `Toolbar`'s progressive collapse.** `Toolbar`'s items are **ranked** —
`items[0]` is the last thing to collapse, and the array order is a priority list ("the two
things you do to a running job, then the two you do to the deck"). A nav's order is not a
priority list. It is the shape of the product: Docket's reads as the pipeline work moves
along, Triage → Backlog → Phases → Lanes → Board → Archives, and that order is the thing the
nav is *for*. Splitting it leaves "some of the app is up here and the rest is behind a
button", with a boundary that moves with the window and that the reader can never learn.
Both whole answers are legible; the half answer is the only one that is not.

**Why real links, and why this is not a folded `Toolbar`.** A `ToolbarAction` is
`{ label, onSelect }`, and a collapsed one becomes a `MenuItem` — also
`{ label, onSelect }`. So a nav folded into a `Toolbar` is a row of `<button>`s below a
certain width, and it loses middle-click, ctrl-click, "open link in new tab", "copy link
address", the status bar, and the browser's own history. `BuildingAnApp.mdx` already names
`<button onClick={navigate}>` as the fleet's most common navigation defect; introducing it
at narrow widths would be that defect on a timer, and it screenshots identically to the
correct thing, so review would never catch it.

`role="menu"` also permits only the `menuitem` family. A `menuitem` is something you **do**;
a destination is somewhere you **go**. Hence a `Popover`.

**Why measured rather than breakpointed.** The same argument `useToolbarOverflow` already
carries: mux-magic collapses at a hardcoded `480px` and plex-channels at `760px`, and both
numbers are wrong the moment a label lengthens, a destination is added, the density axis
moves, or the reader zooms. Docket's owner browses zoomed in — a 1500px window at 175% zoom
is ~860 effective pixels — so window width was never a proxy for the room the bar has. The
fold has no number in it.

**Why one instance.** The fleet's habit is to render the nav twice and hide one copy with
`hidden md:flex` (mux-magic's `PageHeader` across two ~55-line blocks; mail-sifter's
`TriageQueue` again). Every link is then in the DOM at every width, so an agent driving the
page finds two of each with no way to tell which a human can see, and the copies drift.
`NavBar` mounts each destination exactly once and moves it.

## Evidence

- The owner's report and both design choices are quoted above (chat 2026-08-26).
- Docket's `styles/tailwind.css` carried the superseded reasoning in the `THE APP NAV`
  block, with the measurement (`42rem`) that the wrap-to-a-second-row layout needed.
- **The links are real, and the test suite proved it the hard way.** The first run of
  `NavBar.test.tsx` clicked "Phases" in the folded panel and navigated the vitest iframe to
  `/phases`, failing the run with *"Cannot connect to the iframe. Did you change the
  location?"*. The stories now inject a `RouterLinkProvider` stand-in that calls
  `preventDefault()` after the caller's handler — react-router's own order in `Link`. A
  `Menu` of `onSelect` items could not have produced that failure.
- Gates on the branch: `yarn test` 1660 passed, `yarn typecheck`, `npx biome check .`,
  `npx eslint .`, `yarn check:contrast` (0 failing pairs in all six scheme/mode
  combinations), `yarn build:storybook` and `yarn smoke:storybook` (401 entries clean).

## Consequences

- `Rail` remains the **side** nav and is unchanged. The two collapse differently on
  purpose: a rail becomes a horizontally-scrolling strip, a bar folds into a menu.
- An app that wants a *progressive* nav overflow does not have one, and adding it is a new
  decision record rather than a prop.
- `getIsCurrentHref` is exported from the barrel: an app that marks a destination current
  anywhere else has to ask the same question the same way.
