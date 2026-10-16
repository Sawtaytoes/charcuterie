# Command palette hotkeys are an opt-in hook, and the palette's open state is the caller's

Status: Accepted
Date: 2026-10-16
Type: API
Supersedes: None
Superseded by: None

## Decision

- **`CommandPalette` is controlled for visibility**, exactly like `Modal`: `isVisible` and
  `onClose`. Escape, an outside press and a chosen row all close through `onClose`.
- **The query is controlled or uncontrolled**, as on `Combobox`: `query` + `onQueryChange`,
  or `defaultQuery`, read each time the palette opens.
- **The global keys are a hook, `useCommandPaletteHotkeys({ onOpen, isEnabled,
  isOpenedByTyping })`**, never a side effect of mounting the component. `Ctrl K` and
  `Ctrl Space` (or `Meta`) open from anywhere; `/` and any printable key open only when
  focus is not in a field or a widget with its own typeahead (`listbox`, `menu`, `tree`,
  `grid`, `combobox`); a printable key becomes the query. A key already `defaultPrevented`,
  composing, or with `Alt` held is left alone.
- **`useCommandPalette()` is the assembled path**: `useVisibility` plus the opening query plus
  the hook, with the keys off while the palette is open, returning `paletteProps` to spread.

## Context

The brief asked for open state "controlled-or-uncontrolled the way sibling components
(`Modal`, `Combobox`) do" and for the global hotkey "as an opt-in hook or prop rather than a
hidden side effect". The 2026-07-29 record keeps the logic hooks uncontrolled; the
components above them are controlled.

## Why

- **A document-wide key listener is a page-level decision.** A page with its own letter
  shortcuts, or with two palettes, must be able to decline it. A prop on the component would
  still tie the listener to a mounted palette, and a palette is mounted only while open.
- **Type-to-open must not steal keys.** A focused `Listbox` or `Menu` jumps to the option you
  type; a text field types. Both are excluded by role, not by element alone.
- **Respecting `defaultPrevented`** means two palettes on one page (a docs page, say) never
  both open: the first listener claims the key.
- **The query is remounted per open** so a typed letter arrives as `defaultQuery` without an
  effect syncing a prop into state, the echo-loop shape the 2026-07-29 record rejects.

## Evidence

The owner, T3 Code chat of 2026-10-16: *"CTRL SPACE works for this, but nothing appears when
you press it. You first have to type."* The approved reference opens on `Ctrl K`,
`Ctrl Space`, `/` and any typed letter. Coordinator brief: *"offer the global hotkey as an
opt-in hook or prop rather than a hidden side effect."*
