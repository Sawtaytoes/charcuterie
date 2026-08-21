# VRT gates the pull request, not the push to master

**Status:** Accepted
**Date:** 2026-08-20
**Type:** CI · Process
**Supersedes:** —
**Superseded by:** —

## Decision

**A moved pixel fails the `vrt` job on a pull request, and never on a push to `master`.**

`vrtReportStatus.mjs` keys off `VRT_PR_NUMBER` — set on PR builds, empty on push builds,
and `on.push.branches` is `[master]`, so empty means master:

- **Pull request, `failedItems > 0`** → commit status `failure`, PR comment, exit 1. The
  reviewer opens the report and decides.
- **Push to master** → commit status `success` with the same summary and the same report
  link, exit 0, and a log line saying the numbers were recorded rather than gated.

New and deleted baselines stay green in both, as before — a renamed or removed story is
churn, not a regression.

## Context

Master went red on `6e5f896` and again on `4882b5b`, both reporting
`2 changed · 8 new · 8 deleted · 520 unchanged`. Neither was a regression. The 8 new / 8
deleted were the `Select` stories moving to `Deprecated/Select`; the 2 changed were
`Field`'s group story swapping its Unit select for a `Picker` — the intended, reviewed,
already-merged content of PR #123, described in that PR's own body.

The reason master repeats the PR's verdict is `reg-keygen-git-hash-plugin`. It keys the
baseline to the branch point, and with squash-only linear history the only long-lived
branch off `master` is `changeset-release/master` — so the baseline is the **last release
commit**, not the parent commit. The PR head, the feature commit and the release commit
that follows it all resolve to the same baseline and therefore produce the same diff.

## Why

A push-build failure here is structurally incapable of being actionable. It reports a diff
against a baseline the pull request already reported it against, to a branch where the only
available response — reviewing and merging — has already happened. The merge *was* the
approval.

Left alone it also costs the two things CI exists for:

- **The signal.** Every intentional visual change reds `master` for two commits, so a red
  `master` stops meaning anything. That is the failure mode
  [green CI is the merge bar](2026-08-05-master-requires-all-four-ci-checks-no-bypass.md)
  is written against.
- **The channel.** Those runs email the owner as the actor who triggered them. Enough of
  them and the mail gets filtered, which is how a real red one gets missed.

The regression signal is not weakened: the PR check is unchanged, and it is the one that
runs while a human can still act. `vrt` is not one of the four required checks, so this
never affected whether anything could merge — only whether the tree looked broken.

Rejected: **advancing the baseline on master instead.** It treats the same numbers as
approved just as this does, but by writing a new expected snapshot — so a genuine
regression that slipped past PR review gets silently blessed. Reporting it green while
publishing the report keeps it visible.

## Evidence

Identical results across all three runs, from the job logs:

| Run | Commit | Previous snapshot key | Result |
| --- | --- | --- | --- |
| PR #123 | `a842626` | `b6d230f` | `2 changed · 8 new · 8 deleted · 520 unchanged` |
| push master | `6e5f896` | `b6d230f` | `2 changed · 8 new · 8 deleted · 520 unchanged` |
| push master | `4882b5b` | `b6d230f` | `2 changed · 8 new · 8 deleted · 520 unchanged` |

The baseline tracking the release commit rather than the parent, over earlier master runs:

```
4882b5b prev=b6d230f   6e5f896 prev=b6d230f   b6d230f prev=fa24882
62c30eb prev=fa24882   fa24882 prev=28cbd1c   da6879f prev=28cbd1c
```

Owner, on the `Run failed: CI - master` mail the two runs sent:
*"I thought we changed my GitHub rules, so it doesn't keep emailing me constantly for these
things agents are doing now?"* — then, on the diagnosis: *"Yes, fix it if another agent
isn't already doing that."*
