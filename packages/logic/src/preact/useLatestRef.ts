// Mirror of `../react/useLatestRef.ts`.

import { useEffect, useRef } from "preact/hooks"

/**
 * Holds the most recent value without making it a dependency, so
 * a core built once can still call this render's `onChange`
 * rather than the one it was born with.
 */
export const useLatestRef = <Value>(value: Value) => {
  const ref = useRef(value)

  useEffect(() => {
    ref.current = value
  })

  return ref
}
