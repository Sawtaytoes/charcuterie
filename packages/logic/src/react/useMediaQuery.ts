import { useEffect, useState } from "react"

import type { MediaQueryOptions } from "../core/createMediaQuery.ts"
import { createMediaQuery } from "../core/createMediaQuery.ts"
import { useLatestRef } from "./useLatestRef.ts"
import { useStoreValue } from "./useStoreValue.ts"

/**
 * A media query as a React hook — a thin binding over the pure
 * `createMediaQuery` core, exactly like `useColorScheme` over
 * `createColorScheme`.
 *
 * ### Read-only, on purpose
 *
 * There is no setter and there will not be one. Every other hook
 * here is uncontrolled because *Charcuterie* owns the state; this
 * one returns a bare `isMatching` because the **environment** owns
 * it, and a `setIsMatching` would be a lie the next resize erases.
 *
 * ### No browser import in this entry
 *
 * This file imports React and the core — nothing else. The
 * `matchMedia` default lives behind `@charcuterie/logic/browser`
 * (`matchMediaMatcher`); pass it in, or use `<Toolbar>`, which does.
 * With nothing injected the hook is inert-but-valid: it answers the
 * `isMatching` option forever, which is the right thing to send
 * down the wire from a server render.
 *
 * ```tsx
 * const { isMatching: isNarrow } = useMediaQuery({
 *   matcher: matchMediaMatcher("(width < 40rem)"),
 * })
 * ```
 */
export const useMediaQuery = ({
  isMatching: isInitiallyMatching = false,
  onChange,
  ...coreOptions
}: MediaQueryOptions = {}) => {
  const onChangeRef = useLatestRef(onChange)

  // Lazy `useState` rather than `useRef`: the initialiser runs
  // exactly once even under StrictMode's double render, so the core
  // — and its `matchMedia` read — is never built and thrown away.
  const [core] = useState(() =>
    createMediaQuery({
      ...coreOptions,
      isMatching: isInitiallyMatching,
      onChange: (isNextMatching) => {
        onChangeRef.current?.(isNextMatching)
      },
    }),
  )

  const { isMatching } = useStoreValue(core)

  // Subscribe in an effect, so a discarded StrictMode core never
  // leaks a `change` listener. `start()` reconciles a resize that
  // happened since construction and returns the unsubscribe.
  useEffect(() => core.start(), [core])

  return { isMatching }
}
