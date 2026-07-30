# The preview eagerly imports `@storybook/addon-docs/blocks`

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Workaround (upstream bug, Storybook 10.5.5)
**Supersedes:** —
**Superseded by:** —

## Decision

`.storybook/preview.tsx` begins with a bare side-effect import:

```ts
import "@storybook/addon-docs/blocks"
```

**It is load-bearing and must not be tidied away.** It has no exports we use, no
types we reference, and a linter or a human doing housekeeping will read it as dead.
Deleting it breaks **every docs page in the Storybook** — including this repo's own
`Tokens/Overview` and all eleven component `Docs` tabs.

The regression is caught by `yarn smoke:storybook`
([`packages/docs/scripts/smokeStorybook.ts`](../../packages/docs/scripts/smokeStorybook.ts)),
which is the only gate that can see it.

## Context

Reported as *"some broken stories and docs pages"* against the M3 build. Every docs
page rendered Storybook's own **"The component failed to render properly"** panel with:

```
TypeError: Illegal invocation
    at HTMLElement.get [as focus]
    at setupGlobalFocusEvents
```

Two things are colliding, and both are upstream:

1. **Storybook's `enhanceContext` loader** (`storybook/dist/csf`) replaces
   `HTMLElement.prototype.focus` with an accessor pair, so a story that autofocuses
   cannot steal focus from the Storybook UI. Its getter is
   `this.ownerDocument?.defaultView ? … : noopFocus`.
2. **React Aria's `setupGlobalFocusEvents`** — pulled in by Storybook's *own* docs
   blocks — reads `window.HTMLElement.prototype.focus` at module scope, to wrap it.

In that read, `this` is `HTMLElement.prototype` itself, not an element. `ownerDocument`
is a `Node` accessor that requires a real node, so it throws `Illegal invocation`,
inside a module-scope statement, and the whole blocks chunk fails to evaluate.

It reproduces on 10.5.5 in both `storybook dev` and a static build, and 10.5.5 is
`latest` — there is no version to upgrade to.

## Why this fix and not another

The collision is **purely an ordering accident**. The loader runs when the first
*story* renders; the blocks chunk loads when the first *docs page* renders. Which is
why the symptom looked so arbitrary:

| Path | Result |
| --- | --- |
| Open a docs page cold (deep link, hard reload) | Fine — blocks evaluates before any loader has run |
| Open any story, then click any docs page | **Broken** — every time |

The second row is what a human does, so in practice it was every docs page. It also
explains why the M3 gates were all green: `test:storybook` mounts each story in
isolation, and an isolated mount cannot see an ordering defect.

Importing the blocks entrypoint from `preview.tsx` evaluates React Aria's setup at
preview bootstrap, while `focus` is still a plain function. Storybook's patch then
installs over the top exactly as intended, and focus-stealing prevention still works —
nothing is disabled.

Two alternatives were rejected:

- **Re-defining `focus` ourselves with a guarded getter.** Storybook's
  `Object.defineProperties` runs later and replaces whatever we install, so this only
  works by making the property non-configurable — which makes *their* call throw
  (silently, inside their `try`) on every story, and gives up the focus-stealing
  prevention to fix a rendering bug.
- **Waiting for an upstream release.** The bug is in `latest`. Worth reporting, but
  the fleet reads this Storybook now.

Revisit when Storybook ships a fix: delete the import, run `yarn smoke:storybook`, and
if it stays green delete this record's workaround (superseding it, not editing it).

## Evidence

> Some broken stories and docs pages, but it's a good start.

— the owner, 2026-07-29, with a screenshot of `Tokens/Overview` showing the
`Illegal invocation` panel.

Reproduced and confirmed fixed against both `storybook dev` and `yarn build:storybook`.
With the import removed, the smoke run reports **24 problems across 78 entries — all 12
of the docs pages, and nothing else**. With it, `✓ 78 Storybook entries rendered clean
under SPA navigation`.
