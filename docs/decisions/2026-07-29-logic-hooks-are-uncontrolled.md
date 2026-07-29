# The logic hooks are uncontrolled, with `onChange` as the escape hatch

**Status:** Accepted
**Date:** 2026-07-29
**Type:** API
**Supersedes:** —
**Superseded by:** —

## Decision

`isVisible`, `visibleKey`, `selectedValue`, `selectedValues`, and `activeValue` are
**initial** values on every `@charcuterie/logic` hook. They are read once, when the core is
built, and never again.

There is no controlled mode and no effect syncing a prop back into the core. A parent that
needs to push a value calls the imperative command (`setIsVisible`, `show`, `select`,
`setActiveValue`); a parent that needs to observe one passes `onChange`.

`onChange` fires on **intent changes only** — an explicit `show`/`hide`/`select`/`clear` —
never on registration churn.

## Context

v1 did the opposite: `useVisibility` ran

```ts
useEffect(() => { setIsVisible(isVisibleProp) }, [isVisibleProp])
```

so the prop was authoritative on every render, and `useVisibilityControl` had two effects
writing the same value back and forth.

## Why

**It is the thesis.** Charcuterie owns the state. That is the stated reason the library
layers on `@floating-ui/react` — controlled by construction, stores nothing — rather than
wrapping Radix, Base UI, or Ark UI, all of which hold `open` as their own source of truth.
A controlled mode would reintroduce exactly the two-owners problem inside our own API.

**Echo loops are the fleet's existing bug.** With a controlled prop *and* an
unconditional `onChange`, the parent echoes the callback back down as the prop, the effect
writes it into the core, and the core fires the callback again. Firing only on real
changes breaks the loop; firing only on *intent* changes also stops an unmounting member
being reported as a user action, which is what an `aria-expanded` mirror or an analytics
call would otherwise record.

**A controlled array is worse.** `selectedValues` is a fresh array on nearly every parent
render, so a naive `useEffect` dependency on it re-syncs forever. Supporting that honestly
means content comparison in the hook, and the hook is meant to be thin.

**Nothing is lost.** The imperative commands are stable identities from the core, so
pushing a value is one call from an effect the *consumer* owns and can guard however its
own data flow requires.

## Evidence

Plan, on the state layer:

> Radix, Base UI, and Ark UI all **own state** (`open`/`onOpenChange` as source of truth).
> Wrapping any means `VisibilityProvider` and the library both believe they hold
> `isVisible`.

and, on the fleet as it is today:

> **plex-channels** — icon buttons are bare glyphs … `<h2>`s have `<button>`s nested
> inside.

M3's `VisibilityProvider` and friends sit on top of these hooks. If a component-level
controlled mode is ever genuinely needed, it belongs there — in a component that can
compare props across renders — and not in the state layer.
