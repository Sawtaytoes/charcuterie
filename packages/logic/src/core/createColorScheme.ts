/**
 * Colour scheme — a three-mode preference that resolves to a
 * two-value scheme.
 *
 * Not one of the five state *kinds* (it registers nothing and has
 * no members), but it is a Charcuterie core in every other respect:
 * a plain factory over an injected store, framework-free, no DOM.
 *
 * The novelty here is a **second injected seam** beside the store —
 * the `resolver`. `mode` is the user's pick (`light | dark | system`);
 * `resolvedScheme` is what actually reaches `data-scheme`
 * (`light | dark`). When `mode` is `system` the concrete scheme comes
 * from the resolver, and the resolver is the whole point: the browser
 * default (`matchMedia`) lives in `@charcuterie/logic/browser`, and an
 * Electron app passes `nativeTheme` or a React-Native app passes
 * `Appearance` in its place — the core never imports any of them.
 *
 * `persistence` is the third injected seam: the picked `mode` is
 * written on every change so a reload restores it. Its default is
 * `undefined` (in-memory only); the browser subpath supplies a
 * `localStorage` one.
 *
 * `apply` — writing `data-scheme` onto an element — is deliberately
 * *not* here: it is a DOM side effect the React binding owns as an
 * effect, keeping this core pure and node-testable.
 */

import { createStore as createDefaultStore } from "./createStore.ts"
import type { ReadableCore, StoreOptions } from "./types.ts"

/** The two schemes `data-scheme` can hold — mirrors `@charcuterie/tokens`' `Scheme`. */
export type ResolvedColorScheme = "light" | "dark"

/**
 * What to do with the resolved scheme — the one DOM side effect the
 * React binding performs, and injected so it can be swapped. The
 * browser default writes `data-scheme` on `<html>`
 * (`@charcuterie/logic/browser`); a React-Native consumer sets a
 * context value instead and never touches the DOM.
 *
 * Defined here rather than beside the hook so the browser subpath
 * can name it without importing React through the hook module.
 */
export type ColorSchemeApplier = (
  resolvedScheme: ResolvedColorScheme,
) => void

/** The three-way user preference. `system` defers to the resolver. */
export type ColorSchemeMode = ResolvedColorScheme | "system"

export type ColorSchemeState = {
  mode: ColorSchemeMode
  resolvedScheme: ResolvedColorScheme
}

/**
 * The injected OS seam — shaped like `CharcuterieStore`, minimal on
 * purpose. `matchMedia`, Electron `nativeTheme`, and RN `Appearance`
 * all satisfy it. Read once at construction and on every `subscribe`
 * notification; `get` must be synchronous.
 */
export type ColorSchemeResolver = {
  get: () => ResolvedColorScheme
  subscribe: (listener: () => void) => () => void
}

/** The injected persistence seam. Default is in-memory (undefined). */
export type ColorSchemePersistence = {
  read: () => ColorSchemeMode | null
  write: (mode: ColorSchemeMode) => void
}

export type ColorSchemeOptions = StoreOptions & {
  /**
   * The cycle order for `cycle()` and the accessible "switch to
   * next" label. Default `light → dark → system → (light)`.
   */
  order?: readonly ColorSchemeMode[]
  /**
   * **Initial** mode, and the fallback used only when `persistence`
   * has nothing stored. Read once. A fresh app with no saved choice
   * starts on `system`.
   */
  mode?: ColorSchemeMode
  /**
   * Fires on a real change only — a `setMode`/`cycle`, or an OS flip
   * that changes `resolvedScheme` while in `system` mode. Never on a
   * no-op. A controlled consumer echoing this back down as a prop is
   * exactly the infinite loop `onChange` fires selectively to avoid.
   */
  onChange?: (state: ColorSchemeState) => void
  persistence?: ColorSchemePersistence
  resolver?: ColorSchemeResolver
}

export type ColorScheme = ReadableCore<ColorSchemeState> & {
  /** Advance `mode` by `order`; returns the new mode. */
  cycle: () => ColorSchemeMode
  setMode: (mode: ColorSchemeMode) => void
  /**
   * Begin listening to the resolver for OS changes. Returns the
   * unsubscribe. Called from the React binding's effect rather than
   * the constructor, so a discarded StrictMode core never leaks a
   * listener. Re-reads the resolver on start, so a flip between
   * construction and effect is reconciled.
   */
  start: () => () => void
}

export const DEFAULT_COLOR_SCHEME_ORDER = [
  "light",
  "dark",
  "system",
] as const satisfies readonly ColorSchemeMode[]

export const selectMode = (state: ColorSchemeState) =>
  state.mode

export const selectResolvedScheme = (
  state: ColorSchemeState,
) => state.resolvedScheme

/**
 * The next mode after `current`, wrapping. A `current` that is not
 * in `order` (or an empty `order`) yields the first entry, so the
 * control always advances rather than dead-ending.
 */
export const nextColorSchemeMode = (
  current: ColorSchemeMode,
  order: readonly ColorSchemeMode[] = DEFAULT_COLOR_SCHEME_ORDER,
): ColorSchemeMode => {
  if (order.length === 0) {
    return current
  }

  const index = order.indexOf(current)

  return order[
    (index + 1) % order.length
  ] as ColorSchemeMode
}

const resolveScheme = (
  mode: ColorSchemeMode,
  systemScheme: ResolvedColorScheme,
): ResolvedColorScheme =>
  mode === "system" ? systemScheme : mode

export const createColorScheme = ({
  createStore = createDefaultStore,
  mode: initialModeOption = "system",
  onChange,
  order = DEFAULT_COLOR_SCHEME_ORDER,
  persistence,
  resolver,
}: ColorSchemeOptions = {}): ColorScheme => {
  // The resolver's answer, held so `setMode` can re-resolve without
  // reading the seam again — a resolver `get()` may be a real DOM
  // query and this must stay a cheap synchronous recompute.
  let systemScheme: ResolvedColorScheme =
    resolver?.get() ?? "light"

  const initialMode =
    persistence?.read() ?? initialModeOption

  const store = createStore<ColorSchemeState>(
    Object.freeze({
      mode: initialMode,
      resolvedScheme: resolveScheme(
        initialMode,
        systemScheme,
      ),
    }),
  )

  const commit = (nextMode: ColorSchemeMode) => {
    store.set(
      Object.freeze({
        mode: nextMode,
        resolvedScheme: resolveScheme(
          nextMode,
          systemScheme,
        ),
      }),
    )
  }

  const setMode = (nextMode: ColorSchemeMode) => {
    if (nextMode === store.get().mode) {
      return
    }

    commit(nextMode)

    persistence?.write(nextMode)

    onChange?.(store.get())
  }

  return {
    cycle: () => {
      const nextMode = nextColorSchemeMode(
        store.get().mode,
        order,
      )

      setMode(nextMode)

      return nextMode
    },

    getState: store.get,

    setMode,

    start: () => {
      if (!resolver) {
        return () => {}
      }

      // Reconcile any flip since construction before subscribing.
      const currentSystemScheme = resolver.get()

      if (currentSystemScheme !== systemScheme) {
        systemScheme = currentSystemScheme

        if (store.get().mode === "system") {
          commit("system")

          onChange?.(store.get())
        }
      }

      return resolver.subscribe(() => {
        const nextSystemScheme = resolver.get()

        if (nextSystemScheme === systemScheme) {
          return
        }

        systemScheme = nextSystemScheme

        // A flip only matters while following the OS. In light/dark
        // the resolved scheme is pinned and this is a no-op.
        if (store.get().mode === "system") {
          commit("system")

          onChange?.(store.get())
        }
      })
    },

    subscribe: store.subscribe,
  }
}
