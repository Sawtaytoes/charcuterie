import { useUniqueId } from "@charcuterie/logic"
import type { IntentName } from "@charcuterie/tokens"
import type {
  ComponentPropsWithRef,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
} from "react"
import { useRef, useState } from "react"

import {
  FOCUS_RING_CLASS,
  INTENT_SOLID_FILL_CLASS,
} from "../intentStyles.ts"
import type { SliderSize } from "../sliderStyles.ts"
import {
  SLIDER_ROW_CLASS,
  SLIDER_THUMB_CLASS,
  SLIDER_THUMB_OFFSET,
  SLIDER_THUMB_SIZE_CLASS,
  SLIDER_TRACK_CLASS,
  SLIDER_TRACK_SIZE_CLASS,
} from "../sliderStyles.ts"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"
import {
  clampToRange,
  fromFraction,
  snapToStep,
  toPercent,
} from "./sliderValue.ts"

/**
 * Re-exported rather than declared here: the three sizes are the bar's,
 * and `RangeSlider` paints the same bar from `../sliderStyles.ts`.
 */
export type { SliderSize }

export type SliderProps = Omit<
  ComponentPropsWithRef<"div">,
  "children" | "defaultValue" | "onChange"
> & {
  intent?: IntentName
  isDisabled?: boolean
  isLabelVisible?: boolean
  /**
   * Read-only in the `aria-readonly` sense: focusable, full contrast,
   * announced as unchangeable. A media scrubber for a stream with no
   * seekable range is this, not `isDisabled` — the position is still
   * worth reading.
   */
  isReadOnly?: boolean
  isValueShown?: boolean
  /** Required. A slider with no name is an unlabelled number. */
  label: string
  /**
   * PageUp / PageDown. Defaults to ten steps, which is the APG's
   * suggestion and the only sensible answer that does not need the
   * caller to know the range.
   */
  largeStep?: number
  max?: number
  min?: number
  /**
   * Fires on every movement — each arrow key, and each pointer sample
   * while dragging. Use it to paint. See `onChangeEnd` for committing.
   */
  onChange?: (value: number) => void
  /**
   * Fires once, when the interaction ends: pointer release, or key up.
   *
   * This exists because the expensive consumer of a slider is almost
   * never the paint. A seek scrubber that issued its network call from
   * `onChange` would send one request per pointer sample and arrive at
   * the right offset last, after a queue of stale ones.
   */
  onChangeEnd?: (value: number) => void
  size?: SliderSize
  step?: number
  value?: number
  /**
   * How the value reads aloud and, when `isValueShown`, on screen.
   * Without it a scrubber announces "1274", which is a number of
   * seconds nobody has.
   */
  valueFormat?: (value: number) => string
}

/**
 * A single-value range control: the thing `<input type="range">` is,
 * without the OS painting it.
 *
 * The fleet had no way to ask for a value along a range, so QueuePilot's
 * Now-playing bar could not have a scrubber
 * ([decision](../../../../docs/decisions/2026-08-22-the-slider-is-a-div-with-role-slider-not-an-input-range.md)).
 * `ProgressBar` looks like the answer and is not: it is output, it takes
 * no input, and `role="progressbar"` tells assistive technology exactly
 * that.
 *
 * ## Why a `div` and not `<input type="range">`
 *
 * The same reason `Select` is deprecated. A range input's thumb and
 * track are UA pseudo-elements — `::-webkit-slider-thumb`,
 * `::-moz-range-track` — and they are not one surface: the two engines
 * disagree about which of them the track's fill even belongs to, so a
 * token-styled range is two stylesheets that drift. Windows paints its
 * own. `role="slider"` on a focusable `div` is the APG's own pattern,
 * gets the same AT support, and every pixel of it is ours.
 *
 * ## Drag does not commit
 *
 * `onChange` fires per movement, `onChangeEnd` once on release. Both are
 * optional and the component is fully controlled through `value`, so a
 * caller that wants the simple thing passes `onChange` alone and a
 * caller with a network call behind it splits them.
 *
 * While dragging, the component holds the value locally and paints from
 * that rather than from the `value` prop. Without it a controlled
 * scrubber whose owner only commits `onChangeEnd` would render the thumb
 * pinned under the finger at the old position — the drag would look
 * broken while behaving correctly.
 */
export const Slider = ({
  className,
  intent = "accent",
  isDisabled = false,
  isLabelVisible = false,
  isReadOnly = false,
  isValueShown = false,
  label,
  largeStep,
  max = 100,
  min = 0,
  onChange,
  onChangeEnd,
  size = "md",
  step = 1,
  value = 0,
  valueFormat,
  ...divProps
}: SliderProps): ReactNode => {
  const labelId = useUniqueId()

  const trackRef = useRef<HTMLDivElement>(null)

  // Null means "not dragging" — distinct from a drag that happens to
  // sit at 0, which a bare number could not express.
  const [draggedValue, setDraggedValue] = useState<
    number | null
  >(null)

  const isInert = isDisabled || isReadOnly

  const committed = snapToStep(value, min, max, step)

  const shown = draggedValue ?? committed

  const percent = toPercent(shown, min, max)

  const bigStep =
    largeStep == null
      ? (Math.max(min, max) - Math.min(min, max)) / 10
      : largeStep

  const emit = (next: number, isEnd: boolean): void => {
    if (next !== shown) onChange?.(next)

    if (isEnd) {
      setDraggedValue(null)

      onChangeEnd?.(next)

      return
    }

    setDraggedValue(next)
  }

  /** The value the pointer at `clientX` is pointing at. */
  const valueAt = (clientX: number): number => {
    const track = trackRef.current

    if (!track) return shown

    const box = track.getBoundingClientRect()

    if (box.width <= 0) return shown

    // `left`/`right` here are physical, from the layout box, and stay
    // physical on purpose — `isRtl` is what turns them into a value.
    // The logical-properties rule is about `className`, not geometry.
    const fraction = (clientX - box.left) / box.width

    const isRtl =
      getComputedStyle(track).direction === "rtl"

    return fromFraction(fraction, min, max, step, isRtl)
  }

  const onPointerDown = (
    event: PointerEvent<HTMLDivElement>,
  ): void => {
    if (isInert || event.button !== 0) return

    // Capture on the TRACK, so a drag that leaves the element vertically
    // (a thumb dragged off the bar, which is most of them) keeps
    // reporting instead of stopping dead at the boundary.
    event.currentTarget.setPointerCapture(event.pointerId)

    event.currentTarget.focus()

    emit(valueAt(event.clientX), false)
  }

  const onPointerMove = (
    event: PointerEvent<HTMLDivElement>,
  ): void => {
    if (isInert || draggedValue == null) return

    emit(valueAt(event.clientX), false)
  }

  const onPointerUp = (
    event: PointerEvent<HTMLDivElement>,
  ): void => {
    if (isInert || draggedValue == null) return

    event.currentTarget.releasePointerCapture(
      event.pointerId,
    )

    emit(valueAt(event.clientX), true)
  }

  const onKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ): void => {
    if (isInert) return

    // Home/End are absolute; the rest are relative. `null` means the key
    // is not ours and the event goes on its way — scrolling with the
    // arrows off a focused slider is not something to swallow silently,
    // but a slider that ignores its own arrow keys is worse.
    const next = ((): number | null => {
      switch (event.key) {
        case "ArrowDown":
        case "ArrowLeft":
          return shown - step
        case "ArrowRight":
        case "ArrowUp":
          return shown + step
        case "End":
          return Math.max(min, max)
        case "Home":
          return Math.min(min, max)
        case "PageDown":
          return shown - bigStep
        case "PageUp":
          return shown + bigStep
        default:
          return null
      }
    })()

    if (next == null) return

    event.preventDefault()

    // Keys commit immediately. A key press is a discrete interaction —
    // there is no release to wait for the way a drag has one, and an
    // arrow key that only committed on `keyup` would feel lagged.
    emit(snapToStep(next, min, max, step), true)
  }

  const valueText = valueFormat?.(
    clampToRange(shown, min, max),
  )

  return (
    <div
      {...divProps}
      className={toClassName(
        "flex flex-col gap-1",
        // A definite floor, because the root has no intrinsic width of
        // its own: the track is `w-full` and the label is the only
        // content, so a slider with no visible label in a shrink-to-fit
        // parent (`items-start`, an inline-flex row) collapses to the
        // width of the thumb. Every gate passed on exactly that —
        // `role`, ARIA, keyboard and axe are all correct on a control
        // 16px wide. `<input type="range">` has an intrinsic default
        // width for the same reason; this is ours.
        "min-w-40",
        className,
      )}
    >
      {isLabelVisible || isValueShown ? (
        <div className="flex items-baseline justify-between gap-2 text-sm">
          {isLabelVisible ? (
            <span
              className="text-content-secondary"
              id={labelId}
            >
              {label}
            </span>
          ) : (
            <VisuallyHidden id={labelId}>
              {label}
            </VisuallyHidden>
          )}

          {isValueShown ? (
            <span className="text-content-muted tabular-nums">
              {valueText ?? shown}
            </span>
          ) : null}
        </div>
      ) : (
        <VisuallyHidden id={labelId}>
          {label}
        </VisuallyHidden>
      )}

      {/* The role, the tab stop and the pointer target are all the
          track. Putting them on the thumb — which is what a hand-rolled
          slider usually does, because the thumb is the thing that looks
          draggable — gives the widget a 16px box, so a click on the bar
          does nothing and a Playwright bounding box is the handle. */}
      <div
        aria-disabled={isDisabled || undefined}
        aria-labelledby={labelId}
        aria-orientation="horizontal"
        aria-readonly={isReadOnly || undefined}
        aria-valuemax={Math.max(min, max)}
        aria-valuemin={Math.min(min, max)}
        aria-valuenow={shown}
        aria-valuetext={valueText}
        className={toClassName(
          // The bar, shared with `RangeSlider` through
          // `../sliderStyles.ts` — including the hit area being the
          // row rather than the 2px track.
          SLIDER_ROW_CLASS,
          FOCUS_RING_CLASS,
          // NOT `ARIA_DISABLED_CLASS`. That constant paints a
          // box-shaped control — `bg-surface-sunken` plus a border —
          // which is right for `ButtonLink` and wrong here: a slider's
          // visible body is a 2px track inside a 40px hit row, so the
          // sunken fill lands on the whole row and draws a grey
          // rectangle nothing else in the component has. Every gate
          // passed on it; the screenshot is what showed it.
          //
          // `pointer-events-none` is the half that carries over, and it
          // is load-bearing rather than cosmetic: without a real
          // `:disabled` the hover rules still match.
          isDisabled
            ? "pointer-events-none opacity-55"
            : "",
          isReadOnly ? "cursor-default" : "",
        )}
        onKeyDown={onKeyDown}
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={trackRef}
        role="slider"
        tabIndex={isDisabled ? -1 : 0}
      >
        <span
          className={toClassName(
            SLIDER_TRACK_CLASS,
            SLIDER_TRACK_SIZE_CLASS[size],
          )}
        >
          <span
            className={toClassName(
              "block h-full rounded-full",
              INTENT_SOLID_FILL_CLASS[intent],
            )}
            style={{ inlineSize: `${percent}%` }}
          />
        </span>

        <span
          aria-hidden="true"
          className={toClassName(
            SLIDER_THUMB_CLASS,
            SLIDER_THUMB_SIZE_CLASS[size],
            INTENT_SOLID_FILL_CLASS[intent],
          )}
          // Pulled back by half its own width so it sits ON the
          // position rather than starting at it, which is what keeps
          // 100% from hanging off the end of the track.
          //
          // `margin-inline-start`, not `translate: -50%`. `translate`
          // is physical, so in RTL it would shift the thumb the wrong
          // way and 0% would hang off the start edge — the one bug a
          // logical `inset-inline-start` looks like it already solved.
          style={{
            insetInlineStart: `${percent}%`,
            marginInlineStart: SLIDER_THUMB_OFFSET[size],
          }}
        />
      </div>
    </div>
  )
}
