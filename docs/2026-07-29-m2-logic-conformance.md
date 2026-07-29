# M2 — `@charcuterie/logic`, and what "one suite, three adapters" bought

**Date:** 2026-07-29
**Branch:** `v2`
**Status:** Landed. M3 (`@charcuterie/ui`, P0 pure presentation) is next.

M2's stated proof, from the plan:

> `@charcuterie/logic` core — Visibility, VisibilityGroup, SinglePicker, MultiplePicker,
> **RovingFocus**, **Status (FSM)**, plus `useLinkedIds`/`useUniqueId`/`useClonedChild`.
> React + Preact bindings, Jotai/signals adapters. Full model-based suite. No components.
> **Proof: suite green on all three adapters.**

Delivered, with five adapters rather than three — the store seam makes the Jotai and
signals stores cost one line each at a call site.

---

## What runs

| | |
| --- | --- |
| Node tests (`--project logic`) | **75** across 4 files |
| Browser tests (`--project logic-dom`, chromium) | **24** across 2 files |
| Whole workspace | **161 node + 24 browser**, all green |
| Node suite wall clock | ~0.9 s for ~500 generated command sequences |

```bash
yarn vitest run --project logic
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" \
  yarn vitest run --project logic-dom
```

**Sandbox gotcha, will bite the next session.** `PLAYWRIGHT_BROWSERS_PATH` is set to
`/opt/pw-browsers`, which ships Chromium build **1228**; this repo's Playwright wants
**1234**, which a previous session downloaded into `~/.cache/ms-playwright`. Without the
override the browser project fails at launch with *"Executable doesn't exist"*. This
affects `packages/docs`' Storybook project identically.

## The five adapters

One suite — `src/conformance/runConformanceSuite.ts` — parameterised by an `Adapter`:

| Adapter | Where | `numRuns` |
| --- | --- | --- |
| `core` | node | 300 |
| `core + jotai` | node | 100 |
| `core + @preact/signals-core` | node | 100 |
| `react` | chromium | 15 |
| `preact` | chromium | 15 |

The DOM adapters mount a host component that renders `null`, and rebuild `getState()` from
the **last committed render**. That is deliberately stronger than subscribing to the core
would be: a binding that fails to re-render reads stale, and the model catches it on the
very next assertion rather than passing by accident.

Every command is async, because React 19's `act` returns a thenable that has to be
awaited. The core adapter resolves immediately.

## Mutation-checked, because a green suite that cannot fail proves nothing

| Deliberate regression | Result |
| --- | --- |
| `removeRegistration` multiset → plain `Set` | **15 core properties fail** across all three store adapters |
| Preact `useStoreValue` stops subscribing | **10 Preact properties fail; React unaffected** |

The second one is the useful signal: it shows the adapters are genuinely independent, so
"green on preact" is not React's binding wearing a different name.

## Design, in one paragraph

Every member-having kind stores an **intent** — what the consumer asked for — and derives
its public state from that plus who is currently registered. `visibleKey` is the intent
when its member is mounted, `pendingKey` is the same intent when it is not. Three
properties fall out that would otherwise each be a rule six commands have to remember: a
value set before its member mounts is not lost, a remount round-trips, and the plan's
invariants ("at most one visible", "`selectedValue` is always a registered option or
`null`") are true by representation. Registrations are a **multiset**, which is what fixes
the `useLinkedIds` remount race the plan flags — and the mutation above is the proof it was
load-bearing rather than defensive.

`createRovingFocus` breaks the symmetry once, on purpose: unregistering the *focused*
member moves focus to its neighbour rather than parking it as pending, because a keyboard
user whose row disappeared expects the next row, not to be ejected from the group.

## Answers to open questions

**Preact+signals path — `logic/core` direct vs `preact/compat`?** Direct, and it cost one
hand-written file. `preact/hooks` has no `useSyncExternalStore` — it lives in
`preact/compat`, which is most of `slatecast`'s 60 KB gz budget — so
`src/preact/useStoreValue.ts` is a subscribe-in-an-effect, which is correct here for a
reason that does not hold in React: Preact has no concurrent rendering, so there is no
interrupted render to tear against. Everything else is a mechanical mirror of the React
file. No aliasing anywhere, so the Preact adapter really is Preact.

**The `open` carve-out vs the is/has rule.** Narrower than the plan assumed, and left
narrow — see
[the decision](decisions/2026-07-29-is-has-rule-has-no-external-api-carve-out.md). The
carve-out is that `property` is not selected, so floating-ui's `open:` as an *object
literal key* will pass in M4 exactly as the plan predicted. A `typeProperty` still fires,
which is right.

## Decisions recorded

- [Five state kinds, not three](decisions/2026-07-29-five-state-kinds.md)
- [Store injection, not a hard Jotai dependency](decisions/2026-07-29-store-injection-not-a-jotai-dependency.md)
- [The logic hooks are uncontrolled](decisions/2026-07-29-logic-hooks-are-uncontrolled.md)
- [The `is`/`has` rule has no external-API carve-out](decisions/2026-07-29-is-has-rule-has-no-external-api-carve-out.md)
- [The container-query scale is `--cq-*`](decisions/2026-07-29-container-query-scale-is-cq-not-container.md) — a tokens fix, Kevin's call, resolving M1's one open question

## v1's source is gone; here is how to get it back

The 30 parked v1 files at `packages/logic/src/*` were deleted as this landed. The state
hooks were rewritten rather than ported — v1's `useVisibility` synced a controlled prop in
an effect, which is [now decided against](decisions/2026-07-29-logic-hooks-are-uncontrolled.md),
and its `useScopedAtom`/`jotaiScope`/`createUseSharedContext` exist to serve a Jotai
dependency that no longer exists.

**The component-layer files were not ported and M3 will want them.** They are one command
away:

```bash
git show ccd64bf:packages/logic/src/PickerSelector.tsx
```

Worth reading before writing M3's equivalents:

| File | Why |
| --- | --- |
| `PickerSelector.tsx`, `HtmlPickerSelector.tsx` | the hidden-real-`<input>` trick — already the correct answer for native form semantics |
| `VisibilityTrigger.tsx`, `VisibilityTarget.tsx` | the children-first `cloneElement` composition, now backed by `useClonedChild` |
| `useAccessibleTrigger.ts`, `useAccessibleTarget.ts` | what `createLinkedIds` is meant to feed |
| `HideOnEscapeKey.tsx` | superseded in M4 by `useDismiss`, but shows the intended shape |
| `Picker.stories.tsx`, `Visibility.stories.tsx` | v1's story coverage, as a checklist |

Two v1 files were **broken as committed** and should not be copied: `useLinkedIds.ts`
contained a duplicate of `useClonedChild` and no linked-id logic at all, and
`translateProps.ts` was not valid TypeScript. `SinglePickerProvider.tsx` referenced
undefined `name` and `selectionType` bindings.

`useClonedChild` was ported with a real fix: v1 passed the props object's own values as the
dependency array, so the array's *length* changed whenever the caller passed a different
number of props. React reads dependencies positionally, so that is not a lint nit — it
silently compares unrelated slots and returns a stale clone.

## What M2 does not do

No components, no `@floating-ui/react`, no `Slot`, no providers. `useClonedChild` ships
because the plan lists it, but the `VisibilityTrigger` that uses it is M3.

Nothing is published. `@charcuterie/logic` is `0.0.0` like every other package here, and
`mux-magic@feat/charcuterie-tokens` is still held unmerged behind the
[`portal:` decision](decisions/2026-07-29-consumers-link-tokens-by-portal-until-publish.md).

## Next: M3

P0 pure presentation — Spinner, Skeleton, Button, IconButton, Badge, ProgressBar,
EmptyState, Card, LiveStatusIndicator, MediaTile. Zero behaviour dependencies, so it lands
fast and erases the largest duplication in the fleet. `Badge` and `LiveStatusIndicator`
are the first consumers of `createStatus` — start them on `connectionTransitions` and
`asyncTransitions`, which already ship.
