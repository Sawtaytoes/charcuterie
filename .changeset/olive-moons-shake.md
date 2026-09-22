---
"@charcuterie/vitest-config": minor
---

Name a Vitest timeout only when `CI` is set, and ship a CI-aware Testing Library budget.

1.2.0 also wrote `testTimeout: 5_000` and `hookTimeout: 10_000` off CI. Those restate
Vitest's **node** defaults, and Vitest's defaults are mode-aware —
`testTimeout ??= browser.enabled ? 15_000 : 5_000` and
`hookTimeout ??= browser.enabled ? 30_000 : 10_000` — so naming the node number cut every
browser suite to a third of its off-CI budget. The CI values are unchanged.

New export `@charcuterie/vitest-config/testingLibrarySetup.js`. Testing Library keeps its
own clock: `waitFor` does not read `testTimeout`, and its 1000ms `asyncUtilTimeout` is the
smallest budget in the stack and the first one a starved shared runner blows through. On
CI `applyCiAsyncUtilTimeout(configure)` raises it to 10s, still inside the 30s Vitest
allows, so a stuck `waitFor` still fails as a `waitFor`.

The **app** passes its own `configure`, from its own setup file. This package imports no
Testing Library and takes no new dependency.

`createVitestConfig` now also defines `import.meta.env.CHARCUTERIE_CI`, because a browser
project's setup file runs in the browser, where `process` does not exist.
