import type { RefObject } from "react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

import type { ColumnChoice } from "./chooseColumns.ts"
import {
  chooseColumns,
  DEFAULT_MAX_AUTO_COLUMNS,
  DEFAULT_MAX_MANUAL_COLUMNS,
  DEFAULT_MIN_COLUMN_INLINE_SIZE_PX,
  getContentMaxInlineSize,
} from "./chooseColumns.ts"

/**
 * The height-first column rule, wired to a real element.
 *
 * `chooseColumns` is the decision; this is the measuring. The split
 * is the point — the rule is a table of numbers anyone can check in
 * Node, and everything that needs a browser is quarantined here
 * behind seams.
 *
 * ## What it measures, and from where
 *
 * Two different sources, on purpose:
 *
 *  - **Inline size comes from a container**, observed with a
 *    `ResizeObserver`. A grid sitting beside a rail has less room
 *    than `window.innerWidth` claims, and this library is built
 *    around the case where the component's container is what
 *    changed and the window never moved. The source app read
 *    `window.innerWidth` with a bare `resize` listener; that is the
 *    one part of the port that is not a lift.
 *  - **Block size comes from the viewport**, behind an injected
 *    resolver. It has to: the question is "will this scroll", and a
 *    grid in normal flow is exactly as tall as its contents, so
 *    measuring the element always answers "it fits."
 *
 * ⚠️ **The observed element must not itself be capped by the
 * answer.** `contentMaxInlineSize` narrows the content when the
 * count is low; if the ref sits on the element that cap is applied
 * to, the fold eats its own output and can never widen again — one
 * column forever, with no error anywhere. `AdaptiveGrid` prevents
 * this structurally by measuring an uncapped outer box and capping
 * an inner one, and a caller wiring the hook by hand owes itself
 * the same shape.
 *
 * ## Composing with a shell
 *
 * `contentMaxInlineSize` is a CSS length meant to be handed
 * straight to a shell's main region as its max inline size, so the
 * page chrome and the grid widen together rather than the grid
 * rattling around inside a fixed column.
 */

/**
 * Where the available block size comes from, and how to hear about
 * it changing. The shape `useSyncExternalStore` wants, and the same
 * `get`/`subscribe` seam `useColorScheme` takes its resolver in.
 *
 * Injected rather than hardcoded for the reason every seam in this
 * library is: an Electron window, a fixed-height kiosk panel, and a
 * test all have a block size, and none of them is
 * `window.innerHeight`.
 */
export type BlockSizeResolver = {
  get: () => number
  subscribe: (listener: () => void) => () => void
}

/**
 * Where a manual choice is remembered between visits.
 *
 * Deliberately not a storage *key* on its own: the source app
 * hardcoded `"rip-deck.layout-columns"`, which is exactly the kind
 * of app-namespaced string a shared library must never invent for
 * its consumers.
 */
export type ColumnPersistence = {
  read: () => string | null
  write: (value: string) => void
}

/**
 * `window.innerHeight`, as a resolver.
 *
 * Guards `typeof window`, so importing this in a server render is
 * safe: it degrades to an inert zero rather than throwing on a
 * missing global. A zero block size resolves to one column, which
 * is the right thing to send down the wire — it is the layout that
 * is correct everywhere, and it widens on the client.
 */
export const viewportBlockSizeResolver =
  (): BlockSizeResolver => ({
    get: () =>
      typeof window === "undefined"
        ? 0
        : window.innerHeight,
    subscribe: (listener) => {
      if (typeof window === "undefined") {
        return () => {}
      }

      window.addEventListener("resize", listener)

      return () => {
        window.removeEventListener("resize", listener)
      }
    },
  })

/**
 * `localStorage` under a caller-supplied key.
 *
 * Reads and writes are wrapped: `localStorage` throws in a
 * sandboxed iframe and in some privacy modes, and a grid that
 * cannot remember a choice should still honour the one just made.
 */
export const localStorageColumnPersistence = (
  key: string,
): ColumnPersistence => ({
  read: () => {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  write: (value) => {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Private-mode Safari and friends. Nothing to do.
    }
  },
})

/**
 * A stored choice, or `"auto"` for anything unreadable.
 *
 * Every failure lands on `"auto"` on purpose: a corrupt key, a
 * browser that refuses storage, a number somebody typed into
 * devtools. The default is the mode that works everywhere, so a bad
 * value costs a preference rather than a page.
 */
export const readStoredChoice = ({
  maxColumns = DEFAULT_MAX_MANUAL_COLUMNS,
  persistence,
}: {
  maxColumns?: number
  persistence: ColumnPersistence | undefined
}): ColumnChoice => {
  const stored = persistence?.read() ?? null

  if (stored === null || stored === "auto") {
    return "auto"
  }

  const parsed = Number(stored)

  if (!Number.isInteger(parsed)) {
    return "auto"
  }

  if (parsed < 1 || parsed > maxColumns) {
    return "auto"
  }

  return parsed
}

export const useAdaptiveColumns = <
  ContainerElement extends HTMLElement = HTMLDivElement,
>({
  blockSizeResolver,
  chromeBlockSize,
  columnInlineSize,
  gutterInlineSize,
  itemBlockSize,
  itemCount,
  maxAutoColumns = DEFAULT_MAX_AUTO_COLUMNS,
  maxManualColumns = DEFAULT_MAX_MANUAL_COLUMNS,
  minColumnInlineSize = DEFAULT_MIN_COLUMN_INLINE_SIZE_PX,
  persistence,
  singleInlineSize,
  storageKey,
}: {
  /** @see BlockSizeResolver. Defaults to the viewport. */
  blockSizeResolver?: BlockSizeResolver
  /** Everything down the page that is not this grid, in CSS px. */
  chromeBlockSize?: number
  /** Override `contentInlineSize.column`. */
  columnInlineSize?: string
  /** Override `contentInlineSize.gutter`. */
  gutterInlineSize?: string
  /** One item's block size in CSS px. Measure it; err high. */
  itemBlockSize: number
  /** How many items the grid is being asked to fit. */
  itemCount: number
  /** The most columns the automatic answer will take. */
  maxAutoColumns?: number
  /** The most a person may ask for. One above the auto cap. */
  maxManualColumns?: number
  /** The narrowest a column may be, in CSS px. */
  minColumnInlineSize?: number
  /**
   * Where a manual choice is remembered. Defaults to
   * `localStorage` when `storageKey` is given, and to nothing at
   * all when it is not — a grid with no key keeps a choice for the
   * session and writes nowhere.
   */
  persistence?: ColumnPersistence
  /** Override `contentInlineSize.single`. */
  singleInlineSize?: string
  /**
   * The `localStorage` key a manual choice is remembered under.
   *
   * **Caller-supplied and namespaced by the app** — one origin
   * often serves several things that would each like a `columns`
   * key, and a shared library has no business picking that name.
   */
  storageKey?: string
}): {
  /** What the automatic rule wants right now. */
  autoColumns: number
  /** What to draw. */
  columns: number
  /**
   * The cap for the content around the grid, as a CSS length. Hand
   * it to a shell's main region.
   */
  contentMaxInlineSize: string
  /**
   * Attach to the element whose inline size the grid may spend.
   *
   * ⚠️ Never the element `contentMaxInlineSize` is applied to.
   */
  containerRef: RefObject<ContainerElement | null>
  /** What was picked, `"auto"` included. */
  choice: ColumnChoice
  setChoice: (choice: ColumnChoice) => void
} => {
  const containerRef = useRef<ContainerElement>(null)

  // Built once, so the `resize` subscription and the storage
  // handle survive re-renders and StrictMode's double mount — the
  // same lazy-`useState` seam construction `ColorSchemeSwitcher`
  // uses.
  const [seams] = useState(() => ({
    blockSize:
      blockSizeResolver ?? viewportBlockSizeResolver(),
    persistence:
      persistence ??
      (storageKey === undefined
        ? undefined
        : localStorageColumnPersistence(storageKey)),
  }))

  const availableBlockSize = useSyncExternalStore(
    seams.blockSize.subscribe,
    seams.blockSize.get,
    // Server-side there is no window and no scrolling to predict.
    () => 0,
  )

  /**
   * Zero until the container has been measured, which resolves to
   * one column.
   *
   * The safe direction to be wrong in for one frame: starting
   * narrow and widening moves content down the page, where
   * starting wide and narrowing snatches it sideways. In practice
   * `ResizeObserver` delivers its first record before paint, so
   * there is usually nothing to see.
   */
  const [availableInlineSize, setAvailableInlineSize] =
    useState(0)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      const next =
        entry?.contentRect.width ??
        container.getBoundingClientRect().width

      // Same size, same state — a drag fires this many times a
      // second and every one of them would otherwise re-render
      // every item in the grid.
      setAvailableInlineSize((current) =>
        current === next ? current : next,
      )
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  const [choice, setStoredChoice] = useState<ColumnChoice>(
    () =>
      readStoredChoice({
        maxColumns: maxManualColumns,
        persistence: seams.persistence,
      }),
  )

  const setChoice = useCallback(
    (next: ColumnChoice) => {
      setStoredChoice(next)

      // A storage failure must not swallow the click. The
      // preference is a nicety; the column count just asked for is
      // not.
      seams.persistence?.write(String(next))
    },
    [seams],
  )

  const autoColumns = chooseColumns({
    availableBlockSize,
    availableInlineSize,
    chromeBlockSize,
    itemBlockSize,
    itemCount,
    maxColumns: maxAutoColumns,
    minColumnInlineSize,
  })

  const columns = choice === "auto" ? autoColumns : choice

  return {
    autoColumns,
    choice,
    columns,
    containerRef,
    contentMaxInlineSize: getContentMaxInlineSize({
      columnInlineSize,
      columns,
      gutterInlineSize,
      singleInlineSize,
    }),
    setChoice,
  }
}
