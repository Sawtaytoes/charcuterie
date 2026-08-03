---
"@charcuterie/ui": major
---

M8 — the overlay rebuild and the picker family (`ui@2.0.0`, breaking).

**Breaking:** `Modal` is now the **base layer** (portalled backdrop + dismiss + focus trap,
no chrome). The old chrome-bearing component is renamed to **`Dialog`** verbatim, and
`ModalSize` becomes `DialogSize`. Callers that used `heading`/`footer`/`size`/`headingLevel`
move `Modal` → `Dialog` (props unchanged — mechanical).

- **Overlays portal to `document.body`** instead of the platform top layer, so a panel is no
  longer clipped by an `overflow: hidden`/`transform` ancestor. New `Overlay/` foundation:
  `OverlayStack` (provider + one shared `bg-scrim`), `OverlayPanel`, `useAnchoredOverlay`.
  Stacking is portal append order at one `--layer-modal`; `OverlayStackProvider` gives N
  stacked modals one scrim and top-first dismissal.
- `Popover`, `Menu`, `Tooltip` portalled; the `popover="manual"`/`showPopover()` machinery
  is gone, and `userEvent.keyboard("{Escape}")` now presses Escape for real.
- New **`Listbox`** (single-select, rich options, roving focus + type-ahead) and
  **`Combobox`** (searchable, filtering, `aria-activedescendant`, loading/error/empty/footer,
  creatable, multiple chips, virtualized) — siblings of the native `Select`, which stays.
- New runtime dependency `@tanstack/react-virtual` (MIT, US-origin) for `Combobox` windowing.
- `Lightbox` migrates from `Modal` to `Dialog` (no behaviour change).
- New export: `OverlayStackProvider`. Removed export: `ModalSize`.
