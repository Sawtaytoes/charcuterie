---
"@charcuterie/ui": minor
---

`Stepper` carries each step's key into the DOM as `data-flip-key`

React's `key` is invisible to the DOM, so a caller who re-orders `steps` had no way to
say which `<li>` is which. `useFlipList` matches items on exactly this attribute, so
without it a re-ordered stepper fell back to pairing items by position, measured a delta
of zero for every one, and animated nothing.

Emitted always rather than behind a prop — a data attribute on a list item costs nothing
when nobody reads it, and making it opt-in would mean every consumer rediscovering why
their re-order does not animate.
