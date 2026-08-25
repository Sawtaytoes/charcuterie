---
"@charcuterie/ui": patch
---

`Combobox`: the open seed runs on **every** open, not only the first.

Reported against Docket, on the patch that was meant to have fixed this: *"if I close the
combobox and open it again, it's back to the top again, not the selected item."*

The seed hung its scroll off `activeIndex` changing. That works once. Reopen the same
picker without choosing anything and `activeIndex` still holds the index the *last* open
seeded, so setting it again is a no-op — React re-renders nothing, and the effect that
would have scrolled never runs. First open correct, every reopen at the top of the list.

The outstanding scroll is now a piece of **state, replaced with a fresh object on every
open**, so it cannot collapse into a no-op and the scroll no longer depends on the
highlight having moved. It also stops the two scrolls fighting: the seed's centred scroll
is the only one allowed to run until it lands, where before an arrow move's
`block: "nearest"` could settle the list somewhere the seed then had to undo.

One behaviour change worth naming: the seed now always yields a frame before it scrolls.
Two separate things are missing on the opening commit and each drops the scroll silently
— the panel has no height cap yet, so the list stands at full height with nothing to
move, and the virtualizer measures its scroll element in an effect of its own, so
`scrollToIndex` has nothing to measure against. One frame settles both, and the wait
after that is still bounded.

Two tests, and only one of them fails on the previous release: reopening a plain DOM list
(the reported bug) and reopening a windowed one (which already worked, and now guards the
restructure).
