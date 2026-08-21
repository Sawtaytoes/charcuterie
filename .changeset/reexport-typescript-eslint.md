---
"@charcuterie/eslint-config": minor
---

`typescript-eslint` is re-exported, so a consumer composing `tseslint.configs.*`
beside `createAppConfig` uses the same instance.

```js
import {
  createAppConfig,
  tseslint,
} from "@charcuterie/eslint-config"
```

**Fixes a hard failure in 1.5.0.** Moving `typescript-eslint` from a peer dependency
to a real one removed an install step and introduced a worse problem: a consumer that
also declares it can end up with two copies, and flat config throws
`Cannot redefine plugin "@typescript-eslint"` when two blocks register that namespace
with two different objects. `board-game-picker` hit it (8.66.0 in its lockfile against
this package's 8.67.0) and `eslint .` failed outright; `docket`, with the same declared
range, deduped and worked. Which one a repo gets is a property of its lockfile.

The dependency stays — the re-export removes the coin flip rather than documenting it,
and adoption is still two packages.
