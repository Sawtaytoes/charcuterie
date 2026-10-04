import {
  createContext,
  useCallback,
  useMemo,
  useState,
} from "react"

/** Anchored children share their enclosing modal's dismissal boundary. */
type AnchoredOverlayScope = {
  topId: string | null
  register: (id: string) => void
  unregister: (id: string) => void
}
export const AnchoredOverlayScopeContext =
  createContext<AnchoredOverlayScope | null>(null)
export function useAnchoredOverlayScope(): AnchoredOverlayScope {
  const [ids, setIds] = useState<string[]>([])
  const register = useCallback(
    (id: string) =>
      setIds((previous) =>
        previous.includes(id)
          ? previous
          : [...previous, id],
      ),
    [],
  )
  const unregister = useCallback(
    (id: string) =>
      setIds((previous) =>
        previous.filter((value) => value !== id),
      ),
    [],
  )
  return useMemo(
    () => ({
      topId: ids.at(-1) ?? null,
      register,
      unregister,
    }),
    [ids, register, unregister],
  )
}
