import { useState } from "react"

/**
 * The value, or — once it becomes `null` or `undefined` — the last
 * value it had. For an overlay whose content comes from a selection:
 *
 * ```tsx
 * const editingCard = cards.find((card) => card.id === editingId)
 * const shownCard = useLastPresentValue(editingCard)
 *
 * <Dialog isVisible={editingCard !== undefined} heading={`Edit ${shownCard?.name}`}>
 *   {shownCard ? <CardForm card={shownCard} /> : null}
 * </Dialog>
 * ```
 *
 * Closing clears the selection in the same render that starts the
 * dialog's exit, so without this the dialog spends its exit animation
 * empty — it shrinks to a heading as it fades, which reads as a glitch
 * rather than as closing. Visibility still follows the live value; only
 * the content is held.
 */
export const useLastPresentValue = <Value>(
  value: Value | null | undefined,
): Value | undefined => {
  const [lastPresent, setLastPresent] = useState<
    Value | undefined
  >(value ?? undefined)

  if (
    value !== null &&
    value !== undefined &&
    !Object.is(value, lastPresent)
  ) {
    setLastPresent(value)
  }

  return value ?? lastPresent
}
