import { useMediaQuery } from "@charcuterie/logic"
import { matchMediaMatcher } from "@charcuterie/logic/browser"
import type { ControlSize } from "@charcuterie/tokens"

/**
 * The requested row size, stepped down when the window is too short
 * to spend the height.
 *
 * A fat option row is a bigger click target, which is the whole point
 * of `itemSize` — but a nine-item menu at `lg` is 400px of panel, and
 * on a half-height window that is the difference between a menu you
 * read at a glance and a menu you scroll. So the size a panel asks
 * for is a *ceiling*: below 40rem of viewport height it drops one
 * step, and below 30rem it drops to the floor.
 *
 * ### Why a hook and not a media query in CSS
 *
 * Both were written. CSS is the library's usual answer — the density
 * axis rewrites `--control-height-*` and nothing re-renders — but it
 * cannot step *`text-sm` to `text-md`*: those are Tailwind bridges
 * onto `--font-size-*` rather than variables a media query can
 * reassign, and the alternative (`text-(length:--panel-item-font-size-lg)`
 * everywhere, over nine new tokens) is the indirection
 * `buildCss.ts` explicitly argues against. Stepping the whole
 * `ControlSize` in JS keeps one literal class string per size, which
 * is also what `tailwindCandidates.test.ts` can see.
 *
 * The re-render this costs happens on a window resize, not on a
 * scheme or density flip — those stay repaints.
 *
 * ### `height`, not `width`
 *
 * Rows stack down the panel, so height is the axis that runs out.
 * The Narrow View is a separate question and this is not it: a 390px
 * phone held upright has plenty of height, and its menu stays fat.
 */
const SHORT_VIEWPORT_QUERY = "(height <= 40rem)"

const VERY_SHORT_VIEWPORT_QUERY = "(height <= 30rem)"

const STEP_DOWN: Record<ControlSize, ControlSize> = {
  sm: "sm",
  md: "sm",
  lg: "md",
}

export const usePanelItemSize = (
  itemSize: ControlSize,
): ControlSize => {
  // Both hooks run unconditionally and the *narrower* one wins, so
  // the two queries never disagree about which step applies.
  const { isMatching: isShortViewport } = useMediaQuery({
    matcher: matchMediaMatcher(SHORT_VIEWPORT_QUERY),
  })

  const { isMatching: isVeryShortViewport } = useMediaQuery(
    {
      matcher: matchMediaMatcher(VERY_SHORT_VIEWPORT_QUERY),
    },
  )

  if (isVeryShortViewport) {
    return "sm"
  }

  if (isShortViewport) {
    return STEP_DOWN[itemSize]
  }

  return itemSize
}
