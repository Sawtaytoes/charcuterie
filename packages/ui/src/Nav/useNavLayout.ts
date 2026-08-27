import { useMediaQuery } from "@charcuterie/logic"
import { matchMediaMatcher } from "@charcuterie/logic/browser"
import { useState } from "react"

/**
 * What the reader asked for, which is not the same as what they get.
 *
 * `auto` lets the width decide. The other two are a deliberate
 * override and outrank the width — but only where a rail fits at
 * all; see `useNavLayout`.
 */
export type NavLayoutMode =
  | "auto"
  | "collapsed"
  | "expanded"

/** The three forms a rail-shaped nav actually takes on screen. */
export type ResolvedNavLayout =
  | "menu"
  | "rail"
  | "railIcons"

export type UseNavLayoutOptions = {
  /**
   * Below this width the rail drops its labels. Default `64rem`,
   * which is `screen.lg`.
   */
  iconsBelow?: string
  /**
   * Below this width there is no rail at all. Default `48rem`, which
   * is `screen.md` — and the same step `Rail` itself collapses at,
   * so the two cannot disagree.
   */
  menuBelow?: string
  /**
   * Where the manual choice is remembered. Omit and the override
   * lasts until the tab is closed.
   *
   * Name it for the app (`"queuepilot-nav"`), not for this library:
   * two apps on the same origin share `localStorage`, and this
   * fleet's dev servers all sit on `localhost`.
   */
  storageKey?: string
}

export type NavLayoutState = {
  /** `true` in `railIcons`. The rail's own collapse control reads it. */
  isCollapsed: boolean
  /** What to pass to `Nav`'s `layout`. */
  layout: ResolvedNavLayout
  mode: NavLayoutMode
  setMode: (mode: NavLayoutMode) => void
  /**
   * Expanded ⇄ collapsed. From `auto` it goes to whichever of the two
   * is **not** on screen now, so the first press always visibly does
   * something — which "toggle" has to mean or the control reads as
   * broken.
   */
  toggle: () => void
}

const DEFAULT_ICONS_BELOW = "64rem"

const DEFAULT_MENU_BELOW = "48rem"

const isNavLayoutMode = (
  value: string | null,
): value is NavLayoutMode =>
  value === "auto" ||
  value === "collapsed" ||
  value === "expanded"

/**
 * `localStorage`, wrapped both ways.
 *
 * It throws in a sandboxed iframe and in some privacy modes, and it
 * does not exist at all while a page renders on a server — a rail
 * that cannot remember its width should still have one.
 *
 * `@charcuterie/logic/browser`'s `localStoragePersistence` is the
 * same shape and is deliberately **not** reused: it validates what
 * it reads with `isColorSchemeMode`, so it answers `null` for every
 * value this hook stores.
 */
const readStoredMode = (
  key: string,
): NavLayoutMode | null => {
  try {
    const stored = window.localStorage.getItem(key)

    return isNavLayoutMode(stored) ? stored : null
  } catch {
    return null
  }
}

const writeStoredMode = (
  key: string,
  mode: NavLayoutMode,
) => {
  try {
    window.localStorage.setItem(key, mode)
  } catch {
    // A page that cannot persist still switches for this session.
  }
}

/**
 * The width rule for a rail-shaped navigation, written once.
 *
 * Three states, and the app chooses none of them:
 *
 * | Width | Layout | What the app renders |
 * | --- | --- | --- |
 * | `>= iconsBelow` | `rail` | a `Rail` holding a `Nav` |
 * | `>= menuBelow` | `railIcons` | the same `Rail`, narrower |
 * | below that | `menu` | a trigger in the `Header` |
 *
 * ### Why the app still places it
 *
 * Because the placement genuinely differs and the rule does not. The
 * `menu` state puts a control in the header — a different corner of
 * the page from a side rail — and no amount of restyling moves an
 * element across `Shell`'s grid. So the library owns *which* state
 * is right, at what width, with what override and where the override
 * is remembered; the app owns two `if`s. That is the half that was
 * being rewritten per app, and rewritten differently: Docket's nav
 * wraps to three lines on a phone, mail-sifter collapses at `40rem`,
 * and QueuePilot at `760px`, all of them arrived at alone.
 *
 * ### The override does not reach the narrow state
 *
 * `expanded` on a 390px screen would be a 212px rail beside 178px of
 * content. The width wins there, and the remembered choice is *kept*
 * rather than cleared — rotating a tablet back to landscape restores
 * the rail the reader asked for, instead of silently forgetting it.
 *
 * ### It is a hook, not CSS
 *
 * The same reason `usePanelItemSize` is: a media query can restyle a
 * rail, but it cannot move a control into the header, and it cannot
 * tell the trigger whether to render at all. A resize re-renders;
 * a scheme or density change still does not.
 */
export const useNavLayout = ({
  iconsBelow = DEFAULT_ICONS_BELOW,
  menuBelow = DEFAULT_MENU_BELOW,
  storageKey,
}: UseNavLayoutOptions = {}): NavLayoutState => {
  // Read once, lazily — a `useState` initialiser, so the stored
  // choice is in place for the first paint and the rail does not
  // open wide and then snap shut.
  const [mode, setStoredMode] = useState<NavLayoutMode>(
    () =>
      (storageKey === undefined
        ? null
        : readStoredMode(storageKey)) ?? "auto",
  )

  const { isMatching: isBelowMenu } = useMediaQuery({
    matcher: matchMediaMatcher(`(width < ${menuBelow})`),
  })

  const { isMatching: isBelowIcons } = useMediaQuery({
    matcher: matchMediaMatcher(`(width < ${iconsBelow})`),
  })

  const setMode = (nextMode: NavLayoutMode) => {
    setStoredMode(nextMode)

    if (storageKey !== undefined) {
      writeStoredMode(storageKey, nextMode)
    }
  }

  const autoLayout: ResolvedNavLayout = isBelowIcons
    ? "railIcons"
    : "rail"

  const layout: ResolvedNavLayout = isBelowMenu
    ? "menu"
    : mode === "auto"
      ? autoLayout
      : mode === "collapsed"
        ? "railIcons"
        : "rail"

  return {
    isCollapsed: layout === "railIcons",
    layout,
    mode,
    setMode,
    toggle: () => {
      setMode(layout === "rail" ? "collapsed" : "expanded")
    },
  }
}
