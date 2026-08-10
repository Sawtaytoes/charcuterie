# The app shell is `Shell` / `Header` / `Rail` / `Main`, with one width and a real sticky

**Status:** Accepted
**Date:** 2026-08-10
**Type:** Naming + API contract
**Supersedes:** —
**Superseded by:** —

## Decision

`@charcuterie/ui` owns the page chrome as **four bare-noun components** exported flat from
the barrel:

| Component | Is |
| --- | --- |
| `Shell` | The outer frame. Owns the grid, the skip link, and the one `contentWidth`. |
| `Header` | The `<header>` landmark. `isSticky` defaults to `true`. |
| `Rail` | An optional side column. `side="start" \| "end"`, required `label`. |
| `Main` | The `<main>` landmark and the content column. |

**Naming.** Bare nouns, matching `Button` / `Card` / `Dialog` / `Menu`. Not compound
(`Shell.Header`), not prefixed (`AppShell`, `PageHeader`, `AppHeader`). `Rail` takes a
`side` prop rather than existing as `StartRail` and `EndRail`. Booleans are `is`/`has`
prefixed, so it is **`isSticky`**, never `sticky`.

**The sticky contract.** `isSticky` writes `position: sticky` **and**
`z-index: var(--layer-sticky)` — both or neither, from one boolean. The z-index comes from
the `layer` token scale and never from a hand-picked number.

**The width contract.** `contentWidth` is stated **once, on `Shell`**, and `Header` and
`Main` both read it through context. It accepts three shapes:

1. a `screen.*` step (`"lg"` is the default, 64rem);
2. `"full"`, the explicit no-cap;
3. a `` `${number}rem` `` literal, for a cap computed at runtime.

The `<header>` and `<main>` elements are **full-bleed**; only the row inside each is capped.
`max-w-*` is not used, because Tailwind v4 owns `--container-*` at different sizes than our
`screen.*` — the collision recorded in
[the `--cq-*` decision](2026-07-29-container-query-scale-is-cq-not-container.md). The cap is
an inline `max-inline-size` reading `var(--screen-*)`.

**Responsive by restyling, never by duplicating.** A `Rail` collapses to a
horizontally-scrolling strip below `md` by changing its own classes. Rendering a second copy
behind `hidden` / `lg:hidden` is out.

## Context

The owner's ask:

> "We need a header component. Apps are all doing it differently, and there's no
> standardized way to do a sticky header + narrow view... A Unified App Shell basically."

And, separately, on width — his fifth complaint about the fleet:

> "All these apps seem to be really narrow with a very large max-width. By that I mean 1
> column, but waaaaaaay too wide. In almost all cases, what I really want is something like
> Rip-Deck where the app has a narrower main column but the wrapping grids are all
> full-width in most of these apps only when you have too many items."

He also asked for **"standardized templates we can pull from"**, noting that the controls
differ per app but the structure should not — which is why `Shell.mdx` ships three
copy-wholesale templates rather than only a props table.

## Why

**This is the fleet's largest duplicated surface.** Ten of twelve UI repos hand-roll the
page chrome, and three have a file literally named `AppShell.tsx`. mail-sifter's
(`AppShell.tsx:31`) and points-market's (`AppShell.tsx:18`) header elements are a
**byte-identical string**, arrived at independently:

```
sticky top-0 z-40 border-b border-border-subtle bg-surface-base/90 backdrop-blur-md
```

board-games' (`AppShell.tsx:27`) is the same structure with `sticky` dropped. The other
seven spell the same idea as `PageChrome`, `Header`, `DashboardHeader`, `Layout` (twice),
`TitleBar`, and inline in `App.tsx`.

**Bare nouns, because the qualifier is always the same qualifier.** Every one of those files
is prefixed with `App`, `Page` or `Dashboard`, and the prefix carries no information inside
a shell component — there is no other kind of header this library ships. It also keeps the
set consistent with everything already in the barrel, so `import { Header, Main, Rail, Shell }`
reads like `import { Button, Card }`. Flat rather than compound because `Shell.Header`
would be the only compound component in the package and buys nothing: the children are
placed by CSS grid, not by a parent inspecting them.

**One width, because two widths already disagree in production.** points-market's header row
is constrained (`.pm-constrained`, 80rem) while its `<main>` is
`className="px-4 py-6 sm:px-6"` with no cap at all — so on a wide monitor the page title
sits above content that begins to its left and runs past its right. Both values are
individually reasonable; they were written on different days. A value that has to be stated
twice will eventually be stated twice differently, so it is stated once and read from
context. Either component can still override, but that now takes a prop somebody wrote on
purpose.

**The max-width is the least standardized value in the fleet**, which is why it is a
parameter rather than a constant: `max-w-5xl` (board-games, portly), `max-w-6xl` *and*
`max-w-3xl` mixed within one app (mux-magic), `max-w-7xl` (gallery-downloader, spoolbuddy),
`max-w-[90rem]` (mail-sifter), 80rem (points-market), a raw `1400px` in plain CSS
(plex-channels), JS-computed (rip-deck), and none at all (ai-usage, bambuddy,
image-viewer). The default is deliberately **narrower** than most of those: the owner's
complaint is that one column at `max-w-7xl` is one line of text tracked across a monitor.

**The `` `${number}rem` `` shape exists for exactly one caller.** rip-deck's
`useLayoutColumns` — being lifted into this library in parallel — folds a column count into
a page cap with `contentMaxWidthRem(columns)` (1 → 56rem, 2 → 72rem, 3 → 106rem), a number
no fixed scale can express because it is decided after the viewport is measured. The seam is
one prop in one direction: `ui` does not import the hook, and the hook does not know a
`Shell` exists.

**`isSticky` is one boolean because the two halves came apart in production.** mux-magic's
`PageHeader` (`PageHeader.tsx:173`) is described as a sticky header and sets only
`z-index` — it never sets `position: sticky`, so it scrolls away like any other block and
the z-index has nothing to stack against. It is a flex-column shell wearing a sticky
header's clothes. The CSS is valid, the intent is in a comment, and nobody scrolls a
component in a review. One boolean writing both is the class of mistake this component
removes, and `Header.test.tsx` asserts both halves together because either alone passes on
the broken implementation.

**Responsive duplication is refused because it is measurably expensive.** mux-magic's
`PageHeader` renders its whole control set twice (lines 290–345 and 356–410) and
mail-sifter's `TriageQueue` does it again (lines 337 and 448). Every action is then in the
DOM **twice at every viewport**: tests must be defensively scoped with `within(toolbar)`,
any DOM-driving agent finds two of each control with no way to tell which is visible, and
the two copies drift. A `Rail` only changes *position*, so a media query does the whole job;
plex-channels' `App.tsx:142-170` shows the `useMediaQuery`-over-`useSyncExternalStore`
pattern for when the contents genuinely have to differ, and it is strictly more machinery
for the same guarantee.

**The skip link is the shell's job because all ten hand-rolled shells forgot it.** A
keyboard user on any of those apps starts every page by tabbing through the header. `Shell`
generates the `<main>` id, points the link at it, and `Main` carries `tabIndex={-1}` so
activation moves focus rather than only the scroll position.

## Evidence

The three `AppShell.tsx` files, the two byte-identical header strings, mux-magic's
`PageHeader.tsx:173`, the two responsive-duplication sites, and the eight different
max-widths are all cited above with file and line.

**The horizontal-scroll bug is the gate.** Plex Channels' narrow view scrolls left and right
as wide as its content area (owner-supplied screenshots; a separate agent is fixing that
app). The causes are all shell faults — a grid track ignoring `min-width: 0`, a `100vw`
counting the scrollbar gutter, a sticky header whose inner container is wider than the
viewport — and rip-deck's `BayGrid` documents the same fix from the other end: grid children
need `min-w-0`, because a grid item's automatic minimum is `min-content`, so one long
unbroken string pushes every column out of the viewport.

A concurrent agent fixing that app found two more shapes, and both are now defended here.
The full answer is three-part, because one mechanism does not cover the others:

| Shape | Answer |
| --- | --- |
| A grid track sized to `min-content` | `minmax(0, 1fr)` on `Shell`'s middle track |
| Text ink from a long unbroken token | `wrap-anywhere` on `Main`'s column |
| A box parked off-screen by a transform | `position: relative` + `overflow-x: clip` on `Shell` |

**`wrap-anywhere`, not `wrap-break-word`.** Both break the word onto the next line, so they
are indistinguishable in a screenshot — but only `anywhere` shrinks the **min-content
size** that a flex or grid item's automatic minimum resolves against. Under `break-word`
the ink wraps while the intrinsic contribution stays the full token length, so the string
can still force a column open **with no overflowing element box anywhere in the tree**.
`Main.test.tsx` pins the computed value, because the two cannot be told apart by eye.

**`overflow-x: clip`, and the `relative` that makes it reach.** A transform does not remove
a box from the document's scrollable overflow region, and neither does
`visibility: hidden`. `clip` rather than `hidden` because `hidden` creates a scroll
container, which would become the sticky containing block for `Header` and freeze it;
`clip` creates no scrollport and is the one value that may pair with `overflow-y: visible`.

The `relative` was found by measurement rather than by reading. `overflow-x: clip` only
clips descendants whose containing-block chain runs through the clipper, and an absolutely
positioned box with no positioned ancestor resolves against the *initial* containing block
— sailing past every `overflow` in the tree. With the clip in place but no `relative`, the
parked-drawer fixture reported `shellScroll: 390`, `bodyScroll: 390` and **`docScroll:
742`** at a 390px viewport. The obvious owner, `Main`'s content column, does not qualify:
`container-type: inline-size` computes `contain` to `none` in Chromium and establishes no
containing block for absolute positioning — the drawer's `offsetParent` was `BODY`.

So `Shell.test.tsx` and `Main.test.tsx` resize a real chromium to **390px** and assert
`document.documentElement.scrollWidth <= clientWidth` against a story carrying all three
shapes at once, with each fixture separately asserted to actually overflow so the gate
cannot pass for the wrong reason. **`documentElement`, not `body`** — the parked-drawer case
leaves `document.body.scrollWidth` reading a clean 390 while the page scrolls sideways.
Removing `overflow-x-clip` fails both tests at 742px, which is the mutation check that the
gate is load-bearing.

The viewport resize itself needed a gate too: `page.viewport()` resolves when the driver has
asked for the resize, not when the frame has been laid out at it, so the first assertion in
a file could measure the previous width and fail intermittently with a number nobody can
explain. `setViewport` in `viewport.testHelpers.ts` polls `innerWidth` until the page
agrees.

Three findings came out of building it, all recorded in the code:

- **`@container` belongs on the capped column, not on `<main>`.** `<main>` is as wide as its
  grid track (1184px beside an open rail on a 1440px window) while the column inside it is
  capped at `contentWidth`. A container on `<main>` makes every `cq-*` answer to a width the
  content never has — a grid would go three-up at `--cq-xl` while sitting in 976px of space.
- **`container-type: inline-size` establishes no containing block for absolute
  positioning**, and computes `contain` to `none`, so a container query is not a way to
  corral an app's parked chrome. Measured, not assumed.
- **`getByRole("banner")` is ambiguous under testing-library on any page with `Card`s**,
  because `Card` renders a `<header>` and testing-library's role mapping does not implement
  the HTML-AAM rule that scopes a `<header>` inside `<section>` to generic. Chromium's real
  accessibility tree does — which is what Playwright, a screen reader and an agent read, and
  why axe files no `landmark-unique` — so it is a query-library artefact, and the test says
  so rather than working around it in the component.

Gates at the time of writing: `build`, `typecheck`, `lint`, `test` (698 passing),
`check:contrast` (all variants clear WCAG 2.2 AA), `build:storybook`, and `smoke:storybook`
(237 entries).
