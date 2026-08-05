---
"@charcuterie/logic": minor
"@charcuterie/ui": patch
---

Share the slot/clone `ref` + `on*` merge primitives. `mergeRefs`, `chainHandlers`,
`isMergeableRef`, `isEventHandlerName` and the `MergeableRef` type move into
`@charcuterie/logic/react` (`mergeRefsAndHandlers.ts`) and become public exports of
`@charcuterie/logic`; `@charcuterie/ui`'s `slotWiring.ts` imports them instead of
carrying a byte-identical copy, keeping only its own `mergeSlotWiring`. No behaviour
change — the React implementation (with its React 19 callback-ref cleanup) is the one
kept. The Preact mirror is intentionally *not* shared: its `mergeRefs` is genuinely
different (Preact has no ref-cleanup return), so this is a react↔ui dedup only.
