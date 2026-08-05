# Combobox multi-select is `isMultiple`, not a separate component

- **Status:** Accepted
- **Date:** 2026-08-05
- **Type:** Component API
- **Supersedes:** —
- **Superseded by:** —

## Decision

Multi-select stays a **mode of `Combobox`** (`isMultiple`), not a new sibling
component. In that mode the chosen values render as an **always-visible row of
removable chips above the trigger**, each showing the option's human label and
an ✕ — the popup shows only the option list. The single-select path is
unchanged.

No `MultiSelectField` / `MultipleSelectField` / `TagInput` is added.

## Context

The owner reviewed the Combobox multi-select in Storybook and found it
confusing: the chips rendered **inside the popup**, so they vanished when it
closed and there was "no tag for each selected item … no way to remove them",
versus mux-magic's `LanguageCodesField`, which shows always-visible removable
chips. Asked how to close the gap on a library used by five apps, he said:

> "I'm torn between building tags into `isMultiple` and shipping
> `MultipleSelectField` which doesn't match the existing nomenclature AT ALL. I
> think probably doing `isMultiple` is correct. Or we simply have 2 components
> altogether … another completely separate component for multi-selection that
> looks almost identical aside from the removable tags."

## Why

- **Naming.** The family is named by ARIA role — `Select` (native), `Listbox`
  (role listbox), `Combobox` (role combobox), per
  [Listbox/Combobox are siblings of Select](2026-08-03-listbox-and-combobox-are-siblings-of-select.md).
  A tag-multiselect has **no distinct ARIA role** — it is still a combobox with
  an `aria-multiselectable` listbox popup. Any new component name
  (`MultiSelectField`, `TokenInput`) would name a *presentation*, not a role,
  and break the scheme — the owner's own objection.
- **The two shapes share almost everything.** Filtering, virtualization, the
  option list, `aria-activedescendant` keyboarding, disabled-skip — all
  identical. The only delta is the chip row and that the field stays open on
  pick. That is a mode, not a component.
- **Extractable later.** The chip row is a dozen lines reading `selected` +
  `onSelect`. If a separate component is ever wanted, it lifts out cleanly; a
  premature split would be two composition models for one behaviour.

## Evidence

mux-magic's `LanguageCodesField` already ships the target UX by hand-rolling
persistent chips and using `Combobox` as a single-select "add one" picker — so
the pattern is proven; this decision folds the persistent chips **into**
`isMultiple` so every consumer gets them without hand-rolling. Consumer for the
mode: any multi-value field (audio/subtitle languages).
