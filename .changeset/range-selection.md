---
"@charcuterie/logic": minor
---

`applySelectionClick` — shift-click range selection, as a pure reducer over a selection
the caller holds. Gmail's rules: a plain pick anchors and remembers whether it ticked or
un-ticked, a shift pick repeats that verdict across the whole span as drawn, and the
anchor then walks to the item just picked. No anchor, or an anchor that has left the list,
degrades to a plain toggle.

Rendered order is an argument rather than something the reducer derives, because a list is
filtered, grouped and re-sorted without remounting — which is also why this is not a
command on `createMultiplePicker`, whose order is mount order.

`@charcuterie/logic/browser` gains `clearTextSelection`, which drops the native text
selection a shift-click drags along behind it.
