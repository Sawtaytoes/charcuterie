# The overflow action menu is a library shape, and its dots are drawn in CSS

Status: Accepted
Date: 2026-09-28
Type: Component ownership
Supersedes: None
Superseded by: None

## Decision

`ActionMenu` owns the overflow control: a ghost, neutral `IconButton` trigger that opens a
`Menu` at `placement="bottom-end"`, with the open state kept inside the component. Props are
`items` (`MenuEntry[]`), `label` (the trigger's accessible name, which also names the menu
through `aria-labelledby`), an optional `size`, and an optional `icon`.

The default icon is three `0.17em` round boxes stacked in a flex column, filled with
`currentColor`. It is neither a `⋮` character nor an SVG, so the 2026-07-29
no-icons-and-no-symbol-glyphs record holds unchanged. An app that wants its icon set's exact
glyph passes it as `icon` — Docket and Whereabouts pass lucide's `EllipsisVertical` at
`strokeWidth={1.75}`.

## Context

Docket's `TaskActionMenu` and Whereabouts' `PlaceActionsMenu` were the same component: an
`IconButton` with lucide dots, a `useState`, a toggle on click, a close on dismiss, and
`bottom-end`. Two apps sharing a shape puts it in Charcuterie first. The request asked for
lucide's `EllipsisVertical` built in; the library cannot depend on an icon set, so the
default is drawn and the lucide glyph stays one prop away.

## Why

- **Internal open state**: nothing outside the button has a reason to open the menu, and
  `Menu` already routes item choice, Escape and outside press to `onDismiss`.
- **`label` is required and names the thing**: twenty `More` buttons on one page are
  twenty identical names to a screen reader and to `getByRole`.
- **CSS dots over a glyph or an SVG**: a glyph is a font dependency and an SVG is an icon
  asset; three boxes are neither, and they take the trigger's intent and hover colour.

## Evidence

Coordinator brief, 2026-09-28: "add an `ActionMenu` to Charcuterie. It is a vertical-dots
(lucide `EllipsisVertical`, strokeWidth 1.75) ghost/neutral `IconButton` trigger wrapping
`Menu`, with `placement="bottom-end"` … Precedent:
docket/packages/web/src/components/TaskActionMenu.tsx is the exact shape. Whereabouts now
has the same thing in PlaceActionsMenu.tsx, so two apps share it."
