# M8 — the overlay rebuild and the picker family

**Date:** 2026-08-03
**Ships:** `@charcuterie/ui@2.0.0` (breaking)

M8 rebuilt the overlay layer on a portal, renamed the mis-named `Modal`, and shipped the
two rich dropdowns the fleet has been waiting on. **P2 has landed** — `Combobox` exists —
so mux-magic's `PortalDropdown` and its four pickers can now migrate off their hand-rolled
positioning and onto the library.

## What changed

- **Overlays portal to `document.body`**, not the top layer
  ([decision](decisions/2026-08-03-overlays-portal-to-the-body-not-the-top-layer.md)). New
  shared foundation in `packages/ui/src/Overlay/`: `OverlayStack` (provider + one shared
  `bg-scrim`), `OverlayPanel` (portalled, focus-trapped, top-of-stack dismiss),
  `useAnchoredOverlay` (the consolidated floating-ui block with `size` for
  trigger-width/viewport-clamp), `overlayPanelClass`, and the moved `lockScrollBehind`.
- **`Modal` → `Dialog`, and a new base `Modal`**
  ([decision](decisions/2026-08-03-modal-is-the-base-layer-and-dialog-is-the-component.md)).
  `Dialog` is the old chrome verbatim; `Modal` is backdrop + dismiss + portal, no chrome.
  `ModalSize` → `DialogSize`. `Lightbox` migrated to `Dialog`.
- **`Popover`, `Menu`, `Tooltip` portalled**; the `popover="manual"`/`showModal()`
  machinery is gone. The M4 synthetic-`Escape` limitation dies — `userEvent.keyboard`
  presses it for real.
- **`Listbox` and `Combobox`**
  ([decision](decisions/2026-08-03-listbox-and-combobox-are-siblings-of-select.md)) — the
  single-select and searchable/virtualized halves of the picker family. `Select` stays.

## The follow-up: migrate mux-magic's pickers (P2 executable now)

The work order for this was written across five documents before `Combobox` existed and
they agree precisely (see `mux-magic/docs/workers/zindex-radix-consolidation.md`, the two
2026-07-31 overlay decisions, `m6a`/`m6b`). It is now executable:

- The **seven comboboxes** (`CommandPicker` + `EnumPicker` + `LinkPicker` are the same
  component three times; `PathPicker`, `RenameTargetPicker`, `AssFieldPicker`,
  `LanguageCodeField`) take `Combobox`, and the hand-rolled positioning goes with it.
  `useAnchoredOverlay` deletes `state/pickerAtoms.ts` outright and replaces all five
  `computePosition` copies. `matchTriggerWidth` ports `PortalDropdown`'s width behaviour;
  `maxHeightPx` ports the viewport clamp; async options are the
  `onQueryChange`+`isLoading`+`options` path (react-query stays the consumer's).
- The **adaptive threshold** is a prop, not two components: below
  `SEARCHABLE_CANDIDATE_COUNT` render a `Listbox`, above it a `Combobox`.
- `TypePicker` stays a `Menu` — do not revert.
- **Rebase caveat:** several docs still point at `mux-magic@feat/mux-branch-revamp`, which
  was retired on 2026-08-03. Rebase any derived work order onto `master`.

This milestone is P2; the mux-magic migration is the **next** milestone, not this pass.

## Verification

`yarn build && yarn typecheck && yarn lint && yarn test && yarn smoke:storybook` all green;
180 Storybook entries render clean; the WCAG-contrast gate and axe-at-`error` stay clean.
Screenshots of the driven states (stacked dialogs on one backdrop, the Combobox filtering
with its search box, a virtualized list mid-scroll, the `overflow: hidden` escape) are in
`packages/ui/__screenshots__/` / the M8 branch.
