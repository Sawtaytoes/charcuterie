# A test budget is CI-aware, because the runner is shared

- **Status:** Accepted
- **Date:** 2026-09-22
- **Type:** Infra / testing
- **Supersedes:** —
- **Superseded by:** —

## Decision

**`createPlaywrightConfig` and `createVitestConfig` set a larger timeout when `CI` is set,
and leave the tool's own default in place when it is not.**

| Budget | Off CI | On CI |
| --- | --- | --- |
| Playwright assertion (`expect.timeout`) | 5s | 15s |
| Playwright test (`timeout`) | 30s | 90s |
| Vitest test (`testTimeout`) | 5s node / 15s browser | 30s |
| Vitest hook (`hookTimeout`) | 10s node / 30s browser | 30s |
| Testing Library async (`asyncUtilTimeout`) | 1s | 10s |

> [!IMPORTANT]
> **Correction, 2026-09-22 — the Off CI column is what VITEST picks, and this factory
> must not name it.** 1.2.0 shipped `testTimeout: 5_000` and `hookTimeout: 10_000` off CI.
> Those restate Vitest's **node** defaults, and Vitest's defaults are mode-aware:
> `testTimeout ??= browser.enabled ? 15_000 : 5_000` and
> `hookTimeout ??= browser.enabled ? 30_000 : 10_000`. Writing the node number down
> therefore cut every **browser** suite to a third of its budget, off CI only.
>
> It was caught the same day. mux-magic's `AudioPreviewModal` and `VideoPreviewModal`
> stories each take about ten seconds; they passed for months on the 15s browser default
> and failed the moment that project adopted this factory. Measured both ways on the same
> two files: 20.8s of test time either side, passing before and timing out at 5000ms after.
>
> 1.3.0 names a timeout **only when `CI` is set**, which is what the Decision above always
> said. The rule generalises: a shared factory may RAISE a tool's default, and must never
> restate one.
>
> The same release adds the `asyncUtilTimeout` row above, as
> `@charcuterie/vitest-config/testingLibrarySetup.js`. ⚠️ **`waitFor` does not read
> `testTimeout`** — Testing Library keeps its own clock, 1000ms by default, and it is the
> smallest budget in the stack. Raising Vitest's did nothing for it, which is why
> mux-magic's `master` stayed red on `LinkPicker keyboard > Escape closes the picker`
> after taking 1.2.0.
>
> ⚠️ **The app calls `applyCiAsyncUtilTimeout(configure)` from its OWN setup file, and
> passes Testing Library in.** Two failed attempts are why. A setup file listed straight
> out of `node_modules` (a) runs in the BROWSER, where `process` does not exist —
> `ReferenceError: process is not defined`, fixed by defining
> `import.meta.env.CHARCUTERIE_CI` in the factory — and (b) is outside the project's
> `optimizeDeps`, so importing `@testing-library/dom` there died on `aria-query` not
> providing `elementRoles`. ⚠️ And a **Storybook** project must name no `setupFiles` at
> all: `@storybook/addon-vitest` injects its own, and naming one replaces it, so every
> story fails with *"Vitest failed to find the runner"*.

Three rules come with it:

1. **An app's own value still wins.** Both factories spread the caller's overrides last.
2. **`process.env.CI` is read at CALL time, not at module load.** Each factory runs once
   per test run, so the answer is the same — and a test can set the variable and call the
   factory rather than re-import the module, which Vite's import analysis refuses.
3. ⚠️ **This is a budget, not a cure for a flaky or a slow test.** A test that races its
   own application still fails, and a suite that is slow because it does too much work is
   still slow. Raise a budget only when the evidence is machine starvation.

## Context

The fleet has one Forgejo Actions runner, and it takes every repo's jobs.

A merge round is not one job at a time. On 2026-09-22 the window 07:11:46–07:14:48 held
mail-sifter's nine jobs, five jobs each from docket, horizon, rip-deck and folio, and two
`docker-deploy` image builds. Every one of those was on the same host.

mail-sifter's default branch went red in that window, on a commit whose only change was
taking `@charcuterie/vitest-config` 1.1.2:

- `unit-tests` (job 5380) failed on **one** test — `packages/shared/src/db.test.ts` →
  *"an order and its mail survive a database reopen"* — with *"Test timed out in 5000ms."*
  That test has no `await` in it. It is synchronous better-sqlite3 work, it takes **33ms**
  on this workstation, and its **65 siblings in the same file passed on the same run**.
- `e2e-tests` (job 5381) failed one spec out of 56 — `e2e/reader.spec.ts` → *"the z
  shortcut reaches through the reader's dialog"*. The first attempt reached the keystroke
  and did not see the toast inside 5s. Both retries did not see `getByRole("dialog")` at
  all inside 5s.

The same commit passed on its own pull request four minutes earlier (jobs 5351 and 5352),
and passes locally: 121 files, 2050 tests, exit 0.

A failed test job **skips `docker-deploy`**, so the merge produced no image and the app
could not be deployed.

## Why

**Because the failure is starvation, and starvation is a property of the machine, not of
the test.** A synchronous 33ms test that takes longer than 5s has been descheduled for
roughly 150x its own runtime. No change to that test can fix that, and the honest fix is
to stop asserting a single-tenant budget on a multi-tenant machine.

**Because a bigger budget costs a passing test nothing.** Both clocks stop when the work
finishes, not when the limit is reached. The only thing that gets slower is a test that
was going to fail anyway, and only on CI.

**Because the fleet is the right home for it.** No repo had raised either value — a sweep
of every `playwright.config.ts` and `vitest*.config.ts` under the Repos dataset found five
`timeout` entries and all five are a `webServer` start-up budget. The gap was in the shared
factory, so the fix is in the shared factory.

**Because the 4x rule was already satisfied and did not help.**
[A CI gate carries measured headroom](2026-09-14-a-ci-gate-carries-measured-headroom-and-never-asserts-in-a-hot-loop.md)
asks for a timeout of at least **4x the measured cost**, and says that raising a timeout is
the *second* choice behind making the test cheaper. Both halves hold here and neither
reaches this failure. 4x of 33ms is 132ms; the budget was already 5 000ms, which is 150x.
And there is nothing to make cheaper — the test is one database open, a few inserts and a
reopen. That record is about a test that costs too much for its budget. This one is about a
budget that assumes the machine is idle. They are **different axes**, so this record adds to
it and supersedes nothing.

**Because the alternative is to re-run until green, and that is not a diagnosis.**
mail-sifter's reader spec already carried a written comment about an earlier timeout of
exactly this kind, and the response then was to make that one test wait for less. That
worked for that test and left the class untouched. This is the second occurrence.

## Evidence

- Forgejo job 5380, mail-sifter, sha `aa4a4355`:
  `::error file=packages/shared/src/db.test.ts,line=48::Error: Test timed out in 5000ms.`
  — `Test Files 1 failed | 120 passed (121)`.
- Forgejo job 5381, same sha: `1 failed`, `55 passed (1.2m)`; retries #1 and #2 both
  `Locator: getByRole('dialog') … Timeout: 5000ms … element(s) not found`.
- The same test locally, `vitest run --project logic packages/shared/src/db.test.ts`:
  `✓ … an order and its mail survive a database reopen 33ms`, whole file `66 passed`.
- Jobs on the runner in that window, from
  `GET /api/v1/repos/sawtaytoes/<repo>/actions/tasks`: mail-sifter 5373–5386, docket
  5371–5385, horizon 5366–5384, rip-deck 5362–5370, folio 5353–5360.
- Fleet sweep for an existing override:
  `rg -uu 'expect:\s*\{|testTimeout|timeout:\s*[0-9_]+' --glob 'playwright.config.ts' --glob 'vitest*.config.ts'`
  over `/mnt/TrueNAS-Apps/Repos` — five hits, every one a `webServer` timeout.
- `packages/playwright-config/src/index.test.js` and
  `packages/vitest-config/src/index.test.js` assert both branches and the app override.
  `playwright-config` had no suite at all before this; it is now registered in the root
  `vitest.config.ts`, for the same reason `packages/ci` was in #282.
