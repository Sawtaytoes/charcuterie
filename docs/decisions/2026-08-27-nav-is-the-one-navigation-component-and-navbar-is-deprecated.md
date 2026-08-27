# `Nav` is the one navigation component, and `NavBar` is deprecated

**Status:** Accepted
**Date:** 2026-08-27
**Type:** Component + API contract
**Supersedes:**
[a top nav folds whole into a menu of real links](2026-08-26-a-top-nav-folds-whole-into-a-menu-of-real-links.md)
(the fold rules survive verbatim; the separate component does not).
Completes
[the app shell is `Shell` / `Header` / `Rail` / `Main`](2026-08-10-the-app-shell-is-shell-header-rail-main.md).
**Superseded by:** —

## Decision

**0. There is exactly ONE navigation component, and it is `Nav`.** `NavBar` shipped thirteen
minutes before this work opened its pull request, from a second agent solving the top-bar
half of the same problem. It is now a thin adapter over `Nav`, marked `@deprecated`, and
**removed in the next major**. Every behaviour it documented survives — the measured
whole-row fold, the real `<a href>` in both the bar and the panel, `menuAlign`, `menuIcon`,
`menuLabel`, `menuPlacement`, `size` — under the same names. `currentHref` becomes
`activeHref`, and that is the entire migration.

The owner made this call directly:

> "Looks like this was the top-nav option 1 we decided not to keep in the end. It was put
> here for Docket, but we're changing our approach, so this may no longer be required OR we
> can keep it as an alternative navigation mode as well to not break that app. Let's convert
> NavBar to the new nav we've build and deprecate this from Charcuterie set to remove it in
> the next version."

**1. `@charcuterie/ui` owns the app's destinations as one component, `Nav`.**

It takes `items` and `activeHref` and draws them in one of five layouts:

| `layout` | Is |
| --- | --- |
| `bar` | a row inside `Header`, folding **whole** into one menu button when it stops fitting |
| `rail` | a column inside `Rail` |
| `railIcons` | the same column with the labels dropped to tooltips |
| `bottom` | a strip along the foot of the Narrow View |
| `menu` | a panel behind a control the app supplies |

**2. Every item is a real `<a href>`,** through the injected `RouterLinkProvider`. An
`isExternal` item is a plain anchor with `target="_blank"` and `rel="noopener noreferrer"`.

**3. `icon` is optional on `NavItem` and REQUIRED on `NavRailItem`.** A `bar` never takes the
label away, and Docket's nine destinations are words — inventing nine glyphs to satisfy a
type would be worse than the problem. A rail is the other case, and `NavRailItem` is the same
shape with `icon` made required.

**`items` is deliberately NOT discriminated on `layout`.** The main call site passes
`layout={navLayout.layout}` straight from `useNavLayout` — a variable, not a literal — so a
union that split the item type by layout would force a `switch` at the one place this
component exists to make short. The union splits on `menu` and only on `menu`, because that
is the layout whose trigger goes in the `Header`, so the app is already writing that branch.

**4. The active item carries `aria-current="page"`** as well as a background, and matching
is: exact path first, then the longest **path-segment** prefix; the root matches only
itself; an external item never matches; query and fragment are stripped first.
`getIsCurrentHref` (the per-item rule, kept from `NavBar`) and `resolveActiveKey` (the
whole-list answer) are both exported, so an app can assert its own table without mounting
anything.

**`NavBar` shipped a defect here and this fixes it.** It asked `getIsCurrentHref` once per
item, so a bar holding `/settings` and `/settings/labels` marked **both** current while the
reader was on the deeper one — against its own decision record, which says a nav with two
current items has stopped saying anything. There was no test for the case. `resolveActiveKey`
takes the deepest match, **by path rather than array position**, so the order a product lists
its destinations in never decides which one lights up.

**5. `bar` folds by MEASUREMENT, not by breakpoint** — `NavBar`'s rule, kept whole. It reuses
`useToolbarOverflow` rather than forking the measurement, and folds all-or-nothing because a
nav's order is the shape of the product and half of it behind a button is a rule no reader
can learn. `useNavLayout` does not reach that axis; a `bar` needs no hook at all.

**6. The width rule for the RAIL is `useNavLayout`, and it is the library's.** `rail` at `64rem`
(`screen.lg`), `railIcons` at `48rem` (`screen.md`), `menu` below that, plus a manual
override, plus where the override is remembered. The override does not reach the narrow
state, and a remembered choice is kept rather than cleared.

**7. `layout="menu"` is a `Popover`, not a `Menu`** — and so is the folded `bar`'s panel.

## Context

The owner, looking at QueuePilot's landing page, where the destinations were text links
inside one page's body:

> "I wanna rethink these nav items… If you look at Docket, it uses top-nav buttons. Mail
> Sifter as well, and some other apps too. On mobile, those buttons turn into a menu.
> That's the preferred way. I'd like QueuePilot to follow the same structure as other apps.
> Hopefully, all Charcuterie apps can eventually settle on a standardized way of doing
> navigation."

And, after seeing six shapes drawn as served HTML:

> "But 3 is really nice. I love the side nav with icons! … The Icon rail in 4 is fantastic.
> When you're even more narrow, that makes it easier to deal with. It'd be nice to allow
> switching between the two manually and shifting it down automatically based on the window
> width. If you go even more narrow, then it switches to the hamburger menu version."

He also asked whether the plain top bar has a home in this fleet, which is why `bar` ships
rather than being dropped: it does — see *Why*.

## Why

**The 08-10 shell shipped a rail with nothing in it.** `Shell`, `Header`, `Rail` and `Main`
solved the frame, and every one of the twelve UI repos still writes its own destinations or
has none. Surveyed with `rg -uu` across the fleet: **two repos contain a `<nav>` at all.**
Docket hand-rolled a row of `NavLink`s with the collapse rule in `styles/tailwind.css`,
Folio hand-rolled another, and the other ten — ai-usage, gallery-downloader, image-viewer,
mail-sifter, mux-magic, points-market, portly-controllers, queuepilot, rip-deck,
board-game-picker — have no persistent destinations anywhere.

**The two that exist already disagree, and neither disagreement was a decision.** Docket
*wraps*: `.docket-app-nav { flex-wrap: wrap }` with a container query at `42rem`, so on a
390px phone its nine destinations stand three lines tall. mail-sifter collapses its glyph
rail into one menu at `40rem`. QueuePilot re-parents a toolbar between two slots at `760px`.
Three breakpoints, three behaviours, three authors, one question.

**`icon` is required because `railIcons` takes the word away.** Every other icon in this
library sits beside a label that stays, so every other icon is optional. A collapsed rail is
one `--control-height-lg` square and shows nothing else — an item with no glyph is a blank
row that still navigates, and there is no visual defect to notice, because the row looks
like padding. Optional would move that failure out of the type checker and into the first
time somebody drags a window narrow. The library still **ships** no icons: a glyph in a
default renders as nothing where the font lacks it
([decision](2026-07-29-ship-no-icons-and-no-symbol-glyphs.md)), so the app brings lucide.

**Links, because a button is identical in a screenshot and is not a link.** mux-magic and
QueuePilot navigate with `useNavigate` + `onClick` today. That loses middle-click,
ctrl-click, "open in a new tab", the status-bar preview and "copy link address", and a
review cannot see any of it
([decision](2026-08-10-buttons-are-actions-links-are-navigation.md)). `RouterLinkProvider`
already exists for exactly this and already handles the case a router must not intercept.

**Segment-aware matching, because `startsWith` ships a bug that looks fine.** `/board` is a
string prefix of `/boardgames`, so a naive test lights two unrelated destinations. The
separator is part of the rule. **Longest wins**, so an app with `/settings` and
`/settings/labels` marks the page you are on rather than whichever sits earlier in the
array. **The root is exempt from the prefix rule**, or Home is current on every screen and
the state carries no information. **Query and fragment are stripped**, which is the case
that breaks first in a real app: the item matched on arrival and stopped matching the
moment a filter was applied.

**The width rule is the library's, and the placement is the app's.** These are not the same
half. `menu` puts a control in the `Header` — a different corner of `Shell`'s grid from a
side rail — and no media query moves an element across a grid, so `Rail` cannot restyle its
way there the way it restyles its way to a horizontal strip. What was actually being
rewritten per app is *at what width*, *with what override*, and *remembered where*, and that
is what `useNavLayout` returns. The app writes two `if`s.

**The override is refused below the narrow breakpoint** because `expanded` on a 390px screen
is a 212px rail beside 178px of content. It is **kept rather than cleared**, so rotating a
tablet back to landscape restores the rail the reader asked for instead of silently
forgetting it — the same reason `ColorScheme` keeps `system` as a mode rather than resolving
it away.

**A `Popover`, because `Menu`'s items are `onSelect` on a `<button>`.** That is right for
what a menu usually holds — undo, redo, a scheme cycle, which is exactly mail-sifter's menu
— and wrong for a destination, for every reason in the links paragraph above. Reusing
`Menu` would have meant either `<a role="menuitem">` or a menu whose rows are not links, and
the second is the bug this component exists to remove. `Popover` is already the anchored,
dismissable, body-portalled panel that takes arbitrary children, and it is `modal={false}`,
so the caret is not trapped in what is a disclosure rather than a dialog.

**`bar` ships rather than being cut, because half the fleet wants it.** Route counts from
each app's own router: ai-usage 2, portly-controllers 2, image-viewer 2, folio 3, mux-magic
4, board-game-picker 6. A 212px rail costs those more than it returns, and rip-deck exists
to fit as many bays on a screen as possible. Docket (17 routes, 9 destinations) and
mail-sifter (11) are the rail's cases. One component with a `layout` prop, the same call
`Rail` already makes with `side`.

**`bottom` is not the default narrow answer**, and the owner drew that line himself:

> "For narrow view, I like the idea of the bottom controls, but this app has too many, and
> you're not going to be switching between the ones shown more than once… But leave the
> other as an option in case an app only has a few nav items that _always_ need to be open,
> and you're shifting between them often."

So it is a layout an app opts into, not a breakpoint the library picks.

## Evidence

The fleet survey is `rg -uu '<nav'` across the twelve owned UI repos from the workspace
root — a plain `rg` there is swallowed by the parent's ignore rules and answers zero for
every child, which is indistinguishable from the finding. Two repos hit: `docket` (4 files)
and `folio` (3). Docket's wrap rule is `packages/web/src/styles/tailwind.css:1424-1450`;
mail-sifter's `40rem` collapse is `packages/web/src/components/AppShell.tsx:113`;
QueuePilot's `760px` re-parent is `web/src/App.tsx`.

Six shapes were drawn as served HTML and reviewed before any code was written, which is what
the [preview decision](../../agentic/docs/decisions/2026-07-25-preview-ui-changes-as-served-html.md)
asks for. The owner picked the rail with a manual override, kept the bottom bar as an
option, and ruled the plain top bar out **for QueuePilot** while asking where else it fits.

`bottom` is the one layout that takes `MIN_TOUCH_TARGET_CLASS`'s 44px floor rather than a
control height. That is allowed here and forbidden elsewhere for the reason the
[shared-height decision](2026-08-05-controls-share-one-height-no-per-component-touch-floor.md)
gives: it is a genuinely standalone tap target and shares a row with no other control.

`Nav.test.tsx` pins the parts a screenshot cannot show — that every item has an `href`, that
exactly one carries `aria-current`, that a collapsed rail still has a name on every row,
that an external item gets both `target` and `rel` and is never current, and that a long
label's computed `text-overflow` is `ellipsis`. That last one is not decoration: only
`truncate` or `wrap-anywhere` shrinks the min-content size a flex item's automatic minimum
resolves against, and the failure is invisible until a column is pushed out of the viewport
([decision](2026-08-11-a-flex-rows-text-child-must-declare-how-it-shrinks.md)).

Gates at the time of writing: `build`, `typecheck`, `lint`, `test` (1,672 passing),
`check:contrast` (all variants clear WCAG 2.2 AA), `build:storybook`, and `smoke:storybook`
(405 entries).
