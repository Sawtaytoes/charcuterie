---
"@charcuterie/ui": minor
---

EmptyState: widen `headingLevel` from `2 | 3 | 4` to `2 | 3 | 4 | 5 | 6`. The cap
was a guess about document structure the consumer knows better — an empty state
nested inside an already-deep section needs `5` or `6` to keep the outline from
skipping, and the implementation (`` `h${headingLevel}` ``) never cared about the
upper bound. Type-only widening; no runtime or default change (still defaults to
`2`). Reported by a consumer; was queued for 1.1.
