# Shared visual regression lives in Charcuterie and is imported by tag

- **Status:** Accepted
- **Date:** 2026-09-25
- **Type:** CI / fleet infrastructure
- **Supersedes:** —
- **Superseded by:** —

## Decision

**Every owned app runs visual regression through one reusable workflow,
`.github/workflows/shared-vrt.yml`, imported by the moving tag `workflows-v1`.** The tools
it runs live in `packages/ci/src/vrt/` and reach the job by checkout, the same way
`docsLint.js` does — never from npm, never as a copy in the consumer repo.

The contract a consumer depends on:

1. **Shots are PNG files in one directory**, `$VRT_ACTUAL_DIR` (default `.vrt-actual` at the
   repo root). Names are stable and file-system safe; subfolders are allowed. reg-suit
   compares that directory against the baseline in the repo's own bucket.
2. **Two producers, either or both.** `storybookStaticDirs` runs the built-in Storybook
   capture (`storybookCapture.js`); `captureCommand` runs the repo's own command — a
   Playwright or Vitest browser test that saves screenshots into `$VRT_ACTUAL_DIR`. Tests may
   produce VRT shots wherever that makes sense.
3. **The verdict is a commit status plus one pull-request comment**, posted by
   `reportStatus.js` on GitHub and on Forgejo alike, and the job exits non-zero on a real
   regression on a pull request only.

The inner job is `visualRegression`. The job refuses a pull request from a fork on both
hosts, by reading the event payload.

Charcuterie's own `vrt` job is **not** switched over in the same change. Its baseline and
report flow is live, and moving it is a separate change.

## Context

Charcuterie was the only repo with visual regression. Its `vrt` job and three scripts in
`packages/docs/scripts/` worked, but every name, path and toolbar global in them was
Charcuterie's. The fleet then gained per-repo buckets and self-hosted `vrt` runners for
every owned app, on GitHub and on Forgejo, and each of those repos would otherwise have
copied the job and the scripts — the duplication the shared CI layout exists to prevent.

## Why

- **By tag, for the same reasons as the other shared workflows.** A fleet-wide fix is one tag
  move, and the ref in `uses:` and the tools it runs are the same commit.
- **From a checkout, not npm.** `@charcuterie/ci` is deliberately unpublished (see
  `packages/ci/README.md`). The tools' own dependencies — Playwright, reg-suit and its two
  plugins — are pinned in `packages/ci/src/vrt/package-lock.json` and installed with
  `npm ci` into the checkout, so no consumer adds them to its own lockfile.
- **A repo-supplied capture command** because a Storybook is not the only surface worth
  shooting. An app's own end-to-end test already drives the real screens.
- **The fork guard reads the payload, not `github.event_name`.** Inside a called workflow
  Forgejo reports the event as `workflow_call`, so `github.event_name == 'pull_request'` is
  never true there and a guard written that way would let every fork through.
- **The shot naming keeps Charcuterie's.** A Storybook given without a prefix writes
  `<story id>__<scheme>.png` at the top level, exactly as `vrtCapture.mjs` did, so moving
  Charcuterie over later keeps its baseline.
- **Chromium's sandbox stays off, as Playwright's default has it.** The job runs in an
  unprivileged container on both hosts, where the sandbox's user namespaces are not
  available. The Forgejo `vrt` container runs as uid 1000, not root.

## Evidence

Measured on 2026-09-25:

- A probe repository on Forgejo 16.0.5 ran a called workflow on `pull_request`. The job's
  automatic token created a commit status (201), created, listed and edited a PR comment
  (201, 200, 200), with the `token` and the `Bearer` scheme alike. `GITHUB_API_URL` was
  `<server>/api/v1`, `FORGEJO_SERVER_URL` was set, and `GITHUB_EVENT_NAME` was
  `workflow_call`. `runs-on: ${{ fromJSON(inputs.runsOn) }}` with `'["vrt"]'` ran on the
  `agent-sandbox-base:2.9` container as `uid=1000(node)`. The probe repository was deleted.
- Local capture of this repo's docs Storybook: see the pull request that added this record
  for the file-count and repeat-run comparison against `vrtCapture.mjs`.

Brief from the coordinating agent, chat *shared VRT workflow* (2026-09-25): "The owner
explicitly wants tests to be able to produce VRT shots where that makes sense."
