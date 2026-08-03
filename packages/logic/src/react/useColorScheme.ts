import { useEffect, useState } from "react"

import type {
  ColorSchemeOptions,
  ColorSchemeState,
  ResolvedColorScheme,
} from "../core/createColorScheme.ts"
import { createColorScheme } from "../core/createColorScheme.ts"
import { useLatestRef } from "./useLatestRef.ts"
import { useStoreValue } from "./useStoreValue.ts"

/**
 * What to do with the resolved scheme — the one DOM side effect
 * this hook performs, and injected for the same reason the resolver
 * is: the browser default writes `data-scheme` on `<html>`
 * (`@charcuterie/logic/browser`), but a React-Native consumer sets
 * a context value instead and never imports the DOM.
 */
export type ColorSchemeApplier = (
  resolvedScheme: ResolvedColorScheme,
) => void

export type UseColorSchemeOptions = ColorSchemeOptions & {
  apply?: ColorSchemeApplier
}

/**
 * Colour scheme as a React hook — a thin binding over the pure
 * `createColorScheme` core, exactly like `useVisibility` over
 * `createVisibility`.
 *
 * ### Uncontrolled, on purpose
 *
 * `mode` is an **initial** value, read once, never a controlled
 * prop; `resolver`, `persistence`, and `apply` are read once too.
 * A parent that needs to push a value calls `setMode`; one that
 * needs to observe passes `onChange`, which fires on real changes
 * only. Same thesis as every hook here: Charcuterie owns the state.
 *
 * ### No browser import in this entry
 *
 * This file imports React and the core — nothing else. It never
 * reaches for `matchMedia`, `localStorage`, or `document`, so
 * `@charcuterie/logic`'s main entry stays DOM-free for Satori and
 * React-Native. The browser defaults live behind
 * `@charcuterie/logic/browser`; pass them in (or use
 * `<ColorSchemeSwitcher>`, which does). With nothing injected the
 * hook is inert-but-valid: `system` resolves to `light` and nothing
 * is persisted or applied.
 */
export const useColorScheme = ({
  apply,
  onChange,
  ...coreOptions
}: UseColorSchemeOptions = {}) => {
  const onChangeRef = useLatestRef(onChange)

  const applyRef = useLatestRef(apply)

  // Lazy `useState` rather than `useRef`: the initialiser runs
  // exactly once even under StrictMode's double render, so the core
  // — and its resolver read — is never built and thrown away.
  const [core] = useState(() =>
    createColorScheme({
      ...coreOptions,
      onChange: (state: ColorSchemeState) => {
        onChangeRef.current?.(state)
      },
    }),
  )

  const { mode, resolvedScheme } = useStoreValue(core)

  // Subscribe to OS changes here, in an effect, so a discarded
  // StrictMode core never leaks a resolver listener. `start()`
  // reconciles any flip since construction and returns the
  // unsubscribe for cleanup.
  useEffect(() => core.start(), [core])

  // Apply after commit, and on every resolved-scheme change —
  // including the first paint. Read through a ref so a fresh
  // `apply` identity each render does not re-run the effect.
  useEffect(() => {
    applyRef.current?.(resolvedScheme)
  }, [applyRef, resolvedScheme])

  return {
    cycle: core.cycle,
    mode,
    resolvedScheme,
    setMode: core.setMode,
  }
}
