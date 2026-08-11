/**
 * The collapse rule: how many of a toolbar's items fit, given what
 * they measured.
 *
 * Pure arithmetic, in its own file for the same reason
 * `chooseColumns` is — the rule is a table of numbers anyone can
 * check in Node, and everything that needs a browser is quarantined
 * in `useToolbarOverflow`.
 *
 * ## Priority is the array order
 *
 * `itemInlineSizes` is in **priority order, highest first**, which
 * is also paint order: the toolbar collapses from the end. One axis
 * rather than two, because a separate `priority` number and a
 * separate display order is a pair a caller can put out of step,
 * and neither mux-magic nor plex-channels has *any* ordering — they
 * hardcode which controls live in the bar and which live in the
 * popover, at every width.
 *
 * ## Why the trigger's width is an input
 *
 * The overflow trigger only exists once something has collapsed, so
 * the question is not "how many fit" but "how many fit **beside a
 * trigger** — unless all of them fit without one". Ignoring that is
 * how an overflow control ends up wrapping to a second line at
 * exactly the width where it first appears.
 */

export const chooseVisibleCount = ({
  availableInlineSize,
  gapInlineSize,
  itemInlineSizes,
  triggerInlineSize,
}: {
  /** The room the bar has, in CSS px. */
  availableInlineSize: number
  /** The row's `column-gap`, in CSS px. */
  gapInlineSize: number
  /** Each item's measured inline size, priority order, in CSS px. */
  itemInlineSizes: readonly number[]
  /** The overflow trigger's inline size, in CSS px. */
  triggerInlineSize: number
}): number => {
  const itemCount = itemInlineSizes.length

  if (itemCount === 0) {
    return 0
  }

  /**
   * Nothing measured yet — show everything.
   *
   * The safe direction to be wrong in for one frame, and the same
   * one `useAdaptiveColumns` argues from the other end: a bar that
   * starts whole and collapses over-draws, where a bar that starts
   * collapsed hides controls that were there. It is also what makes
   * the first measurement possible at all, because an item that was
   * never mounted has no width to read.
   */
  if (availableInlineSize <= 0) {
    return itemCount
  }

  const measure = (count: number, extra: number) =>
    itemInlineSizes
      .slice(0, count)
      .reduce((total, size) => total + size, 0) +
    gapInlineSize *
      Math.max(count + (extra > 0 ? 1 : 0) - 1, 0) +
    extra

  if (measure(itemCount, 0) <= availableInlineSize) {
    return itemCount
  }

  // Everything below here has an overflow trigger in the row, so
  // every candidate pays for it. Counting down rather than up
  // because the answer is usually near the top.
  for (let count = itemCount - 1; count > 0; count -= 1) {
    if (
      measure(count, triggerInlineSize) <=
      availableInlineSize
    ) {
      return count
    }
  }

  // Not even one item and the trigger fit. Everything collapses;
  // the trigger alone may still overflow, and a bar narrower than
  // one control is a layout problem no collapse rule can solve.
  return 0
}
