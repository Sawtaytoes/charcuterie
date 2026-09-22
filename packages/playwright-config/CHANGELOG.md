# @charcuterie/playwright-config

## 1.1.0

### Minor Changes

- 63d307a: Give a test and an assertion a bigger budget on CI, where the runner is shared. Playwright waits 5s for an assertion and 30s for a test; Vitest waits 5s for a test. Both defaults are sized for a machine running one suite, and this fleet's runner is not that machine — it takes every repo's jobs, so one merge round puts several repos' CI plus image builds on the same host. On 2026-09-22 that cost mail-sifter both test jobs on its default branch: `unit-tests` timed out on one synchronous better-sqlite3 test that takes 33ms locally, while its 65 siblings in the same file passed, and `e2e-tests` could not find `getByRole("dialog")` inside 5s on two consecutive retries, on a commit that had passed on its own pull request four minutes earlier. A failed test job skips `docker-deploy`, so the merge did not ship. On CI, Playwright now allows 15s an assertion and 90s a test, and Vitest allows 30s a test and 30s a hook. Off CI every default is unchanged, so a real hang still fails fast while you are writing the test. A larger budget costs a passing test nothing: the clock stops when the assertion resolves or the test returns. An app's own `timeout`, `expect.timeout` or `testTimeout` still wins.

## 1.0.1

### Patch Changes

- 4e4ab17: Ship TypeScript declarations for the factory functions so strict-TS apps can import them in `vitest.config.ts` / `vite.config.ts` / `playwright.config.ts` without an implicit-any (TS7016) error.
