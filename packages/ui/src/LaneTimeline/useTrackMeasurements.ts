import type { RefObject } from "react"
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

/**
 * The track's width, and the font size it is drawn in.
 *
 * ## Measured, because no breakpoint can answer this
 *
 * `Nav` folds its bar on a measured width and
 * `useToolbarOverflow.ts` writes down the general form of the
 * argument: mux-magic collapses at a hardcoded `480px`, plex-channels
 * at `760px`, and neither number has a reason. A timeline has the
 * same problem one level worse, because the question is not "how
 * wide is the box" but **"how wide is one day"** — and that is the
 * width divided by a number that lives in the data. Thirty columns
 * in 900px is a readable month; three hundred and sixty five columns
 * in the same 900px is a grey smear. A media query sees the first
 * number and a container query sees the first number, so neither can
 * decide this.
 *
 * ## Why the font size comes back too
 *
 * The minimum readable column is a multiple of the **type**, not a
 * count of pixels. Every length in this token set moves with the
 * density axis — `--font-size-md` is one thing on a desktop and
 * another on the kiosk — so a column floor pinned at 20px is
 * generous at one density and clips a two-digit date at the next.
 * `Avatar` makes the same argument about a chip that stays 20px
 * while the prose around it scales, and it is the same mistake.
 *
 * ⚠️ **The measured element must not be sized by its own contents.**
 * The timeline reads its own box to decide what to draw in it, so a
 * shrink-wrapping parent makes the answer its own input: fewer
 * columns, narrower box, fewer columns. `LaneTimeline`'s root
 * declares `container-type: inline-size`, which forbids exactly that
 * — the same reason `Main` declares one — so the loop cannot form
 * even when a caller drops the component into a `inline-flex` cell.
 *
 * ## The first paint
 *
 * `useLayoutEffect`, so the measurement lands **before the browser
 * paints** and a timeline that has to fall back to the Narrow View
 * never flashes an unreadable axis first. Same reasoning as
 * `useToolbarOverflow`; the failure it prevents was visible on a
 * kiosk Pi, where a slow first frame is on screen long enough to
 * read.
 *
 * ## ⚠️ `trackRef` goes on a PROBE, never on the real track
 *
 * The one-way trap, and it is not hypothetical — the first draft
 * had it. Attach this to the axis track itself and the Narrow View
 * unmounts the element being measured, so the width never updates
 * again and the timeline can never come back when the window
 * widens. Hiding the track with `display: none` instead is worse: a
 * hidden box measures 0, 0 reads as *unmeasured*, unmeasured shows
 * the axis, the axis hides the fallback, and the component
 * oscillates every frame.
 *
 * So the ref belongs to a zero-height `aria-hidden` cell that sits
 * in the **same grid track** the axis would occupy and is rendered
 * in both layouts. It answers the question actually being asked —
 * *how wide would a day column be if I drew one* — in the layout
 * where no day column exists.
 */
export const useTrackMeasurements = (): {
  fontSize: number
  inlineSize: number
  isMeasured: boolean
  trackRef: RefObject<HTMLDivElement | null>
} => {
  const trackRef = useRef<HTMLDivElement>(null)

  const [measurements, setMeasurements] = useState({
    fontSize: 0,
    inlineSize: 0,
    /**
     * Its own flag rather than `inlineSize > 0`, and the reason is
     * written out on `getIsAxisReadable`: **zero is a real width
     * here.** The track is a `minmax(0, 1fr)` column beside a fixed
     * label rail, so any container narrower than the rail resolves
     * it to exactly 0px — and reading that as "not measured yet"
     * puts a thirty-column axis into a phone and calls it readable.
     */
    isMeasured: false,
  })

  const measure = useCallback(() => {
    const track = trackRef.current

    if (!track) {
      return
    }

    const style = getComputedStyle(track)

    const next = {
      fontSize: Number.parseFloat(style.fontSize) || 0,
      inlineSize: track.clientWidth,
      isMeasured: true,
    }

    setMeasurements((current) =>
      current.fontSize === next.fontSize &&
      current.inlineSize === next.inlineSize &&
      current.isMeasured
        ? current
        : next,
    )
  }, [])

  useLayoutEffect(measure)

  useLayoutEffect(() => {
    const track = trackRef.current

    if (!track) {
      return
    }

    /**
     * Only when the **box** changed.
     *
     * A `ResizeObserver` delivers a record on observe and again for
     * every reflow inside the frame it fired in, and measuring from
     * each one is what raises chromium's "ResizeObserver loop
     * completed with undelivered notifications". The same guard
     * `useToolbarOverflow` carries, for the same reason: this
     * callback's own `setState` can reflow the element it is
     * watching.
     */
    let lastInlineSize = -1

    const observer = new ResizeObserver(([entry]) => {
      const inlineSize =
        entry?.contentRect.width ??
        track.getBoundingClientRect().width

      if (inlineSize === lastInlineSize) {
        return
      }

      lastInlineSize = inlineSize

      measure()
    })

    observer.observe(track)

    return () => {
      observer.disconnect()
    }
  }, [measure])

  return {
    fontSize: measurements.fontSize,
    inlineSize: measurements.inlineSize,
    isMeasured: measurements.isMeasured,
    trackRef,
  }
}
