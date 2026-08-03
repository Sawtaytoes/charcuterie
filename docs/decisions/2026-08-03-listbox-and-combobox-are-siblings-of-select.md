# `Listbox` and `Combobox` are siblings of `Select`, not replacements

**Status:** Accepted
**Date:** 2026-08-03
**Type:** Architecture · API
**Supersedes:** —
**Superseded by:** —

## Decision

`Listbox` (single-select, rich options) and `Combobox` (searchable, filtering, virtualized)
ship alongside the native `Select`, not in place of it. Reach for `Select` for a plain
option list, `Listbox` for a short rich-option one, and `Combobox` when the list is long
enough to search or filter.

## Why `Select` stays

Native `<select>` keeps type-ahead, Home/End/PageUp/Down, the mobile wheel picker, form
submission, `:invalid`, and autofill — none of which a `<div>`-based widget gets for free.
`Listbox`/`Combobox` exist for the one thing `<option>` cannot do: render a `ReactNode` — an
icon, two lines, a trailing intent-coloured badge. They are new siblings for the
rich-option and filtering cases, not a migration target for every `Select`.

This also retires the "component with no caller" objection that refused a bare `Listbox`
earlier
([2026-07-31 Select-is-uncontrolled record](2026-07-31-select-is-uncontrolled-because-the-platform-owns-the-value.md)):
`Combobox` has seven consumers waiting (mux-magic's pickers), and `Listbox` is the short-list
half of the same family.

## Two ARIA patterns, and the difference is forced

- **`Listbox` uses roving tabindex.** Focus moves to the options (exactly one is a tab
  stop), the APG requires type-ahead of it (which `Menu` omits), and `aria-selected` reflects
  the real selection. The trigger stays a native **button** that opens a listbox
  (`aria-haspopup="listbox"`) — not a `combobox`; `useAnchoredOverlay` drops floating-ui's
  `role="combobox"` override for exactly this, and exposes a `triggerId` so the
  `role="listbox"` panel (an ARIA input field) can be named across the portal.
- **`Combobox` uses `aria-activedescendant`.** Focus stays in the text input, so the active
  option is tracked without moving the caret. The input is the `role="combobox"`; the popup
  is a `role="listbox"` of `<button role="option" tabindex="-1">` rows with **zero** tab
  stops — a combobox popup legitimately has none.

## The virtualization dependency

`Combobox` windows long lists with `@tanstack/react-virtual` — the second runtime dependency
this package has ever taken (after `@floating-ui/react`). It is **MIT, US-origin** (Tanner
Linsley), which clears the workspace's avoid-Chinese-origin-software provenance rule,
tree-shakeable, and ~4 KB gz. It is added to `dependencies` and to the runtime-boundary gate
in `sourceRules.test.ts`. Windowed options **must** carry `aria-setsize`/`aria-posinset`,
because most of the list is not in the DOM and a screen reader would otherwise announce "2 of
12" for a 4,000-item list. Virtualization stays off below ~100 options so short lists keep
plain DOM and simple tests.

## Out of scope

`TypePicker` stays a `Menu`, not a listbox — settled and marked "DO NOT revert" in
mux-magic's own record. `Combobox` has seven comboboxes to migrate, none of them that one.
