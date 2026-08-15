# A `logic` major requires bumping `ui` in the same change

**Status:** Accepted
**Date:** 2026-08-15
**Type:** Packaging
**Supersedes:** —
**Superseded by:** —

## Decision

`@charcuterie/ui` depends on `@charcuterie/logic` at an **exact** version — its
`workspace:*` resolves to one at publish time. So a consumer that takes a new `logic`
major **must** take the `ui` release that pins it, in the same change:

```diff
-    "@charcuterie/logic": "^1.5.0",
-    "@charcuterie/ui": "^2.14.0",
+    "@charcuterie/logic": "^2.0.0",
+    "@charcuterie/ui": "^2.15.1",
```

Bumping `logic` alone is not a partial upgrade — it is a **broken** one. The exact pin
means npm/yarn cannot dedupe across a major boundary, so both versions install:

```
node_modules/@charcuterie/logic                               2.0.0
node_modules/@charcuterie/ui/node_modules/@charcuterie/logic  1.5.0
```

Two copies of `logic` are two copies of its React bindings. The app's provider writes to
one module instance and `ui`'s components read from the other.

**Every changeset that majors `logic` must therefore also release `ui`**, so a consumer
always has a `ui` version to move to. Changesets does the version bump automatically
(`updateInternalDependencies: patch` gave `ui@2.15.1` for `logic@2.0.0`) — the obligation
is on the *consumer* to take both.

## Context

`logic@2.0.0` ([the OpenAPI subpath split](2026-08-13-the-openapi-seam-is-its-own-subpath-not-part-of-query.md))
was the first `logic` major since `ui` existed, so this had never been exercised.

mux-magic's adoption PR bumped `logic` to `^2.0.0` and left `ui` at `^2.14.0`. CI failed
with **12 tests across 10 files** throwing:

```
TypeError: Cannot read properties of null (reading 'useMemoCache')
  at exports.c (react/cjs/react-compiler-runtime.development.js)
```

Nothing in that message names `logic`, `ui`, or a version. It reads like a React
compiler bug.

Two things made it expensive to find, both worth repeating as warnings:

- **A warm `node_modules` hides it completely.** The pre-bump install has a single
  `logic`, and `yarn install` over it does not necessarily restructure the nested copy.
  Local runs passed 2946/2946 — twice — against a tree that did not match the lockfile
  CI installs. Only `rm -rf node_modules && yarn install --immutable` reproduced it. **A
  dependency change verified on a warm tree is not verified.**
- **The job had no `timeout-minutes`,** so the first two runs hung to GitHub's 6-hour
  ceiling and reported `cancelled` — which reads as an infrastructure flake, not a
  failing test. That sent the investigation at the runner rather than the diff for a
  full round. (Fixed for mux-magic in
  [#226](https://github.com/Sawtaytoes/mux-magic/pull/226); every job there is now
  bounded.)

## Why

- **The exact pin is deliberate and stays.** `ui` and `logic` ship as a matched pair from
  one monorepo; a range would let a consumer float `ui@2.15.1` onto `logic@2.4.0` and get
  a combination nothing ever tested. The cost of the pin is this coupling, and the
  coupling is the point — it just has to be *stated*, which is what this record does.
- **The failure is unrecognisable from its symptom.** `useMemoCache` on null names
  neither package. Anyone who has not seen it will suspect the React compiler, the
  bundler, or their own hook. That asymmetry — trivial fix, opaque symptom — is exactly
  what a decision record is for.
- **It is silent until it isn't.** Two copies of `logic` install and typecheck happily.
  Only a component that crosses the boundary at runtime fails, so the blast radius
  depends on which components a suite happens to render.

## Evidence

The duplicated tree, from a clean `yarn install --immutable` in mux-magic on
`logic@^2.0.0` + `ui@^2.14.0`:

```
$ find node_modules -name package.json -path '*@charcuterie/logic*'
node_modules/@charcuterie/logic/package.json                                (2.0.0)
node_modules/@charcuterie/ui/node_modules/@charcuterie/logic/package.json   (1.5.0)
```

The published pins that cause it:

```
$ npm view @charcuterie/ui@2.15.0 dependencies
{ "@charcuterie/logic": "1.5.0", … }
$ npm view @charcuterie/ui@2.15.1 dependencies
{ "@charcuterie/logic": "2.0.0", … }
```

After adding `ui@^2.15.1`: exactly one `@charcuterie/logic` on disk, and mux-magic's
suite back to **2946/2946**
([#224](https://github.com/Sawtaytoes/mux-magic/pull/224), merged green).

rip-deck carries the same shape from the same fan-out — `ui@^2.11.0` pins `logic@1.2.0`
against the `logic@^2.0.0` it took in
[#31](https://forgejo.octen.dev/sawtaytoes/rip-deck/pulls/31) — fix prepared but unpushed
(the repo was archived 2026-08-15T05:50Z). **Any repo taking `logic@2.0.0` should check
`find node_modules -name package.json -path '*@charcuterie/logic*'` returns exactly one
line.**
