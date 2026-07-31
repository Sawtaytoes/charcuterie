# The state layer is Charcuterie's model on `@floating-ui/react`

**Status:** Accepted
**Date:** 2026-07-30
**Type:** Architecture
**Supersedes:** —
**Superseded by:** [Tab selection is a `SinglePicker`](2026-07-30-tab-selection-is-a-single-picker.md),
on one point only — this record describes `Tabs` as `VisibilityGroup` + `RovingFocus`; it
is `SinglePicker` + `RovingFocus`. The finding below (focus and selection are separate
kinds, and that separation costs one line) stands unchanged.

## Decision

`@charcuterie/logic` stays the application-facing state API. `@floating-ui/react`
(0.27.20, MIT) is the only third-party behaviour dependency, and it is used for exactly
three things: **collision-aware positioning, the dismiss layer, and focus management.**

**Not Radix, not Base UI, not Ark UI.** All three own `open` as their source of truth, so
wrapping any of them leaves `useVisibility` and the library both believing they hold the
state. floating-ui is the layer all three are *built on*, and it is controlled by
construction — you pass state in and it never stores any.

```tsx
useFloating({
  open: isVisible,          // ← read-only. Charcuterie stays the owner.
  onOpenChange: (isNext) => { if (!isNext) hide() },
})
```

Passing `open:` *into* floating-ui does not violate the `is`/`has` rule; the adapter
boundary is the case that carve-out already exists for
([decision](2026-07-29-is-has-rule-has-no-external-api-carve-out.md)).

This was the plan's one outstanding "still to be recorded" architecture item. It is
recorded now because M4 put it in effect rather than in a diagram.

## Context — Tabs was the falsification test, and the layer survived it

The plan made `Tabs` P0 on one condition, in its own words:

> **Tabs is the falsification point** — it needs Visibility + VisibilityGroup +
> RovingFocus + linked ids at once. This, not duplication, is why it's P0. If Tabs is
> ugly, stop and reconsider the state layer before building fifteen more components.

It is not ugly. The composition is two hooks and one decision:

```ts
const panels = useVisibilityGroup({ visibleKey: initialKey })
const focus = useRovingFocus({ activeValue: initialKey })

// `automatic` activation is this line. `manual` is its absence.
if (activation === "automatic") panels.show(focus.activeValue)
```

That one line is the entire difference between the two ARIA activation modes, and it is
only that small because **focus and selection are separate kinds**. In `manual`, focus
sits on a tab whose panel is not showing — a state the talk's original three-kind model
could not represent at all. Modelled as a `SinglePicker`, as three kinds would force,
every arrow key would have chosen. `RovingFocus` earning its place as kind five is now
demonstrated rather than argued.

## Three findings the test produced

**1. `createLinkedIds` does not fit Tabs, and that is the right answer.** The plan
expected all four kinds here. That kind exists for a *dynamic* trigger↔target pair — a
`Popover` whose panel mounts and unmounts, where the multiset stops `aria-controls`
pointing at a node React already removed. A tab bar's pairing is static and known at
render, so the ids derive from one `useUniqueId` and cannot get out of step. Three of
four, with a specific reason for the fourth, is a pass.

**2. Registration-based state is empty on its first paint, and two components had a hole
because of it.** Members register from effects, so on the very first render
`RovingFocus` had `activeValue: null` with nothing registered — every member scored
`tabindex="-1"`, i.e. a tab bar Tab could not enter — and `VisibilityGroup` had
`visibleKey: null`, i.e. no tab selected and no panel shown. Both lasted a frame *only
because a re-render always followed*.

The fixes went to different layers on purpose:

- `selectTabIndex` now falls back to `pendingValue` **when nothing has registered yet**,
  because that selector *is* the roving rule and every consumer needs it right. Scoped to
  the empty case, so a pending value that never arrives cannot take the tab stop away
  from members that did.
- `Tabs` reads `visibleKey ?? pendingKey` itself, because the core distinguishes the two
  deliberately — `selectIsKeyPending` exists so a `Modal` can decide whether to render
  children at all.

**3. `expectAgentDrivable` was wrong about roving groups.** M3's helper rejected every tab
outright: *"has a negative tabindex, so it can be clicked but never reached with Tab."*
Right for a standalone button, wrong for a tab — a roving group's whole design is that
exactly one member is in the tab order. The rejection was **replaced by the roving rule
itself**, which is the stronger assertion: inside a `tablist`/`listbox`/`menu`/
`radiogroup`/`tree`/`grid`/`toolbar`, exactly one enabled member may be tabbable. Zero
strands the widget; several mean the pattern was never implemented.

## Provenance

`@floating-ui/react` — MIT, maintained from the UK and US
(`github.com/floating-ui/floating-ui`). Clears the house rule on software provenance
([decision](../../../agentic/docs/decisions/2026-06-23-avoid-chinese-origin-software.md)),
and the plan had already flagged it for vetting before adoption.

## Evidence

`packages/ui/src/Tabs/` — 5 stories, every one with a `play`, run in chromium with axe at
`test: "error"`. `Interactive` asserts both activation modes against the same component:
in `manual`, `aria-selected="false"` on the focused tab while the previous panel is still
showing; in `automatic`, the same keystroke does both.
