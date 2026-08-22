/**
 * Shift-click range selection for a list the caller already holds
 * the selection for.
 *
 * Ticking a checkbox one card at a time is fine for two cards and
 * miserable for twenty, and every list the owner uses — Gmail,
 * Explorer, Finder — answers shift-click by filling in everything
 * between.
 *
 * The rules, kept deliberately close to Gmail's:
 *
 * - A plain pick toggles that one item and becomes the **anchor**,
 *   remembering *what it did* as well as where it was.
 * - A shift pick repeats the anchor's verdict across the whole span
 *   between the two. So shift after a tick selects the range, and
 *   shift after an untick clears it — "deselect these five" is the
 *   same gesture, which is the part a plain *add everything in
 *   between* misses.
 * - The anchor then moves to the item just picked, so a third
 *   shift-click walks further down the list instead of re-deriving
 *   from an item scrolled off the top. (Finder's
 *   re-extend-from-a-fixed-anchor rules can *shrink* a selection the
 *   user already made; additive spans never lose a pick by accident.)
 * - No anchor, or an anchor that has since left the list — filtered
 *   out, archived, moved — degrades to a plain toggle rather than
 *   doing nothing.
 *
 * ### Why this is not a command on `createMultiplePicker`
 *
 * That core owns its selection and orders it by **mount** order.
 * A range means "everything between these two *as drawn*", and a
 * rendered list is filtered, grouped and re-sorted without
 * remounting — so mount order is the wrong list to slice, and the
 * caller is the only one that knows the right one. This reducer
 * takes that order as an argument and holds no state, which also
 * lets it drive a selection kept in a query cache, a URL or a
 * reducer the app already has.
 *
 * Promoted out of mail-sifter, which had it first and shipped it
 * with eleven tests; Docket's Backlog is the second consumer.
 */

/** The last plainly-picked item, and what that pick did. */
export type SelectionAnchor<Value = string> = {
  /** True if the pick selected; false if it deselected. A range
   * repeats it. */
  isSelected: boolean
  value: Value
}

export type SelectionClick<Value = string> = {
  anchor: SelectionAnchor<Value> | null
  /** Shift was held. */
  isRange: boolean
  /** Values in rendered order — filtered, grouped, exactly as
   * drawn. Nested children sit between their parent and the next
   * parent, because that is where the eye reads them. */
  orderedValues: readonly Value[]
  /** The selection before this click. Never mutated. */
  selectedValues: ReadonlySet<Value>
  /** The item that was clicked. */
  value: Value
}

export type SelectionResult<Value = string> = {
  anchor: SelectionAnchor<Value>
  selectedValues: Set<Value>
}

export const applySelectionClick = <Value = string>({
  anchor,
  isRange,
  orderedValues,
  selectedValues,
  value,
}: SelectionClick<Value>): SelectionResult<Value> => {
  const nextSelectedValues = new Set(selectedValues)

  const anchorIndex =
    anchor === null
      ? -1
      : orderedValues.indexOf(anchor.value)

  const clickedIndex = orderedValues.indexOf(value)

  const hasSpan =
    isRange &&
    anchor !== null &&
    anchorIndex >= 0 &&
    clickedIndex >= 0

  if (!hasSpan) {
    const isSelected = !nextSelectedValues.has(value)

    if (isSelected) {
      nextSelectedValues.add(value)
    } else {
      nextSelectedValues.delete(value)
    }

    return {
      anchor: { isSelected, value },
      selectedValues: nextSelectedValues,
    }
  }

  const start = Math.min(anchorIndex, clickedIndex)
  const end = Math.max(anchorIndex, clickedIndex)

  for (const spanValue of orderedValues.slice(
    start,
    end + 1,
  )) {
    if (anchor.isSelected) {
      nextSelectedValues.add(spanValue)
    } else {
      nextSelectedValues.delete(spanValue)
    }
  }

  return {
    anchor: { isSelected: anchor.isSelected, value },
    selectedValues: nextSelectedValues,
  }
}
