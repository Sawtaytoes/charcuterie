# Turborepo telemetry stays off, and Turborepo writes no agent guidance

- **Status:** Accepted
- **Date:** 2026-11-22
- **Type:** Privacy / tooling convention
- **Supersedes:** —
- **Superseded by:** —
- **Related:** [pnpm and local Turbo build caching](2026-10-06-pnpm-and-local-turbo-build-caching.md)

## Decision

Turborepo's anonymous usage telemetry stays off in this repository's CI and in its documented
`pnpm build` entry point.

1. **Every workflow that can run Turborepo sets `TURBO_TELEMETRY_DISABLED: "1"` and
   `DO_NOT_TRACK: "1"` at workflow level.** `ci.yml` and `npm-package-deploy.yml` run
   `pnpm build`. The reusable `shared-vrt.yml` runs a caller-supplied build command that
   can run Turborepo. `version-packages.yml` runs `changeset version`, not a build; it
   carries the same block as a defensive pin. A new workflow that builds adds the block.
2. **`scripts/build.mjs` keeps setting `TURBO_TELEMETRY_DISABLED=1`** on the Turborepo
   child process, so a local `pnpm build` is covered even without the workflow variables.
3. **`turbo.json` sets `"agentGuidance": false`.** Turborepo otherwise writes a managed
   `<!-- BEGIN:turborepo-agent-rules -->` block into the root `AGENTS.md` when it detects
   an AI agent, which leaves the working tree dirty after every `pnpm build`.

A direct `turbo run build` bypasses `scripts/build.mjs`, so the repository does not cover
it: a machine or container that builds that way must run `turbo telemetry disable` or pin
the same two variables in its image, and verify with `turbo telemetry status`. Those
machine settings do not replace the repository settings, which also cover CI.

## Context

On 2026-11-22, `pnpm exec turbo telemetry status` reported `Status: Enabled` in an agent
container with Turborepo 2.11.7. Turborepo reads `TURBO_TELEMETRY_DISABLED=1`,
`DO_NOT_TRACK=1`, or the user config that `turbo telemetry disable` writes. Only the first
was set, and only inside `scripts/build.mjs`; CI set none.

## Why

The household's standing rule is that no telemetry setting is enabled in any software.
Setting the variables in the repository makes the opt-out part of CI and of `pnpm build`
on every runner and checkout, instead of a per-machine step that an image rebuild undoes.
`agentGuidance: false` removes a second side effect of the same tool: an automatic edit
to a tracked file that every agent would otherwise have to discard or commit.

## Evidence

- Binding workspace decision: telemetry stays off in all software, 2026-11-19.
- Turborepo documentation shipped in `node_modules/turbo/docs`: `telemetry.mdx` for the
  opt-outs and `reference/configuration.mdx` for `agentGuidance`.
- `pnpm exec turbo telemetry status` with the new environment, and `pnpm build` leaving
  `AGENTS.md` unchanged, are recorded on the pull request that adds this record.
