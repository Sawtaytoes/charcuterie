import { useLatestRef } from "@charcuterie/logic"
import type { ReactNode } from "react"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

import { SharedBackdrop } from "./SharedBackdrop.tsx"

/**
 * The ordered stack of open **backdrop** modals, and the one shared
 * scrim that stands behind all of them.
 *
 * ### Why a stack at all
 *
 * A modal must know two things it cannot see for itself: whether it is
 * the **top** of the stack (only the top traps focus and answers
 * Escape / an outside press; everything under it is `inert`), and how
 * **deep** the stack is (the scrim shows while at least one modal is
 * open and hides when the last closes). An `OverlayPanel` registers on
 * open and unregisters on close, and reads `topId`/`depth` back.
 *
 * ### The provider is optional
 *
 * `useOverlayStack()` has a self-hosting default — `isProvided:
 * false`, a no-op register, `depth: 0` — so a lone `Modal` needs no
 * setup: it sees it is unprovided and renders its own scrim, treating
 * itself as the top. Only *stacking* needs `OverlayStackProvider` at
 * the app root, where a single shared scrim and real top-of-stack
 * bookkeeping replace N self-hosted scrims fighting for the same
 * corner.
 */
export type OverlayStackEntry = {
  id: string
  onClose: () => void
}

export type OverlayStackValue = {
  depth: number
  /**
   * `false` in the context default. An `OverlayPanel` reads this to
   * decide whether to render its own scrim (unprovided) or defer to
   * the provider's shared one.
   */
  isProvided: boolean
  register: (entry: OverlayStackEntry) => void
  /** Closes the top entry — the imperative twin of an outside press. */
  requestCloseTop: () => void
  topId: null | string
  unregister: (id: string) => void
}

const DEFAULT_STACK: OverlayStackValue = {
  depth: 0,
  isProvided: false,
  register: () => {},
  requestCloseTop: () => {},
  topId: null,
  unregister: () => {},
}

const OverlayStackContext =
  createContext<OverlayStackValue>(DEFAULT_STACK)

export const useOverlayStack = (): OverlayStackValue =>
  useContext(OverlayStackContext)

export const OverlayStackProvider = ({
  children,
}: {
  children: ReactNode
}): ReactNode => {
  const [entries, setEntries] = useState<
    OverlayStackEntry[]
  >([])

  // Read through a ref so `requestCloseTop` stays stable while still
  // seeing the live top.
  const entriesRef = useLatestRef(entries)

  const register = useCallback(
    (entry: OverlayStackEntry) => {
      setEntries((previous) =>
        // In place when the id is already present — an `onClose`
        // update must not reorder the stack, or a re-render would
        // shuffle which modal is "top". New ids append, which is what
        // makes the last-registered one the top.
        previous.some((one) => one.id === entry.id)
          ? previous.map((one) =>
              one.id === entry.id ? entry : one,
            )
          : [...previous, entry],
      )
    },
    [],
  )

  const unregister = useCallback((id: string) => {
    setEntries((previous) =>
      previous.filter((one) => one.id !== id),
    )
  }, [])

  const requestCloseTop = useCallback(() => {
    entriesRef.current.at(-1)?.onClose()
  }, [entriesRef])

  const value = useMemo<OverlayStackValue>(
    () => ({
      depth: entries.length,
      isProvided: true,
      register,
      requestCloseTop,
      topId: entries.at(-1)?.id ?? null,
      unregister,
    }),
    [entries, register, requestCloseTop, unregister],
  )

  return (
    <OverlayStackContext.Provider value={value}>
      {/* First, so it mounts its portal before the panels and paints
          beneath them at an equal z-index. */}
      <SharedBackdrop isVisible={entries.length > 0} />

      {children}
    </OverlayStackContext.Provider>
  )
}
