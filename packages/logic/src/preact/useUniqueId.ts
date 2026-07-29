// Mirror of `../react/useUniqueId.ts`.

import { useId } from "preact/hooks"

/**
 * An id for wiring `aria-controls` / `aria-labelledby`, or the
 * caller's own id when it has one.
 *
 * `useId` has been in `preact/hooks` since 10.11, which is why
 * the peer range starts there rather than at Preact 10.0.
 */
export const useUniqueId = (existingId?: string) => {
  const generatedId = useId()

  return existingId ?? generatedId
}
