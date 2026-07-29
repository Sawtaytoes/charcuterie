# Consumers link `@charcuterie/tokens` by `portal:` until it publishes

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Process
**Supersedes:** —
**Superseded by:** —

## Decision

Until `@charcuterie/tokens` is published to npm, a consumer proving the integration
depends on it by relative path:

```json
"@charcuterie/tokens": "portal:../../../charcuterie/packages/tokens"
```

**Such a branch is not merged.** It stays open until the package publishes, at which point
the dependency becomes an ordinary registry range and nothing else in the diff changes.

First use: `mux-magic@feat/charcuterie-tokens`.

## Context

M1's proof is mux-magic importing `@charcuterie/tokens/theme.css` and looking unchanged.
That needs the package to resolve. There is no npm token in the workspace `.env`, and the
plan defers publishing to a GitHub Actions `workflow_run` job that does not exist yet.

Three options were weighed: publish `0.1.0` now and depend on it normally, copy the built
`theme.css` into mux-magic, or link it locally and hold the branch.

## Why

**Copying the CSS would have proved the wrong thing.** It proves the stylesheet looks
right. It does not prove the package resolves — and resolution is where this actually
broke during M1: Tailwind's `enhanced-resolve` failed on
`@charcuterie/tokens/theme.css` until the dev server was restarted after `yarn install`.
A copied file sails past that class of failure entirely, and the real
`@import "@charcuterie/tokens/theme.css"` line stays untested until the day it ships.

**`portal:` resolves through the package's real `exports` map**, so the subpath export,
the `type: module` manifest, and the generated `dist/` are all genuinely exercised. It is
the same integration the registry version will be, minus the registry.

**Publishing first would have put a version on the registry before anything used it.**
`0.1.0` with no consumer, no publish workflow, and no lockstep story yet is a number
somebody has to live with. Publishing is worth doing when the workflow that does it
exists, so that the first published version is one CI produced.

**Holding the branch is the honest bookkeeping.** A relative path is correct on exactly
one machine. Merging it would break every other checkout, and leaving it merged-but-broken
to be fixed later is the kind of thing nobody remembers. An open branch with a stated
unblock condition is not debt; it is a queue.

## Consequences

- `dist/` is generated, not committed, and `portal:` does **not** run `prepack`. So
  `yarn workspace @charcuterie/tokens build` has to run before a consumer builds. Written
  into the M1 handoff.
- Yarn warns that portals need `--preserve-symlinks`. Harmless here — Vite and Tailwind
  resolve the CSS through their own resolvers, and the app never imports the package's JS.
- When the publish workflow lands, the unblock is a one-line dependency change per held
  branch. Nothing else in this diff moves.

## Evidence

Chosen by Kevin from three stated options during M1 execution
(chat `charcuterie-m1`, 2026-07-29): *"Yarn `portal:` on an unmerged branch."*

Measured outcome in
[`docs/2026-07-29-m1-mux-magic-token-swap.md`](../2026-07-29-m1-mux-magic-token-swap.md):
the dark UI came out 99.91% pixel-identical through a real `portal:` resolution.
