# A CI gate carries measured headroom, and never asserts in a hot loop

- **Status:** Accepted
- **Date:** 2026-09-14
- **Type:** Testing / CI
- **Supersedes:** —
- **Superseded by:** —

## Decision

**A test's timeout is set from a measurement, with room to spare, and a loop over many
cases makes ONE assertion.**

Two rules, both learned on the same morning:

1. A timeout is at least **4x the measured cost**. A test that passes at 90 percent of its
   budget is not passing; it is waiting to fail on a slower runner.
2. `expect` does not go inside a loop that runs thousands of times. Collect the failures
   and assert once at the end.

Neither is a style preference. Both were failures in production CI.

## Context

On 2026-09-14 Charcuterie's `test` job failed on master and on every open branch. Two
different tests, in two different packages, on the same morning:

| Test | Budget | Cost | Shape of the problem |
| --- | --- | --- | --- |
| `model-viewer/src/browser.test.js` | 30 000 ms | 26 937 ms on the last passing run | 90 percent of budget |
| `ui/src/DatePicker/plainDate.test.ts` | 5 000 ms, the default | 74 144 `expect` calls | assertion overhead |

Nothing had changed in either test. `yarn.lock` pins playwright at `1.62.0` and CI runs
`yarn install --immutable`, so no package version moved. The runner image provisioner was
build `20260828.587` on both the passing and the failing runs.

The hosted runners simply got slower, and two tests with no headroom fell over together.
The first was proved to be unrelated to any change by re-running **master's own CI at the
same commit**, which failed identically to a branch whose diff could not reach the package.

## Why

**A gate that only passes on a fast runner is not a gate.** It reports the weather on the
machine rather than the state of the code, and it blocks every pull request in the repo
when the weather turns. Both failures here blocked work that had nothing to do with
either package.

**Raising a timeout is the second choice, not the first.** `browser.test.js` genuinely
costs what it costs — it launches chromium, builds a page, paints WebGL and reads pixels
back — so it got 120 000 ms and a comment holding the measurement. `plainDate.test.ts` did
not: its cost was almost entirely assertion overhead, so it got made cheaper instead. The
comment on the raised timeout says to prefer this order the next time.

**Vitest builds an assertion object per `expect` call**, which is fine once and expensive
74 000 times. Collecting mismatches also **reports better**: the old shape stopped at the
first bad day, while the new one names every day that failed — which is what a reader
actually wants from a round trip over a century rule.

## Evidence

`plainDate.test.ts` measured directly, with the real `getDayNumber` and
`getPlainDateFromDayNumber` over the real range:

| Shape | Cost | Mismatches |
| --- | --- | --- |
| `expect` per day | 447 ms | 0 |
| collect, then one `expect` | 5 ms | 0 |

74 144 days, identical coverage, an 89x reduction. The date arithmetic itself is 5 ms; the
other 442 ms was `expect`. Measured in the agent sandbox, which is faster than a hosted
runner — the ratio is the durable number, not the absolute.

`browser.test.js` after its timeout was raised, measured on a hosted runner:

| When | Duration | Budget | Result |
| --- | --- | --- | --- |
| 2026-09-13 | 26 937 ms | 30 000 ms | pass, 90 percent of budget |
| 2026-09-14 | over 30 000 ms | 30 000 ms | fail, on master and on a branch |
| 2026-09-14, after the fix | 37 621 ms | 120 000 ms | pass, 31 percent of budget |

The test became about 40 percent slower between those two days with no change to the test,
to `yarn.lock`, or to the runner image build.

⚠️ 120 000 ms is deliberately **not** "infinity". A test that genuinely hangs must still
fail rather than burn the job's whole 15 minutes.
