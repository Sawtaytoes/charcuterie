# @charcuterie/vitest-config

A shared Vitest config **factory** for the Charcuterie fleet. Config that is code ships
as a function, not a static file — the shared 80% (globals, excludes, v8 coverage) comes
from here; each app supplies its 20% delta.

## Usage

```ts
// vitest.config.ts
import { createVitestConfig } from "@charcuterie/vitest-config"

export default createVitestConfig({
  test: {
    setupFiles: ["./src/test/setup.ts"],
    environment: "jsdom",
  },
})
```

Overrides are **deep-merged** over the base (via Vitest's own `mergeConfig`), so passing
`test.exclude` extends rather than replaces the shared excludes only where you intend.

`vitest` is a peer dependency — the app owns the Vitest version, and Renovate bumps this
package's range fleet-wide when the shared defaults change.

## `optimizeDeps.include` drift — the parity check

A repo running Vitest **browser mode** pre-declares its dependencies in
`optimizeDeps.include`. Vite discovers dependencies lazily, so one that is *not*
declared gets found part-way through a run, which triggers a re-optimization and
reloads the page underneath the running tests. It surfaces as one of:

```
TypeError: Cannot read properties of null (reading 'useMemoCache')
TypeError: Failed to fetch dynamically imported module: …?v=<hash>
```

Neither message names the missing dependency. It is a **race**, not a determinate
break, so an incomplete list passes until it doesn't — and a warm `node_modules/.vite`
means it passes *more* often locally than in CI.

**Each subpath is its own entry.** `@charcuterie/logic` in the list does not cover
`@charcuterie/logic/query`.

Two fleet repos carried a comment describing this hazard and drifted anyway. A comment
asking a human to remember is not a mechanism; this is.

### Wiring it up

Export the list from its own module so a plain Node process can read it without
loading a Vite config:

```js
// packages/web/optimizeDeps.js
export const optimizeDepsInclude = [
  "@charcuterie/logic",
  "@charcuterie/logic/query",
  "react",
  // …
]
```

```ts
// packages/web/vitest.config.ts
import { optimizeDepsInclude } from "./optimizeDeps.js"

export default defineConfig({
  // …
  optimizeDeps: { include: optimizeDepsInclude },
})
```

Then run the check **after** the suite, in the same CI job — the optimizer writes its
metadata as it discovers, so before a run there is nothing to compare and mid-run the
picture is incomplete:

```yaml
- run: yarn vitest run
- run: yarn charcuterie-check-optimize-deps ./packages/web/optimizeDeps.js --cache-dir packages/web/node_modules/.vite
```

`--cache-dir` defaults to `node_modules/.vite`. Point it at the **package's** cache:
it lives beside the package, not at the repo root, and clearing or reading the wrong
one is how a "cold" run passes while proving nothing.

It exits `1` listing the specifiers to add. Pass `--allow-extra` to tolerate declared
entries that were never optimized (stale, but harmless at runtime).

The same check is available programmatically:

```js
import { checkOptimizeDepsParity } from "@charcuterie/vitest-config/check-optimize-deps"

const { missing, extra } = checkOptimizeDepsParity({
  cacheDir: "packages/web/node_modules/.vite",
  include: optimizeDepsInclude,
})
```
