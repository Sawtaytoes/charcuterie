# Store injection, not a hard Jotai dependency

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Architecture
**Supersedes:** —
**Superseded by:** —

## Decision

Every core in `@charcuterie/logic` takes an optional `createStore`. The seam has **exactly
three members**:

```ts
type CharcuterieStore<Value> = {
  get: () => Value
  set: (value: Value) => void
  subscribe: (listener: () => void) => () => void
}
```

The default is a ~20-line observable ref with no dependencies.
`@charcuterie/logic/jotai` and `@charcuterie/logic/signals` are optional adapters, about
thirty lines each, and both are optional peer dependencies.

Jotai is **not** a dependency of the library. v1's `useScopedAtom` / `jotaiScope` /
`createUseSharedContext` do not survive the port.

## Context

v1 was Jotai-first: state lived in atoms, scoped by a module-level `Symbol`, and every
hook went through `useScopedAtom`. That works, and mux-magic already runs on Jotai.

It does not work everywhere. `castkit/packages/slatecast` is Preact with
`@preact/signals` inside a **60 KB gz budget**; Jotai costs ~5–6 KB of it to provide
scoping that signals already provide. And `castkit/packages/views` renders through Satori
with no React tree at all.

## Why

**The scoping atoms buy is already paid for.** Every state kind here is scoped to a
provider subtree, which React context gives free. Atoms would be a second scoping
mechanism layered on the first.

**`set` takes a value, never an updater.** An updater overload is ambiguous the moment
`Value` is itself a function, and the cores have `getState()` right there. Three members
with no overloads is what keeps the adapters small enough to be obviously correct.

**Anything more than three members belongs in a core.** The temptation is to push
derivation or equality into the store. Every such addition is a thing each adapter can get
subtly wrong in a way that only shows up in one consumer's app.

**Proved, not asserted.** `runConformanceSuite` takes a `createStore`, so the identical
model-based suite runs against the default store, a Jotai store, and a signals store — 36
node properties in about a second. Proving the Jotai adapter correct costs one line at a
call site rather than a suite of its own.

> **This is the one decision the plan flagged as impossible to retrofit** — *"must be made
> before line one; retrofitting it is a rewrite."* It was.

## Evidence

Plan, `## The state layer` → *"Jotai should not be a hard dependency"*:

> All state kinds are already scoped to a provider subtree, which React context gives
> free. Against that, Jotai costs ~5–6 KB that `castkit/packages/slatecast` (60 KB gz,
> `@preact/signals`) won't pay — and signals already do what atoms do there.
>
> Providers accept an injected store — `interface CharcuterieStore { get; set; subscribe }`.
> Default is React `useState`; `logic/jotai` swaps in a Jotai store so Kevin's existing
> ergonomics survive. ~30 lines, and it's what lets one library serve React 19 and
> Preact+signals.

Two departures from that paragraph, both deliberate:

- The default is an **observable ref**, not React `useState`. `useState` would put a React
  dependency in `logic/core`, which is the one thing the core must not have — Satori and
  the framework-free path both need it.
- The type is named `CharcuterieStore` rather than `Store`. It is a published name, and a
  consumer app with its own `Store` type should not have to alias ours.
