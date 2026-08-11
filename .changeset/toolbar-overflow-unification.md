---
"@charcuterie/logic": minor
"@charcuterie/ui": minor
---

**`Toolbar`, and the `useMediaQuery` it is built beside** — the fleet's
toolbar-with-overflow, unified.

`@charcuterie/ui` gains `Toolbar`: real APG toolbar semantics (one tab stop, arrow-key
roving focus through `RovingFocus`), priority-ordered actions, and progressive overflow
that is **measured** rather than breakpointed. Exactly one instance of every control is
mounted at any width — it moves between the bar and the overflow rather than being
rendered twice and hidden by a media query. The overflow trigger exists only when
something actually overflowed.

The overflow's role is a **type, not a flag**: `overflow="menu"` narrows `items` to
actions and opens a real `role="menu"`; `overflow="panel"` accepts `control` items too and
opens a `Popover` (`role="dialog"`, `aria-haspopup="dialog"`), because `role="menu"`
permits only the `menuitem` family and a toggle inside one is invalid ARIA.

`@charcuterie/logic` gains `useMediaQuery` (React and Preact) over a new
`createMediaQuery` core and an injected `MediaQueryMatcher` seam, with
`matchMediaMatcher(query)` in `@charcuterie/logic/browser`. Read-only by design: the
environment owns the value.

Also: `expectAgentDrivable` can now see a roving `role="toolbar"`. `toolbar` had been in
its composite-role set since M4 and was unreachable, because a toolbar's members are
ordinary buttons rather than a `menuitem`-style role — so a correct roving toolbar was
rejected outright with "has a negative tabindex". floating-ui's `aria-hidden` focus guards
are excluded from the tab-stop count for the same assertion.
