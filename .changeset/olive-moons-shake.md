---
"@charcuterie/vitest-config": patch
---

Name a Vitest timeout only when `CI` is set.

1.2.0 also wrote `testTimeout: 5_000` and `hookTimeout: 10_000` off CI. Those restate
Vitest's **node** defaults, and Vitest's defaults are mode-aware —
`testTimeout ??= browser.enabled ? 15_000 : 5_000` and
`hookTimeout ??= browser.enabled ? 30_000 : 10_000` — so naming the node number cut every
browser suite to a third of its off-CI budget. The CI values are unchanged.
