# `Select` is uncontrolled, because the platform owns the value

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Component API
**Supersedes:** —
**Superseded by:** —

## Decision

`Select` holds **no** state. `value` seeds `defaultValue` and changes are reported through
`onChange`.

`Select` is also a **native `<select>`**. The six hand-rolled `role="listbox"` controls in
the fleet are not its callers; they are `Combobox`, which stays P2.

## Context

Every other interactive component in `@charcuterie/ui` owns its state through
`@charcuterie/logic`, and `useSinglePicker` is exactly the kind a select's value looks like.
Putting one beside a `<select>` would mean the DOM and the store both hold the chosen
option — which is the argument `Popover` makes about Radix, aimed at ourselves:

> Radix owns `open`, so wrapping it leaves `useVisibility` and Radix both believing they
> hold it.

`Accordion` found the same conflict in the wild, in the app M6 migrates next: mux-magic's
`JobStepsDisclosure` reconciles `<details>`'s `open` with a Jotai atom using a ref, an
effect, and a guard to swallow its own echo.

## Why

**On the state.** A tab bar's selection has no DOM representation, so something has to hold
it — that is why `Tabs` is controlled by Charcuterie. A select's does. A reader should be
able to tell the two apart by asking "does the platform already store this", and get the
right answer every time.

**On being native.** What a hand-rolled listbox has to rebuild from nothing: type-ahead,
Home/End, PageUp/PageDown, the mobile wheel picker, form submission, `:invalid`, autofill.
Twelve of the fleet's fourteen native selects differ from each other only in Tailwind
classes, so one styled `<select>` collapses all twelve.

What native cannot do is render a rich option — an icon, two lines, a badge — or filter.
Every one of mux-magic's six custom pickers (`CommandPicker`, `PathPicker`, `LinkPicker`,
`EnumPicker`, `AssFieldPicker`, `RenameTargetPicker`) needs one of those, and every one of
them is a text input filtering a listbox: the **combobox** pattern, with a different ARIA
contract.

Shipping a bare `Listbox` here that none of the six could adopt would have been a component
with no caller — the thing M6 was explicitly checking for when it surveyed the evidence for
all nine.

## Evidence

M6 survey: 12 native `<select>` sites and 6 `role="listbox"` sites across mux-magic,
rip-deck, castkit and image-viewer. The six listbox sites were read individually; all six
filter.
