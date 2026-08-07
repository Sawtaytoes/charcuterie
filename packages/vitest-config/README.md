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
