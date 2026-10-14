# pnpm and local Turbo build caching

- **Status:** Accepted
- **Date:** 2026-10-06
- **Type:** Tooling convention
- **Supersedes:** [The v2 root is a Yarn 4 workspace](2026-07-29-v2-root-is-a-workspace-and-v1-parks-in-packages-logic.md) (package-manager choice only)
- **Superseded by:** —

## Decision

Use pinned pnpm 12.9.1 for the library and the independently installed shared VRT tools.
Keep existing dependency ranges and locked versions, scoped security overrides and both
security patches. Dependency build scripts remain explicitly denied, as they were under
Yarn's disabled-script default. Install pnpm through npm because older Corepack releases
expect a JavaScript entrypoint pnpm 12 no longer provides.

Use pinned Turbo 2.11.7 to cache package builds locally. Hash source, dependency and
shared configuration inputs plus the executing Node version, OS and architecture. Restore
all package build outputs. Storybook always calls the package build first. Test and visual
regression verdicts remain uncached. Shared CI detects each caller's package manager so
remaining Yarn callers continue to work while the fleet migrates.

## Context

Repeated controlled measurements compared Yarn classic, Yarn hardlinks-global and pnpm
with the same dependency versions. In the two measured repositories, warm pnpm installs
beat tuned Yarn in every repetition, with median speedups of 2.6–3.8 times. Both task runners
restored correct build artifacts and invalidated changed packages and their dependants.

## Why

pnpm saves repeated install time; local task caching avoids redoing unchanged compiler
work. Turbo fits the existing package scripts without adding a project-plugin layer.
Correct build restoration and unchanged security/test gates are prerequisites for adoption.

## Evidence

The owner approved the migration: “OMG, let's get this transition done!” and accepted the
Turbo trial: “Fine.” Conversation b060b3db-e4bd-4636-894b-98e8f108849d, 2026-10-06.
The controlled October 5 benchmark exercised both package managers and both task runners
with repeated trials and matching output hashes. Migration checks also exercise the
actual installed security patches in both independent workspaces.
