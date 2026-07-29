# Five state kinds, not three

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Architecture
**Supersedes:** —
**Superseded by:** —

## Decision

`@charcuterie/logic` models component state as **five** kinds, not the three the original
Charcuterie conference talk was built on:

1. **Visibility** — binary state
2. **VisibilityGroup** — at most one member visible *(was "Visibility Control")*
3. **SinglePicker** — one choice out of many
4. **RovingFocus** — which member is tabbable **(new)**
5. **Status** — a typed finite state machine over an ordered lifecycle **(new)**

…with **MultiplePicker** (set membership) alongside SinglePicker as the second half of the
selection kind.

Each is a plain factory in `packages/logic/src/core/`, framework-free, over an injected
store. React and Preact bindings are thin wrappers; see
[store injection](2026-07-29-store-injection-not-a-jotai-dependency.md).

`VisibilityControlProvider` is renamed **`VisibilityGroup`**. v1's `NOTES.md` had already
rejected that name and `SingleVisibilityProvider`, and asked for something better than
`OnlyOne`.

## Context

The talk's thesis is that component-library state reduces to three kinds — Visibility,
Single Selection, Multiple Selection — and that everything else is presentation. Working
through the fleet's real components, two things do not fit.

**Roving focus is not selection.** Arrowing down a listbox moves focus through options
without choosing any of them; only Enter or Space commits. Modelled as a SinglePicker —
which is where the three-kind model has to put it — every arrow key fires the form's
`onChange`. The two are genuinely independent axes, and
`runConformanceSuite` asserts it: arrowing all the way around a group must not disturb the
picker's `selectedValue`, and selecting must not move focus.

**Ordered lifecycles are not binary state or set membership.** The fleet is full of them:

| Where | States |
| --- | --- |
| `ripdeck` bay | idle → ripping → verifying → complete \| failed \| quarantined \| held |
| `mux-magic` `StatusBadge` | pending → running → completed \| failed \| cancelled |
| Connection indicator, 4 repos, all different | connecting → connected → reconnecting → disconnected |
| Toast lifecycle | entering → visible → exiting → removed |
| Async request | idle → loading → success → error |
| `castkit` optimistic mutation | predicted → confirmed \| timed-out |

Every one is a stringly-typed `Record<string, string>` today. That is why `ripdeck`
declares an identical `TONE_CLASS` map in two files, and why nothing stops a bay going
from `complete` back to `ripping`.

## Why

**Why not XState for the fifth kind.** XState owns state — the same conflict that rules
out Radix, Base UI, and Ark UI for the overlay kinds, all of which hold `open` as the
source of truth. Wrapping any of them means the provider and the library both believe they
hold the answer. What is actually needed is four things: an exhaustive TS union, a compile
error on an unhandled state, a runtime throw on an illegal transition, and the same
model-based test treatment the other kinds get. `createStatus` is ~120 lines including its
doc comment.

**Why the throw is loud.** A silent no-op on an illegal transition is a bay stuck on
`ripping` forever with nothing in the log to say why. The error names both states and what
was legal from the current one.

**Why only two shared machines ship.** `connectionTransitions` and `asyncTransitions` are
about the transport, not the domain, and appear in four repos and every fetch respectively.
A shared library guessing at a rip bay's states would be worse than the `Record` it
replaced. Apps define their own with `createStatus` and check them with
`getUnreachableStates`, which catches the failure mode a runtime test cannot see: a state
nothing transitions *into* is a badge variant that will never render, and it looks
perfectly healthy from outside.

**Why intent and registration are separate everywhere.** The four member-having kinds all
store *what the consumer asked for* and derive the public answer from that plus who is
currently mounted. It makes three otherwise-fiddly properties fall out for free:

- A controlled initial value read on the first render survives until children register on
  their first effect, which is strictly later.
- A member that unmounts and remounts — StrictMode, a route change, a virtualised list
  scrolling it out and back — comes back visible/selected, because the intent was never
  discarded.
- "At most one visible" and "`selectedValue` is always a registered option or `null`" are
  true by representation rather than by six commands remembering a rule.

RovingFocus deliberately breaks the symmetry in one direction: unregistering the *focused*
member moves focus to its neighbour rather than parking it as pending, because a keyboard
user whose row disappeared expects the next row, not to be ejected from the group.

## Evidence

The plan (`agentic/docs/research/2026-07-29-charcuterie-component-library-plan.md`)
specifies both additions and calls the five kinds *"worth an ADR, since it extends the
three-state thesis the original talk was built on."*

v1's `packages/logic/NOTES.md`, verbatim, before it was superseded by this design:

> - Rename `VisibilityControlProvider` to `SingleVisibilityProvider`.
> - Rewrite `VisibilityControlProvider` as `OnlyOneSelectionProvider` with `OnlyOneSelector`
>   as a Picker-style component with state. Or just use a stateful Picker.
>   + Difference between Picker and OnlyOne is Picker requires a state manager like other
>     inputs whereas OnlyOne includes its own. This is for UI components like modals and
>     tabs rather than form components.
>   + **Find a better name than "OnlyOne".**

The distinction that note draws — "includes its own state" versus "requires a state
manager" — is exactly the intent-plus-registration split above, and is now a property of
every kind rather than a difference between two of them.

Proof: `runConformanceSuite` runs the same model-based command sequences against the core,
a Jotai-backed core, a signals-backed core, the React 19 binding, and the Preact binding.
Deliberately regressing the shared multiset to a plain `Set` fails 15 of the core's
properties; deliberately dropping the Preact subscription fails 10 of the Preact
properties and none of React's.
