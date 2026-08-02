---
"@charcuterie/logic": patch
"@charcuterie/ui": patch
---

A slot's `ref` composes with the one already there, instead of replacing it.

`Menu` and `Tooltip` could not share a trigger. Both clone onto it and both hand it a
floating-ui `refs.setReference` — an anchor, not an attribute — and every merge in the
library was last-write-wins, so the inner clone's ref replaced the outer one's. The menu was
left with no reference element and floating-ui parked its panel at `left: 0; top: 0`, in the
corner of the viewport. Nothing threw, the ARIA was intact and axe was clean; it read as a
CSS bug.

A `ref` is a subscription and an `on*` is a listener, and neither survives being replaced. So
both are merged now, at both levels where a slot writes them:

- **`useClonedChild`** merges with the element **you** wrote, so
  `<Menu trigger={<Button ref={buttonRef} onClick={toggle} />} />` keeps your ref *and* your
  handler — previously it silently discarded both. React and Preact bindings alike.
- **`mergeSlotProps`** merges the `ref` and chains the handlers between two nested slots,
  alongside the five attributes it already settled.

Values are unaffected: a slot is still the later writer and still wins, which is what makes
`Field`'s `id` work.
