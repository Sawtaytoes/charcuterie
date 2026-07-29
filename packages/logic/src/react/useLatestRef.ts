import { useEffect, useRef } from "react"

/**
 * Holds the most recent value without making it a dependency.
 *
 * Every hook in this binding creates its core **once** and never
 * recreates it, because recreating a core throws away the state
 * it exists to hold. But `onChange` is a fresh arrow function on
 * every render at nearly every call site, so the core cannot
 * close over the one it was born with — it would call last
 * Tuesday's handler forever.
 *
 * The core therefore closes over a stable trampoline that reads
 * this ref. v1 did the same thing by hand in `useVisibility` and
 * `useVisibilityControl`; this is that pattern with a name.
 *
 * Written in an effect rather than during render on purpose: a
 * render can be thrown away (Suspense, an interrupted concurrent
 * render), and a discarded render must not be able to install a
 * handler that then runs.
 */
export const useLatestRef = <Value>(value: Value) => {
  const ref = useRef(value)

  useEffect(() => {
    ref.current = value
  })

  return ref
}
