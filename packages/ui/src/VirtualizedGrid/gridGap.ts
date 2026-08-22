/**
 * The gap between tracks and between rows in a wrapping grid, in
 * CSS px.
 *
 * `AdaptiveGrid` spells this `gap-4` and never has to know the
 * number: it lays out in flow, so the browser owns the spacing.
 * `VirtualizedGrid` does have to know it. The space between two
 * rows falls outside the box either of them measures, and the rows
 * above and below the window are arithmetic rather than layout, so
 * a gap the component cannot name is a gap its scrollbar is wrong
 * by — once per row, which on a list of two thousand is half a
 * page.
 *
 * `4` on Tailwind's spacing scale is `1rem`, and `1rem` is 16px at
 * the fleet's root size. Exported so a caller measuring its own
 * `itemBlockSize` off a running page can account for it rather
 * than rediscovering the number.
 */
export const DEFAULT_GRID_GAP_PX = 16
