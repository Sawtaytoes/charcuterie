# A menu is named by its trigger, so only a trigger-less overlay takes a required name

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Component API
**Supersedes:** —
**Superseded by:** —

## Decision

`Menu` has **no `label` prop**. Its accessible name comes from the control that opens it,
through `useRole`'s `aria-labelledby`.

The rule the earlier components establish is narrowed rather than repealed:

> An overlay with **no trigger relationship** must take its own required name.

| Component | Named by | Required prop |
| --- | --- | --- |
| `Spinner` | itself | `label` — a `role="status"` takes no name from its content |
| `Modal` | itself | `heading` |
| `Popover` | itself | `heading` — a `role="dialog"` takes no name from its content |
| **`Menu`** | **its trigger** | **none** — the requirement moves to the trigger |

`Button` and `IconButton` already make a trigger's name unavoidable, so nothing is lost.

## Context

`Menu` was written first with a required `label` that became `aria-label`, by direct
analogy with `Popover`'s `heading` — the M3 and M4 lesson that an overlay role takes no
accessible name from its content, recorded in
[status regions carry an aria-label](2026-07-29-status-regions-carry-an-aria-label.md).

The story named its menu "Bay 3 actions". The test asked for `role="menu"` named
"Bay 3 actions" and found nothing.

`@floating-ui/react`'s `useRole`, for `role: "menu"`, writes an `id` onto the **reference**
and `aria-labelledby` pointing at it onto the **floating element**:

```js
...(ariaRole === 'menu' && { id: referenceId }),        // on the reference
...(ariaRole === 'menu' && { 'aria-labelledby': referenceId })  // on the floating panel
```

`aria-labelledby` beats `aria-label`. The menu was already named "Bay 3", from the button,
and the prop was **discarded without a warning from anything** — no type error, no lint, no
axe violation, and the component renders identically. It is also the ARIA Authoring
Practices menu-button pattern, where a menu is named by the control that opens it.

## Why

The alternative was to keep the prop and defeat `useRole` — spell `aria-labelledby={undefined}`
after the spread so `aria-label` wins. That would mean:

- **Two sources for one name**, which is the shape of the problem this repo keeps finding
  elsewhere. `Popover`'s note about hand-written `aria-controls` pointing at an id that
  moved is the same failure.
- A menu whose name can **disagree with its button** — "Actions" on screen, "Bay 3 actions"
  to a screen reader, with nothing to reconcile them.

Deleting the prop makes the naming single-sourced and matches the APG. The cost is that a
`Menu` with an unnamed trigger is an unnamed menu; that is already impossible through
`Button`/`IconButton`, and `expectAgentDrivable` on the trigger catches it if an app passes
its own control.

The wider point is worth keeping: **a rule derived from three components had a fourth case
it did not cover**, and the only thing that found it was a test asserting the name rather
than asserting that a name had been passed.

## Evidence

Found by `Menu.test.tsx`'s first assertion during M6. Kevin's instruction for the milestone
was to build all nine P1 components as planned; the correction is internal to how one of
them is named.

floating-ui source: `node_modules/@floating-ui/react/dist/floating-ui.react.mjs`, `useRole`.
