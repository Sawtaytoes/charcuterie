# @charcuterie/vitest-config

## 1.2.0

### Minor Changes

- 63d307a: Give a test and an assertion a bigger budget on CI, where the runner is shared. Playwright waits 5s for an assertion and 30s for a test; Vitest waits 5s for a test. Both defaults are sized for a machine running one suite, and this fleet's runner is not that machine — it takes every repo's jobs, so one merge round puts several repos' CI plus image builds on the same host. On 2026-09-22 that cost mail-sifter both test jobs on its default branch: `unit-tests` timed out on one synchronous better-sqlite3 test that takes 33ms locally, while its 65 siblings in the same file passed, and `e2e-tests` could not find `getByRole("dialog")` inside 5s on two consecutive retries, on a commit that had passed on its own pull request four minutes earlier. A failed test job skips `docker-deploy`, so the merge did not ship. On CI, Playwright now allows 15s an assertion and 90s a test, and Vitest allows 30s a test and 30s a hook. Off CI every default is unchanged, so a real hang still fails fast while you are writing the test. A larger budget costs a passing test nothing: the clock stops when the assertion resolves or the test returns. An app's own `timeout`, `expect.timeout` or `testTimeout` still wins.

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
