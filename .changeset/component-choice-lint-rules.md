---
"@charcuterie/eslint-config": minor
---

Add `createComponentChoiceRules({ files })` — an **opt-in** block of seven rules under a
`charcuterie/` plugin that stop app code reaching past the library for a raw element, and
say which component to reach for instead.

- `charcuterie/no-raw-anchor` — `<a>` → `TextLink` / `ButtonLink`, both of which render a
  real `<a href>` so middle-click and open-in-new-tab keep working.
- `charcuterie/no-raw-button` — `<button>` → `Button`, or `IconButton` when the control is
  icon-only and would otherwise have a glyph for its accessible name.
- `charcuterie/no-raw-select` — `<select>` → `Listbox` (short, rich) / `Combobox` (long,
  searchable).
- `charcuterie/prefer-listbox-over-select` — `Select` is demoted to a stated-reason
  exception.
- `charcuterie/no-clickable-non-interactive` — `onClick` on a `<div>`/`<span>`/`<li>` with
  no `role` or `tabIndex`.
- `charcuterie/no-navigation-in-click-handler` — `navigate()` / `router.push()` /
  `location.href =` inside an `onClick`.
- `charcuterie/require-suppression-reason` — a disable of any of the above needs a
  `-- reason`.

Opt-in and additive: nothing changes for a consumer that does not add the block. `files`
has no fleet-wide default, and is what keeps the rules off `@charcuterie/ui`, which renders
those raw elements on purpose.
