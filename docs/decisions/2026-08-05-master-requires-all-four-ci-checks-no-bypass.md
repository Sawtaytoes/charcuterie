# `master` merges require all four CI checks, squash-only, no bypass

- **Status:** Accepted
- **Date:** 2026-08-05
- **Type:** Repo policy (branch ruleset)
- **Supersedes:** —
- **Superseded by:** —

## Decision

A GitHub **ruleset** named `Master` (repo `Sawtaytoes/charcuterie`, target
`~DEFAULT_BRANCH`, enforcement active) gates every merge to `master`:

- **Required status checks:** `lint`, `typecheck`, `test`, `storybook` — the four
  jobs in `.github/workflows/ci.yml`, pinned to the GitHub Actions app
  (`integration_id: 15368`). A red check blocks the merge.
- **Pull request required**, `squash` the only allowed merge method, `0` approvals
  (the AI-merges-its-own-PRs flow needs no human review, but direct pushes to
  `master` are barred).
- **Linear history required.**
- **`bypass_actors: []`** — nobody bypasses, including a repo admin and the AI's
  token.

## Context

`master` had **no protection at all** ("Branch not protected", no ruleset), which
is how PR #39 merged with a **failing `lint` check** — the merge went through
because nothing gated it. The owner asked to "gate on lint," believing mux-magic
already did.

mux-magic's `Master` ruleset was measured: it requires a PR (squash-only), linear
history, and GitHub's `code_quality` rule (severity errors) — but **not** the CI
`lint` (or any) status check. So gating on the actual CI job was never wired,
there either. This record is charcuterie doing it properly.

## Why

- **All four checks, not just `lint`.** Gating only lint would still let a failing
  `test` or `typecheck` merge, which is not the intent; the point is that nothing
  red gets into `master`. The owner chose all four over lint-only.
- **Strict, no bypass.** "Gate" means block. An admin-bypass rule (mux-magic's
  shape) would not have stopped #39 if the merger bypasses; `bypass_actors: []`
  blocks a red merge for everyone. An emergency override is a deliberate act —
  temporarily disable the ruleset — not the default.
- **`code_quality` (mux-magic's rule) omitted.** It is a separate GitHub feature
  (code scanning) that is not configured on charcuterie; requiring it here would
  gate on results that never arrive. The CI status checks are the equivalent gate.
- **Safe against the stuck-check trap:** `ci.yml` triggers on `pull_request:` with
  **no path filter**, so all four jobs run on every PR (docs-only included) and a
  required check is never "expected but never reported".

## Evidence

- Ruleset id `20443076`, created 2026-08-05, enforcement active, `bypass_actors`
  empty, required checks `[lint, typecheck, test, storybook]`, merge methods
  `[squash]`, `required_linear_history`.
- `gh api repos/Sawtaytoes/charcuterie/rulesets` now returns it; before this it was
  `[]`.
