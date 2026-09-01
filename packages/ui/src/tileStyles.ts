/**
 * The tile shape, shared by the two components that draw it.
 *
 * A tile is a bordered card carrying a name and a line of help, laid
 * out in a grid that gains columns with its CONTAINER. `RadioGroup`
 * draws one per option when `itemShape="tile"`; `ActionTiles` draws
 * one per action. The two must be the **same box** — a page that puts
 * "which activity" beside "what would you like to do" would otherwise
 * show two cards with different padding, different corners and
 * different gaps, which is the drift this file exists to make
 * impossible.
 *
 * Same argument as `CONTROL_BASE_CLASS`, which `Button` and
 * `ButtonLink` share for the same reason: "identical" spelled as two
 * copies of one string is a promise that survives exactly one edit.
 *
 * These were `RadioGroup`'s private constants until `ActionTiles`
 * shipped. Nothing about their values changed on the way out.
 */

import type { ControlSize } from "@charcuterie/tokens"

/**
 * A tile is a card, so its padding is a card's rather than a
 * control's — enough that the border reads as a box around content
 * and not as an outline on a line of text.
 *
 * This is also the whole reason `ActionTiles` exists rather than a
 * `Button` with a `className`: a `Button` is sized by
 * `h-(--control-height-md)` and carries **no block padding at all**,
 * so an app that reaches for `height: auto` to let one wrap gets a
 * two-line card with `padding: 0` down its block axis and no error
 * anywhere. QueuePilot's queue-type chooser shipped exactly that.
 */
export const TILE_PADDING_CLASS: Record<
  ControlSize,
  string
> = {
  sm: "px-3 py-2.5",
  md: "px-3.5 py-3",
  lg: "px-4 py-3.5",
}

/**
 * The box, and only the box. Every state layered over it is a
 * **border and a surface**, never colour alone — the same reason
 * `Stepper` refuses to say "done" with a hue.
 */
export const TILE_BOX_CLASS =
  "rounded-lg border border-border-subtle bg-surface-raised"

export const TILE_TEXT_SIZE_CLASS: Record<
  ControlSize,
  string
> = {
  sm: "text-sm",
  md: "text-md",
  lg: "text-lg",
}

/**
 * One step down from the tile's own text, and never below `xs`: a
 * hint that keeps shrinking with the density axis is the 11px
 * caption the 2026-08-10 ramp rebuild exists to have removed.
 */
export const TILE_HINT_TEXT_CLASS: Record<
  ControlSize,
  string
> = {
  sm: "text-xs",
  md: "text-xs",
  lg: "text-sm",
}

/**
 * Wider than a list's row gaps: rows are separated by their leading,
 * and tiles by nothing but the gap, so the same 6px that reads as a
 * list reads as a seam between two cards.
 */
export const TILE_GAP_CLASS: Record<ControlSize, string> = {
  sm: "gap-1.5",
  md: "gap-2",
  lg: "gap-3",
}

/**
 * `auto-fill`, and deliberately not `auto-fit`.
 *
 * `auto-fit` collapses the empty tracks and lets the ones that
 * remain share the whole row, so six tiles in a 2560px container
 * become six 420px slabs — the full-width-row shape in a new
 * costume. `auto-fill` keeps the empty tracks, so a tile stays a
 * tile and the grid simply has room to spare.
 *
 * `min(…, 100%)` is what stops the floor overflowing a container
 * narrower than one tile, which is the Narrow View and is otherwise
 * a horizontal scrollbar on a phone.
 *
 * The floor arrives as a custom property rather than an interpolated
 * class because Tailwind scans source *text* for complete class
 * strings: `` `grid-cols-[…${n}px…]` `` generates nothing, paints
 * nothing and reports nothing. One written-out literal reading
 * `var(--charcuterie-tile-min-inline-size)` covers every width an
 * app can ask for — the same reason `Card`'s accent edge goes
 * through one property.
 *
 * This is **not** `useAdaptiveColumns`, and the difference is the
 * question being asked. That hook buys a column with height, for an
 * unbounded gallery that will scroll; a tile set is a bounded group
 * inside a form section or a first step, where the only question is
 * how many fit across the box it was given.
 */
export const TILE_COLUMNS_CLASS =
  "grid-cols-[repeat(auto-fill,minmax(min(var(--charcuterie-tile-min-inline-size),100%),1fr))]"

/** The property `TILE_COLUMNS_CLASS` reads its floor from. */
export const TILE_MIN_INLINE_SIZE_PROPERTY =
  "--charcuterie-tile-min-inline-size"
