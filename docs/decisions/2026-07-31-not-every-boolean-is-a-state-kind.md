# Not every boolean is a state kind

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Architecture
**Supersedes:** —
**Superseded by:** —

## Decision

A component reaches for `@charcuterie/logic` when its state is one of three things:

- **registered** — members join a group, and membership is the mechanism (`Tabs`,
  `Accordion`, `Menu`, `SegmentedControl`)
- **composed** — two kinds are true at once and may disagree on purpose (`Tabs` in
  `manual` activation: focus and selection)
- **shared** — a trigger and a target at opposite ends of a tree need one answer
  (`Modal`, `Popover`, `Tooltip`)

Anything else is `useState`. In particular, **being a boolean is not a reason**.

Two consequences already banked:

- `LogViewer`'s `isFollowing` is `useState`. It is one component reading one boolean it
  wrote itself.
- `Select` owns **no** state at all — see
  [Select is uncontrolled because the platform owns the value](2026-07-31-select-is-uncontrolled-because-the-platform-owns-the-value.md).

## Context

Every interactive component through M5b holds its state in a `logic` kind, and the habit
had become the rule. `LogViewer` is the first component where following the habit would
have been actively worse: `useVisibility` is a boolean with `show`/`hide`/`toggle` and
would have fit mechanically, at the cost of `isVisible` meaning "is following".

M6 also closed the opposite question. The plan expected `useLinkedIds` to do `Field`'s
`aria-describedby` wiring. It does not fit — a field renders its own description and error,
so it knows at render which exist, and the ids come from one `useUniqueId` and a
conditional join. That is the same reason `createLinkedIds` was not used in `Tabs`.

**`createLinkedIds` therefore has no consumer in `@charcuterie/ui` across twenty-five
components.** It is the one state kind the component layer has never needed.

## Why

A state layer is only worth having if naming a kind tells a reader something. Once
`useVisibility` can mean "is following", `useSinglePicker` can mean "the current thing", and
the kinds stop being claims about behaviour and become a house style for `useState`.

The three criteria above are what the five kinds actually earn: registration is why a
disabled member is skipped without any command knowing the word "disabled"; composition is
why `automatic` and `manual` activation differ by one line; sharing is why a trigger and a
panel cannot get out of step.

`createLinkedIds` having no consumer is left standing rather than fixed. Manufacturing a use
for it would be the same mistake in the other direction, and an unused kind that is
*honestly* labelled unused is better information than a contrived caller. Whether it earns
its place in 1.0.0 is a question for the cut, not for this milestone.

## Evidence

Written during M6 while building `LogViewer` and `Field`. The `Field` half restates the
finding `Tabs` recorded in M4 about `createLinkedIds` being for a *dynamic* trigger↔target
pair; two components with a specific reason not to use a kind is worth promoting from a
code comment to a decision.
