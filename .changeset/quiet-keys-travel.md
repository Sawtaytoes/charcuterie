---
"@charcuterie/logic": minor
---

`useFlipList` can key off an attribute the markup already carries

New `keyAttribute` option, defaulting to `data-flip-key` as before. Point it at an
existing attribute when the list is already keyed — queuepilot's poster tiles have
carried `data-key` since before this hook existed, and duplicating that value into a
second attribute would be two places for one fact to drift.

Set `itemSelector` to match when you change it: the default selector looks for
`data-flip-key` and would find nothing.
