# Tab selection is a `SinglePicker`, not a `VisibilityGroup`

**Status:** Accepted
**Date:** 2026-07-30
**Type:** State modelling
**Supersedes:** the M4 framing in
[the state-layer verdict](2026-07-30-state-layer-is-charcuterie-on-floating-ui.md), which
described `Tabs` as `VisibilityGroup` + `RovingFocus`
**Superseded by:** —

## Decision

`Tabs` composes **`useSinglePicker` + `useRovingFocus`**. `SinglePicker` answers *which tab
is chosen*; `RovingFocus` answers *which tab is tabbable*; a panel's `hidden` is **derived**
from the first.

`TabTrigger`'s prop is `registerSelection`, not `registerPanel`.

Everything else about the component is unchanged, including the one line that is the whole
difference between `automatic` and `manual` activation:

```ts
if (activation === "automatic") selection.select(focus.activeValue)
```

## Context

M4 built `Tabs` on `VisibilityGroup`, and the M4 verdict recorded the falsification test
as "`VisibilityGroup` and `RovingFocus` compose". Kevin, before M5:

> *"If we aren't already doing it, tab selection should be using our single selection hook
> for logic."*

We were not. This is the correction, and the M4 record is superseded on that point only —
its actual finding, that focus and selection are separate kinds and that separation is
worth one line, is untouched and is if anything easier to state now.

## Why

**The thing that registers is the tab.** `TabTrigger` calls `register(key)` from an effect;
no panel calls anything. So the registered set is the set of *options*, and the state kind
that owns "which of these registered options did you pick" is `SinglePicker`. Reading it as
a group of visibilities described the *consequence* — one panel showing — rather than the
thing being modelled.

**It made `aria-selected` a report about a panel.** That is the concrete cost, not a
naming preference. A tab bar with **no panels at all** is an ordinary thing to want — a
segmented filter, a view switcher that swaps a route, rip-deck's column picker — and under
the old model such a consumer had to express its choice as a group of visibilities it did
not have, or hand-roll a fourth copy of the same state. `SegmentedControl` (M5) is exactly
that consumer and it now shares this core.

**The two cores are the same shape, and that is the point rather than an objection.**
`createSinglePicker`'s own docstring says so: *"'which one is showing' and 'which one is
chosen' are the same shape, and the fleet hand-rolls both."* Because they are, the swap is
**behaviour-identical** — `Tabs` only ever called `show`/`register` and read
`visibleKey`/`pendingKey`, which map one-for-one onto `select`/`register` and
`selectedValue`/`pendingValue`. It used none of `hide`, `hideAll`, or `toggle`.

**So the tests passing proves nothing, and this record says so plainly.** All 53 `ui-dom`
tests and all 78 story mounts stayed green with no edit, because the change is a modelling
correction and not a behaviour change. What it buys is downstream: the next component that
needs *one of many chosen* reaches for the kind that says so, rather than inheriting an
explanation about visibility it has to argue its way out of.

**`VisibilityGroup` keeps its job.** It is the right kind wherever members genuinely appear
and disappear — an accordion, a disclosure set, a `Modal` stack — and `selectIsKeyPending`
exists for exactly the case where the member has to be rendered before it can register. A
tab bar's tabs are all mounted, all the time.

## Consequences

- `Tabs` is the second consumer of `RovingFocus` and the first of `SinglePicker`.
  `VisibilityGroup` now has no component consumer in `@charcuterie/ui` until an
  `Accordion` (M6) arrives. It stays in `logic`, fully tested by the conformance suite, and
  the M6 accordion is why.
- The disabled-tab rule reads better: a disabled tab is still **an option** (registered with
  the picker, still ownable as the selection a consumer names) and still **not a focus
  member**. Under the old model it "joined the panel group", which invited the question of
  why a panel had anything to say about being disabled.
- One `.mdx` claim was wrong and is now corrected: *"Modelled as a `SinglePicker` … every
  arrow key would have chosen."* It would not. What makes `manual` representable is that
  focus is its **own kind**, which is true regardless of which kind holds the selection.

## Evidence

Kevin, mid-M5, chat `charcuterie-m5`, 2026-07-30 — quoted above.

Verified by `yarn build && yarn test`: 53 `ui-dom` tests, 78 story mounts, 360 workspace
tests, all green before and after, with no test edited. That equality is the finding, not
a pass.
