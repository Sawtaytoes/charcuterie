# @charcuterie/vitest-config

## 1.1.2

### Patch Changes

- 83b6a79: Resolve the Playwright browser provider lazily, so a node-only suite can use the factory. `@vitest/browser-playwright` was a top-level `import`, which made the whole module unloadable for any consumer that does not run a browser suite — a `node:fs` mock harness, a contracts package, a server package. Those consumers could not so much as read their own config without installing a browser provider they never run, and the error named the provider rather than the cause: `Cannot find package '@vitest/browser-playwright' imported from @charcuterie/vitest-config/src/index.js`. Four fleet repos hit it the day 1.1.1 went out. The provider is now required only when the caller leaves browser mode on, so `browser: { enabled: false }` is a genuine opt-out and needs no extra dependency. Browser mode is unchanged and is still the default.

## 1.1.1

### Patch Changes

- 359d24a: Run tests in Chromium through Playwright by default.

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
