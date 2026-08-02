# `useClonedChild` keeps `cloneElement` — the replacement is deferred, not rejected

**Status:** Accepted
**Date:** 2026-08-02
**Type:** Scope
**Supersedes:** —
**Superseded by:** —

## Decision

1.0.1 fixes the **ref merge** inside `useClonedChild` and changes nothing else about it. The
larger question — *should a slot still be built on `cloneElement` at all?* — is **open and
deliberately not started**. **Kevin's call**, on being told the library still uses it:

> oh, I didn't know we were still using `useClonedChild`. We probably shouldn't anymore,
> but i'll leave that for later.

So the record is: he is not defending the pattern, and he is not paying for its replacement
in a patch. Nobody should read the merge fix as a ruling that `cloneElement` is right — and
nobody should half-start the replacement on the strength of "we probably shouldn't".

## Context

`useClonedChild` is v1's children-first slot, ported verbatim in M2 and used in four places:
`Menu`, `Popover`, `Tooltip` and `Field`. It calls `Children.only(child)` and
`cloneElement`, which is how a `<Tooltip>` can wrap the button you already have instead of
making you adopt its own.

Three separate defects have now come out of it, and each one was invisible until an app
composed two components:

| Found in | What it was |
| --- | --- |
| M6b (mux-magic) | `Field`'s `id`/`aria-*` handed to the `Tooltip` **component**, which declares none of them — dropped with no warning. Fixed in M6f by `SlotProps` + `mergeSlotProps`. |
| M6c (image-viewer) | `Menu` and `Tooltip` cannot share a trigger — the second clone's `ref` replaced the first's. Fixed here. |
| here, while fixing it | the clone also replaced **the caller's own** `ref` and handlers, on the element they wrote. Fixed here. |

They are one defect wearing three hats: **`cloneElement` is a per-key replace, and a slot's
props are not all values.** Each fix names another key whose merge semantics have to be
written down — five attributes in M6f, `ref` and `on*` here.

## Why deferred rather than done

**The replacement is a breaking change, and this is a patch.** The alternative every other
library reached is a `Slot`/`asChild` component (Radix, Base UI, Ark) or `render` props
(react-aria). Both change how a consumer writes the composition, not just what the library
does with it — and five apps are on `^1.0.0` as of today. That is a 2.0.0 conversation with
a migration, not a line in a bug fix.

**The bug is real now and the redesign is not urgent.** With `ref` and `on*` merged, the
four call sites behave the way a `Slot` would for every case the consumers have hit. What is
left is the *type* hole, which no amount of merging closes: `Children.only` returns a
`ReactElement` whose props are `any`, so a slot injecting `id` into a component that has no
`id` prop still type-checks. That is the strongest argument for the rewrite and it is not
one anybody is losing data to today.

**Half-starting it is the worst outcome.** A `Slot` that exists beside `useClonedChild`, or
an `asChild` on two of the four call sites, means two composition models in one library and
a consumer having to know which component uses which. It also strands the Preact mirror,
which has its own mechanism (the ref lives on the vnode, not in props) and would need the
same replacement built twice.

## Evidence

Kevin, in the 1.0.1 briefing — quoted in full above; the full sentence is the whole of his
position on it, and the deferral is his word "later", not an inference.

The merge fix and its proof are in
[`docs/2026-08-02-1-0-1-the-ref-merge.md`](../2026-08-02-1-0-1-the-ref-merge.md). The open
question is carried in
[`docs/2026-08-02-reported-by-consumers-queued-for-1-1.md`](../2026-08-02-reported-by-consumers-queued-for-1-1.md)
so it cannot be lost, marked as **not** a 1.1 item — it is the one entry there that is a
major.
