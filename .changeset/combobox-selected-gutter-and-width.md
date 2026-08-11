---
"@charcuterie/ui": minor
---

Keep a `Combobox` option's layout stable across selection, and cap the popover's width.

Two `Combobox` fixes:

- **Selected checkmark no longer shifts the label (#8).** `ComboboxOption` used to
  render the ✓ only when a row was selected, so the label's available width changed the
  instant it became selected — a consumer whose label pins a trailing element (a category
  tag) to the row's right edge saw that element jump left. The ✓ is now always laid out in
  a fixed-width gutter and merely made `invisible` when unselected, so selection is a
  paint-only change. Aria semantics are unchanged: selection is still conveyed by the
  button's `aria-selected`, and the glyph stays `aria-hidden`.

- **Overlong footers/options no longer stretch the panel (#12).** `useAnchoredOverlay`
  gains a `maxWidthPx` option, symmetric with `maxHeightPx`, wired into its `size`
  middleware (`min(maxWidthPx, availableWidth)`). `Combobox` passes a 384px default cap and
  now lets its footer wrap (`whitespace-normal` / `break-words` / `overflow-wrap`), so a
  full-sentence `footer` — or a very long option label — wraps instead of dragging the
  whole popover absurdly wide. The `min-w-64` floor is unchanged. Other overlay consumers
  (`Popover`, `Menu`, `Listbox`) opt in by passing the new option; their behaviour is
  untouched.
