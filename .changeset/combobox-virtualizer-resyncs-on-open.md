---
"@charcuterie/ui": patch
---

`Combobox`: a windowed list reopens where the new element is, not where the old one was.

Scroll a virtualized list, close it, open it again, and the panel came back with a blank
band down the top and the rows from the *previous* scroll position stranded below it.

`Combobox` stays mounted while the list element is created and destroyed on every open, so
one `useVirtualizer` instance outlives many scroll elements. Its offset does not come back
with them: the fresh element is at 0 while the instance still believes it is 500px down, so
it renders the window for a position nothing is at.

Nothing corrects that on its own, and the reason is worth knowing before writing another
virtualized panel. `observeOffset` attaches a `scroll` listener and **never reads the
element it just attached to** — the offset only ever updates from an event. A replaced
element sitting at 0 raises no event, so the stale belief survives. `scrollToOffset(0)`
does not help either: it asks for a position the element already holds, which also raises
no event.

So the panel dispatches a `scroll` on the list when it attaches, which is the one input the
virtualizer acts on. It is keyed on the element arriving rather than on `isVisible`, because
floating-ui's `FloatingPortal` renders nothing until its portal node exists — an effect
keyed on the open flag runs a render too early, while the ref is still null.

Introduced by the `itemSize` change (#176), not by the open-seed work: the version before it
recovered, and so did the one after the seed landed.
