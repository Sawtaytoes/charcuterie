# @charcuterie/vitest-config

## 1.1.0

### Minor Changes

- 632ba4d: Add `charcuterie-check-optimize-deps`, a CI check that a package's
  `optimizeDeps.include` still matches what Vite's optimizer actually optimized.

  An undeclared dependency is discovered mid-run, which re-optimizes and reloads the page
  under the tests — surfacing as `Cannot read properties of null (reading 'useMemoCache')`
  or `Failed to fetch dynamically imported module: …?v=<hash>`, neither of which names the
  missing package. It is a race, so an incomplete list passes until it doesn't.

  Two fleet repos carried a comment describing this hazard and drifted anyway: the query
  adoption added `@charcuterie/logic/query` imports to seven repos and updated no list.
  mux-magic lost the race and took 16 tests with it; the audit that followed found the
  lists short by three and four entries. This replaces the manual invariant with a
  mechanism.

  Ships as a bin (`charcuterie-check-optimize-deps <list-module>`) plus a
  `@charcuterie/vitest-config/check-optimize-deps` subpath for programmatic use. Run it
  after the suite — the optimizer writes its metadata as it discovers.

## 1.0.1

### Patch Changes

- 4e4ab17: Ship TypeScript declarations for the factory functions so strict-TS apps can import them in `vitest.config.ts` / `vite.config.ts` / `playwright.config.ts` without an implicit-any (TS7016) error.
