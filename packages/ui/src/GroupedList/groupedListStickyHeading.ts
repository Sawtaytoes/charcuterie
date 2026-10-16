/**
 * The custom property a stuck heading reads its background from.
 * Set it on any ancestor; it falls back to `--color-surface-base`.
 */
export const GROUPED_LIST_HEADING_SURFACE_PROPERTY =
  "--charcuterie-grouped-list-heading-surface"

/**
 * The custom property a stuck heading reads its distance from the
 * scroll container's top edge from. It falls back to `0px`.
 */
export const GROUPED_LIST_HEADING_OFFSET_PROPERTY =
  "--charcuterie-grouped-list-heading-offset"

/**
 * Written out in full because Tailwind scans source text for whole
 * class strings: an interpolated property name generates nothing.
 *
 * The heading row carries the space under it as padding rather than
 * the group's `gap`, because a gap is transparent and the rows would
 * show through it while the heading is stuck.
 */
export const STICKY_HEADING_CLASS =
  "sticky top-[var(--charcuterie-grouped-list-heading-offset,0px)] z-[var(--layer-sticky)] bg-[color:var(--charcuterie-grouped-list-heading-surface,var(--color-surface-base))] pb-2"
