# `Menu`'s `items` is a discriminated union, not a flat item list

- **Status:** Accepted
- **Date:** 2026-08-05
- **Type:** Component API
- **Supersedes:** —
- **Superseded by:** —

## Decision

`MenuProps.items` is `MenuEntry[]`, where `MenuEntry` is
`MenuItem | MenuSeparator | MenuGroup`:

- `MenuItem` — the existing `{ key, label, onSelect, icon?, isDisabled? }`, with an
  optional `type?: "item"` discriminant so a bare item still type-checks.
- `MenuSeparator` — `{ key, type: "separator" }` → `role="separator"`.
- `MenuGroup` — `{ key, label, items: MenuItem[], type: "group" }` → `role="group"`
  named by `label` via `aria-labelledby`.

Plus `emptyState?: ReactNode`, rendered as a **disabled** `menuitem` when no item
is present. Groups do not nest (a group holds `MenuItem`s only). Arbitrary
interactive nodes are **not** supported.

## Context

`items: MenuItem[]` was the whole content model — every entry a `menuitem`. The
consumer backlog wanted a separator, a group heading, an empty state, and an
arbitrary node, and each of the first three is a distinct ARIA role rather than a
render tweak, so a flat list could not express them without lying about the tree.

## Why

The owner chose the **discriminated union** over a smaller "separators + empty only"
step or a maximal "union incl. arbitrary node". Reasons the union is the right size:

- The keyboard model needs **no new code**. A separator and a group heading register
  nothing with the roving group, so the arrow keys skip them exactly the way a
  disabled item is already skipped; a group's items register normally and focus
  moves through them in DOM order.
- It stays backward compatible: a bare `MenuItem` needs no `type`, so every existing
  `items` array still compiles.
- **Arbitrary interactive nodes are excluded on purpose.** A focusable custom node
  inside a `role="menu"` breaks the roving-tabindex model (two tab-order stories) and
  the "menu vs listbox" role contract; it is the one variant that cannot be added
  without redesigning the focus model, so it is left out until there is a real need.
- The **empty state is a disabled `menuitem`, not inert text**: a `role="menu"` with
  no `menuitem` child fails `aria-required-children`, so the note has to be one —
  `aria-disabled` and `tabindex="-1"`, announced but never focused. "No actions
  available" as a `role="presentation"` div would have left the menu axe-dirty.

## Evidence

- `Grouped` story + tests: two `role="group"`s named "Disc"/"Danger", one
  `role="separator"`, and arrow-down walks Retry → Skip → Eject across the group
  boundary without stopping on a heading or the rule. axe clean.
- `Empty` story + test: one `aria-disabled` `menuitem` with `tabindex="-1"`, axe
  clean.
