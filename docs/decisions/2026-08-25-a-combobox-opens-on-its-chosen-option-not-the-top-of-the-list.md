# A `Combobox` opens on its chosen option, not the top of the list

**Status:** Accepted
**Date:** 2026-08-25
**Type:** Behaviour · Accessibility
**Supersedes:** —
**Superseded by:** —

## Decision

When a `Combobox` opens with a value already chosen, the highlight starts on **that
option**, and the list scrolls so the option is **centred** in the panel. Index 0 is the
seed only when nothing is chosen.

Three limits are part of the decision, not omissions:

1. **A live query owns the highlight.** The seed runs only while the query is empty.
   Typing keeps reseeding to the top match, which is what a filter is for.
2. **A chosen value that has not arrived yet keeps waiting.** A picker that fetches its
   options when it opens holds at the top and seeds when the rows land.
3. **Attached-input mode is untouched.** The consumer owns the value there, so the
   component has nothing to seed.

Separately, and forced by the same change: **`aria-activedescendant` never names a row
that is not in the DOM.** In a windowed list the reference waits one frame for the
virtualizer's window to catch up.

## Context

`Listbox` has followed the APG rule since it shipped, and says so in its own comment —
*"Opening lands the focus on the chosen option… the reason a reopened one resumes on the
current value rather than the top."* `Combobox` is its sibling and never got the rule:
`activeIndex` was seeded at `0` on open and on every query reset.

Reported against Docket's project picker, over a list of roughly sixty projects with
`Purchases` chosen. Opening the picker showed `Account Cleanup` highlighted at the head
of the list and the chosen row far below the fold.

## Why

The owner named two costs, and they are different costs.

**Correcting a misclick became a hunt.** The reason to reopen a picker you have just
used is usually that you picked the wrong neighbour. Opening at the top puts you further
from the right answer than when you started — you scroll back to where you already were.

**A panel showing no trace of your choice reads as though nothing were chosen.** The
trigger said `Purchases` and the open list showed a different highlighted row, with no
tick anywhere on screen. Two surfaces disagreeing about the same value.

Centred rather than merely in view, because `block: "nearest"` parks the chosen row
against the panel's bottom edge with nothing after it — the neighbours the list was
reopened to reach would still be off screen, so the first cost would survive the fix.

## Evidence

> "When a Combobox has a selected value, when I click the box to open it, I expect to
> see the selected value in the list, but what's happening is it's showing it from the
> beginning of the list. Say I misclick something, now, I have to scroll down to the
> selected item and click another. That's not what I want. Also, it's jarring to see
> your selected item _not_ in the list after selecting it and opening the box."

— owner, 2026-08-25, reporting against Docket.

## Two implementation traps, both paid for

**The seed cannot scroll the virtualizer itself.** `@tanstack/react-virtual` measures its
scroll element in an effect of its own, so a `scrollToIndex` issued in the same commit as
the seed has nothing to scroll and is dropped silently. Moving the seed to a
`useLayoutEffect` to close the gap made it strictly worse — earlier still. The scroll
belongs to the in-view effect that already existed, one commit later, which is told the
index to expect so it does not scroll the *stale* highlight in between and drag the list
back off the chosen row.

**A windowed list can name a row it has not rendered.** `aria-activedescendant` renders
from `activeIndex` immediately, while the virtualizer moves its window a tick after the
scroll offset changes. Seeding index 399 of 500 therefore left a frame where the input
pointed at an id no element had — a dangling idref for a screen reader, and an
`aria-valid-attr-value` failure. It surfaced as an *intermittent* a11y-gate failure that
depended on which test ran first, which is the worst way for it to surface. The
reference now waits for its row. The highlight, arrow moves and every commit still run
off the resolved index, so only the announcement waits, never the behaviour.

The second trap is a pre-existing defect this change made reachable, not one it created:
any jump far enough to move the window — `Home`/`End` on a long list, a query that
collapses it — could already produce it.
