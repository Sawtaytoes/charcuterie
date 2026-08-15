---
"@charcuterie/ui": patch
---

`useAnchoredOverlay` now prefers the trigger's own `id` instead of cloning a
generated one over it.

It minted an id so the portalled panel could point `aria-labelledby` across at
the trigger. That is still needed — a bare `role="listbox"` is an ARIA input
field and must be named — but any id serves, including the caller's, and
overwriting had a consequence nobody traced: `Field` clones a `controlId` onto
its child and renders `<label htmlFor={controlId}>`, so for every
`Picker`/`Listbox`/`Combobox`/`Menu` inside a `Field` the label pointed at an
element that did not exist.

It failed silently. A dangling `htmlFor` throws nothing and renders nothing —
the only way to see it was to look up the id in the DOM and find zero nodes.
That is the same defect `Field`'s own docstring calls "precisely the defect this
component was built to make impossible", arriving by a different route.

Found while migrating points-market onto `Picker`, where it reproduced
identically before and after the migration — so it is long-standing, not new.
Two rediscoveries of the overwrite were already in the fleet: queuepilot and
mux-magic both moved their e2e handles to `data-testid` because `id` "did not
survive". `data-testid` remains the sturdier handle; `id` is no longer a trap.

Fixes #99.
