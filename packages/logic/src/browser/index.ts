/**
 * `@charcuterie/logic/browser` — the DOM defaults for the hooks
 * whose state the environment owns: `useColorScheme` and
 * `useMediaQuery`.
 *
 * An optional subpath, isolated exactly like `@charcuterie/logic/jotai`
 * and `@charcuterie/logic/signals`, and for the same reason: the main
 * entry must stay free of `matchMedia`, `localStorage`, and `document`
 * so Satori and React-Native never pull the DOM in. A browser app
 * imports these three factories (or uses `<ColorSchemeSwitcher>`, which
 * does); a non-browser consumer passes its own resolver instead —
 * Electron `nativeTheme`, RN `Appearance` — and never touches this file.
 *
 * Every factory guards `typeof window`, so importing this module in a
 * server render is safe: the seams degrade to inert rather than
 * throwing on a missing global.
 */

import type {
  ColorSchemeApplier,
  ColorSchemePersistence,
  ColorSchemeResolver,
  ResolvedColorScheme,
} from "../core/createColorScheme.ts"
import type { MediaQueryMatcher } from "../core/createMediaQuery.ts"

/**
 * The default `localStorage` key. Exported so the first-paint inline
 * script (`@charcuterie/tokens`' `buildFirstPaintScript`) and the
 * runtime hook can be pinned to the same string — they must agree, or
 * the pre-paint attribute and the hydrated state disagree by one flash.
 */
export const DEFAULT_COLOR_SCHEME_STORAGE_KEY =
  "charcuterie-scheme"

const isColorSchemeMode = (
  value: string | null,
): value is ResolvedColorScheme | "system" =>
  value === "light" ||
  value === "dark" ||
  value === "system"

/**
 * `matchMedia('(prefers-color-scheme: dark)')` as a resolver.
 *
 * `get` reads the query synchronously; `subscribe` attaches a
 * `change` listener and returns its remover. Off the browser (no
 * `window.matchMedia`) it degrades to a static `light` resolver, so
 * the same code path is safe under SSR.
 */
export const matchMediaResolver =
  (): ColorSchemeResolver => {
    const query =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null

    return {
      get: () => (query?.matches ? "dark" : "light"),
      subscribe: (listener) => {
        if (!query) {
          return () => {}
        }

        query.addEventListener("change", listener)

        return () => {
          query.removeEventListener("change", listener)
        }
      },
    }
  }

/**
 * `matchMedia(query)` as a `MediaQueryMatcher`.
 *
 * **One `MediaQueryList`, built once.** plex-channels' hook — the
 * pattern this generalises — calls `window.matchMedia(query)` inside
 * its `getSnapshot`, which `useSyncExternalStore` runs on every
 * render, and on every store notification besides. Same answer,
 * a fresh platform object each time.
 *
 * Off the browser (no `window.matchMedia`) it degrades to a static
 * `false`, so the same code path is safe under SSR — a `Toolbar`
 * server-renders whole and collapses on the client rather than the
 * other way round.
 */
export const matchMediaMatcher = (
  query: string,
): MediaQueryMatcher => {
  const mediaQueryList =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
      ? window.matchMedia(query)
      : null

  return {
    get: () => mediaQueryList?.matches ?? false,
    subscribe: (listener) => {
      if (!mediaQueryList) {
        return () => {}
      }

      mediaQueryList.addEventListener("change", listener)

      return () => {
        mediaQueryList.removeEventListener(
          "change",
          listener,
        )
      }
    },
  }
}

/**
 * Persist the picked mode in `localStorage`. Reads and writes are
 * wrapped: `localStorage` throws in a sandboxed iframe and in some
 * privacy modes, and a switcher that cannot persist should still
 * switch rather than crash.
 */
export const localStoragePersistence = (
  key: string = DEFAULT_COLOR_SCHEME_STORAGE_KEY,
): ColorSchemePersistence => ({
  read: () => {
    try {
      const stored = window.localStorage.getItem(key)

      return isColorSchemeMode(stored) ? stored : null
    } catch {
      return null
    }
  },
  write: (mode) => {
    try {
      window.localStorage.setItem(key, mode)
    } catch {
      // A page that cannot persist still switches for this session.
    }
  },
})

/**
 * Write the resolved scheme onto an element's `data-scheme` — the
 * attribute `@charcuterie/tokens`' `variables.css` keys every colour
 * off. Defaults to `<html>`, which is where the first-paint script
 * also writes, so the two agree. Pass an element to scope a switcher
 * to one subtree instead of the whole document.
 */
export const dataSchemeApplier = (
  target?: HTMLElement,
): ColorSchemeApplier => {
  const element =
    target ??
    (typeof document !== "undefined"
      ? document.documentElement
      : null)

  return (resolvedScheme) => {
    element?.setAttribute("data-scheme", resolvedScheme)
  }
}

/**
 * Drop the browser's own text selection.
 *
 * Shift-clicking inside a grid of text drags a native text
 * selection along with it — every card from the anchor to the
 * pointer goes grey-blue and stays that way, over the top of the
 * app's own selected state. A click handler's `preventDefault`
 * does not undo it, because the range was started by the
 * **mousedown** before React ever saw the click.
 *
 * Guarded on `window` like everything else in this module, so a
 * server render calls it and nothing happens.
 */
export const clearTextSelection = () => {
  const selection =
    typeof window === "undefined"
      ? null
      : window.getSelection()

  if (selection !== null && !selection.isCollapsed) {
    selection.removeAllRanges()
  }
}
