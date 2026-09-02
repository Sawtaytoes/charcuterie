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
import {
  fromFraction,
  toPercent,
} from "../Slider/sliderValue.ts"
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
import type {
  RangeSliderThumb,
  RangeSliderValue,
} from "./rangeSliderValue.ts"
import {
  getNearerThumb,
  getThumbBounds,
  moveThumb,
  snapRange,
} from "./rangeSliderValue.ts"

/**
 * A position along the range, drawn as a mark on the bar.
 *
 * Prop-driven and nothing more: a chapter list, a scene index, a set
 * of preset prices. The component holds no model of what a tick
 * means, and `label` is optional because a mark that needs no words
 * is the common case.
 */
export type RangeSliderTick = {
  label?: string
  value: number
}

export type RangeSliderProps = Omit<
  ComponentPropsWithRef<"div">,
  "children" | "defaultValue" | "onChange"
> & {
  intent?: IntentName
  isDisabled?: boolean
  isLabelVisible?: boolean
  /**
   * Read-only in the `aria-readonly` sense: focusable, full contrast,
   * announced as unchangeable — the same distinction `Slider` draws.
   * A clip already sent to a renderer is this, not `isDisabled`: the
   * span is still worth reading.
   */
  isReadOnly?: boolean
  isValueShown?: boolean
  /** Required. Each thumb's own name is built from it. */
  label: string
  /** PageUp / PageDown. Defaults to a tenth of the range, as `Slider`'s does. */
  largeStep?: number
  max?: number
  min?: number
  /**
   * Fires on every movement — each arrow key, and each pointer sample
   * while dragging. Use it to paint. See `onChangeEnd` for committing.
   */
  onChange?: (value: RangeSliderValue) => void
  /**
   * Fires once, when the interaction ends: pointer release, or key up.
   *
   * The same split `Slider` settled, for the same reason. A clip
   * preview that re-seeks a player from `onChange` issues one seek per
   * pointer sample and arrives at the right frame **last**, behind a
   * queue of stale ones.
   */
  onChangeEnd?: (value: RangeSliderValue) => void
  size?: SliderSize
  step?: number
  /**
   * Marks along the bar. Positions in the same units as `value`, so a
   * film's chapters are the offsets the app already has.
   *
   * A `label` is centred on its own mark and clamped inside the bar at
   * both ends. Two marks closer together than a label box will overlap:
   * the component draws what it is given, and a caller with dense marks
   * passes the words only where there is room for them.
   */
  ticks?: readonly RangeSliderTick[]
  /**
   * Seeds the range; it does not control it. A drag paints from the
   * component's own value, so a caller that commits on `onChangeEnd`
   * alone still sees the thumbs follow the pointer.
   */
  value?: RangeSliderValue
  /**
   * How each end reads aloud and, when `isValueShown`, on screen.
   * This is what keeps timecodes out of the library: the component
   * knows a number, the app knows it is 21:14.
   */
  valueFormat?: (value: number) => string
}

/** Half the tick-label box, which is what centres it on its mark. */
const TICK_LABEL_INLINE_SIZE = "4.5rem"

const TICK_LABEL_HALF = "2.25rem"

/**
 * A two-thumb range control: a span picked out along a bar, with an
 * independently focusable handle at each end.
 *
 * It exists because QueuePilot lets a user play **only a section** of
 * a video, and a clip's start and end are a shape `Slider` states it
 * is not: *"a two-thumb range is a different widget with its own
 * focus model"*
 * ([decision](../../../../docs/decisions/2026-09-01-a-two-thumb-range-is-its-own-component-and-shares-the-bar.md)).
 *
 * ## Why this is a component and not `Slider isRange`
 *
 * `Combobox`'s `isMultiple` and `DatePicker`'s `isRange` are modes
 * because neither changes the widget's role and both share nearly
 * everything. Both halves of that test fail here.
 *
 * `Slider` puts `role="slider"`, the tab stop and the pointer target
 * **on the track**, because one track reports one value. Two values
 * cannot live on one accessible object, so here the role moves to the
 * thumbs, the track becomes a `role="group"` carrying the label, and
 * the tab stops go from one to two. A mode that rewrote its own role
 * would break `getByRole("slider", { name })` in every consumer that
 * had ever used the single-value one.
 *
 * What the two genuinely share is the arithmetic
 * (`Slider/sliderValue.ts`, called rather than copied) and the bar
 * (`../sliderStyles.ts`) — so a range slider snaps on the same grid
 * and paints as the same control.
 *
 * ## The thumbs clamp, they do not swap
 *
 * A thumb dragged past its partner stops on it and the range collapses
 * to zero width. The thumbs never trade identities mid-drag: the
 * handle under the pointer is the one the user grabbed, and the
 * focused handle is the one an arrow key moves. Each thumb reports the
 * other as its own `aria-valuemin` / `aria-valuemax`, which is how a
 * screen reader is told where this handle stops.
 *
 * A press on the bar moves the **nearer** thumb. When the two sit on
 * the same value, the press's side decides — which is what lets a
 * collapsed range be pulled open again in either direction.
 */
export const RangeSlider = ({
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
  ticks,
  value = { end: max, start: min },
  valueFormat,
  ...divProps
}: RangeSliderProps): ReactNode => {
  const labelId = useUniqueId()

  const trackRef = useRef<HTMLDivElement>(null)

  const startThumbRef = useRef<HTMLSpanElement>(null)

  const endThumbRef = useRef<HTMLSpanElement>(null)

  // Null means "not dragging". The thumb rides along with the value
  // because a drag has to keep moving the handle it picked up, even
  // once the pointer has travelled past the other one and the "nearer"
  // answer has changed.
  const [drag, setDrag] = useState<{
    range: RangeSliderValue
    thumb: RangeSliderThumb
  } | null>(null)

  const isInert = isDisabled || isReadOnly

  const bounds = { max, min, step }

  const committed = snapRange(value, bounds)

  const shown = drag?.range ?? committed

  const bigStep =
    largeStep == null
      ? (Math.max(min, max) - Math.min(min, max)) / 10
      : largeStep

  const startPercent = toPercent(shown.start, min, max)

  const endPercent = toPercent(shown.end, min, max)

  const emit = (
    next: RangeSliderValue,
    thumb: RangeSliderThumb,
    isEnd: boolean,
  ): void => {
    if (
      next.start !== shown.start ||
      next.end !== shown.end
    ) {
      onChange?.(next)
    }

    if (isEnd) {
      setDrag(null)

      onChangeEnd?.(next)

      return
    }

    setDrag({ range: next, thumb })
  }

  /** The value the pointer at `clientX` is pointing at. */
  const valueAt = (clientX: number): number => {
    const track = trackRef.current

    if (!track) return shown.start

    const box = track.getBoundingClientRect()

    if (box.width <= 0) return shown.start

    // `left`/`width` are physical, from the layout box, and stay
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

    // The press is ours, and the default is what would undo it: a
    // mousedown on a non-focusable element moves focus to the body,
    // so the handle this handler just focused would lose it again a
    // tick later. `Slider` never needed this because its pointer
    // target IS its focusable element; here the bar is the target and
    // the thumb is the tab stop.
    event.preventDefault()

    const at = valueAt(event.clientX)

    const thumb = getNearerThumb({ at, range: shown })

    // Capture on the GROUP rather than on the thumb, so a drag that
    // leaves the bar vertically keeps reporting — and so a fast drag
    // that outruns the thumb it is moving does not hand the pointer to
    // the element underneath.
    event.currentTarget.setPointerCapture(event.pointerId)

    // Focus follows the grab. A pointer user who then reaches for the
    // arrow keys is moving the handle they were just dragging, which
    // is the only answer that does not need looking at.
    //
    // The handle wears its focus ring for the length of the drag,
    // which is a script `focus()` matching `:focus-visible`. On a
    // one-thumb control that would be the ring-after-a-click the house
    // style rejects; here it is the answer to "which of the two am I
    // holding", and it is the same mark the keyboard path leaves.
    const thumbElement =
      thumb === "start"
        ? startThumbRef.current
        : endThumbRef.current

    thumbElement?.focus()

    emit(
      moveThumb({ bounds, next: at, range: shown, thumb }),
      thumb,
      false,
    )
  }

  const onPointerMove = (
    event: PointerEvent<HTMLDivElement>,
  ): void => {
    if (isInert || drag == null) return

    emit(
      moveThumb({
        bounds,
        next: valueAt(event.clientX),
        range: shown,
        thumb: drag.thumb,
      }),
      drag.thumb,
      false,
    )
  }

  const onPointerUp = (
    event: PointerEvent<HTMLDivElement>,
  ): void => {
    if (isInert || drag == null) return

    event.currentTarget.releasePointerCapture(
      event.pointerId,
    )

    emit(
      moveThumb({
        bounds,
        next: valueAt(event.clientX),
        range: shown,
        thumb: drag.thumb,
      }),
      drag.thumb,
      true,
    )
  }

  /**
   * `Slider`'s key handling, per thumb. Home and End are absolute and
   * are clamped at the other thumb like any other movement, so End on
   * the start handle means "as far right as this handle goes".
   */
  const getKeyedValue = (
    event: KeyboardEvent<HTMLSpanElement>,
    current: number,
  ): number | null => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowLeft":
        return current - step
      case "ArrowRight":
      case "ArrowUp":
        return current + step
      case "End":
        return Math.max(min, max)
      case "Home":
        return Math.min(min, max)
      case "PageDown":
        return current - bigStep
      case "PageUp":
        return current + bigStep
      default:
        return null
    }
  }

  const onThumbKeyDown =
    (thumb: RangeSliderThumb) =>
    (event: KeyboardEvent<HTMLSpanElement>): void => {
      if (isInert) return

      const next = getKeyedValue(event, shown[thumb])

      if (next == null) return

      event.preventDefault()

      // Keys commit immediately, as `Slider`'s do: a key press is a
      // discrete interaction with no release to wait for.
      emit(
        moveThumb({ bounds, next, range: shown, thumb }),
        thumb,
        true,
      )
    }

  const renderThumb = (
    thumb: RangeSliderThumb,
  ): ReactNode => {
    const thumbBounds = getThumbBounds({
      bounds,
      range: shown,
      thumb,
    })

    const percent =
      thumb === "start" ? startPercent : endPercent

    return (
      <span
        aria-disabled={isDisabled || undefined}
        // The group carries `label`; each thumb says which end of it
        // this is, so `getByRole("slider", { name: "Clip start" })`
        // resolves to exactly one handle.
        aria-label={`${label} ${thumb}`}
        aria-orientation="horizontal"
        aria-readonly={isReadOnly || undefined}
        // The other thumb is this one's bound. That is the clamping
        // rule stated in the only vocabulary a slider has.
        aria-valuemax={thumbBounds.max}
        aria-valuemin={thumbBounds.min}
        aria-valuenow={shown[thumb]}
        aria-valuetext={valueFormat?.(shown[thumb])}
        className={toClassName(
          SLIDER_THUMB_CLASS,
          SLIDER_THUMB_SIZE_CLASS[size],
          INTENT_SOLID_FILL_CLASS[intent],
          FOCUS_RING_CLASS,
          isReadOnly ? "cursor-default" : "",
        )}
        key={thumb}
        onKeyDown={onThumbKeyDown(thumb)}
        ref={
          thumb === "start" ? startThumbRef : endThumbRef
        }
        role="slider"
        // Pulled back by half its own width so it sits ON the value
        // rather than starting at it. `margin-inline-start`, not
        // `translate: -50%`: `translate` is physical, so in RTL it
        // would shift the thumb the wrong way and 0% would hang off
        // the start edge.
        style={{
          insetInlineStart: `${percent}%`,
          marginInlineStart: SLIDER_THUMB_OFFSET[size],
        }}
        tabIndex={isDisabled ? -1 : 0}
      />
    )
  }

  const shownText =
    valueFormat == null
      ? `${shown.start} to ${shown.end}`
      : `${valueFormat(shown.start)} to ${valueFormat(shown.end)}`

  return (
    <div
      {...divProps}
      className={toClassName(
        "flex flex-col gap-1",
        // A definite floor, for `Slider`'s reason: the root has no
        // intrinsic width of its own, so in a shrink-to-fit parent it
        // would collapse to the width of a thumb with every gate
        // still green.
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
            // "to", not an en dash. A default is words — the
            // no-symbol-glyph rule — and "0:30 to 2:15" is also what
            // the span reads as out loud.
            <span className="text-content-muted tabular-nums">
              {shownText}
            </span>
          ) : null}
        </div>
      ) : (
        <VisuallyHidden id={labelId}>
          {label}
        </VisuallyHidden>
      )}

      {/* A `group`, not a `slider`: the two values live on the thumbs,
          and this is what holds the name they are each part of. The
          pointer target is still the whole row, which is why a press
          anywhere on the bar moves the nearer handle. */}
      {/* biome-ignore lint/a11y/useSemanticElements: the semantic element for `group` is `<fieldset>`, which drags `<legend>` semantics, a border and form-reset behaviour onto a bar that already carries its name through `aria-labelledby` — and a `FieldGroup` around this control is where a real `<fieldset>` belongs. Same call `Menu`'s group, `AccordionSection`, `BoardLaneList` and `ActionTiles` already made. */}
      <div
        aria-labelledby={labelId}
        className={toClassName(
          SLIDER_ROW_CLASS,
          // NOT `ARIA_DISABLED_CLASS`, for the reason `Slider` gives:
          // that constant paints a box-shaped control, and this
          // control's body is a 2px bar inside a 40px row.
          //
          // `pointer-events-none` is load-bearing rather than
          // cosmetic — without a real `:disabled` the hover rules
          // still match.
          isDisabled
            ? "pointer-events-none opacity-55"
            : "",
          isReadOnly ? "cursor-default" : "",
        )}
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={trackRef}
        role="group"
      >
        <span
          className={toClassName(
            SLIDER_TRACK_CLASS,
            SLIDER_TRACK_SIZE_CLASS[size],
          )}
        >
          {/* The selected span, offset from the start of the track
              rather than sized from it — a percentage margin resolves
              against the same inline size the width does, and
              `margin-inline-start` flips with the writing direction
              where a `left` would not. */}
          <span
            className={toClassName(
              "block h-full rounded-full",
              INTENT_SOLID_FILL_CLASS[intent],
            )}
            style={{
              inlineSize: `${endPercent - startPercent}%`,
              marginInlineStart: `${startPercent}%`,
            }}
          />
        </span>

        {ticks?.map((tick) => (
          <span
            aria-hidden="true"
            className="absolute h-2 w-px bg-border-strong"
            key={tick.value}
            style={{
              insetInlineStart: `${toPercent(tick.value, min, max)}%`,
            }}
          />
        ))}

        {/* Start first, so Tab reaches the two handles in the order
            they read. */}
        {renderThumb("start")}

        {renderThumb("end")}
      </div>

      {ticks?.some((tick) => tick.label != null) ? (
        // Decoration. Each thumb already announces its own value
        // through `aria-valuetext`, and a screen reader reading a row
        // of chapter names between them would be reading the picture.
        <div
          aria-hidden="true"
          className="relative h-4 w-full text-content-muted text-xs"
        >
          {ticks.map((tick) =>
            tick.label == null ? null : (
              <span
                className="absolute text-center"
                key={tick.value}
                // Centred on its mark, and `clamp`ed so the first and
                // last labels stay inside the bar instead of hanging
                // off its ends. A fixed box is what makes the centring
                // possible at all: the label's own width is not known
                // here, and `translate: -50%` is physical.
                style={{
                  inlineSize: TICK_LABEL_INLINE_SIZE,
                  insetInlineStart: `clamp(0rem, calc(${toPercent(tick.value, min, max)}% - ${TICK_LABEL_HALF}), calc(100% - ${TICK_LABEL_INLINE_SIZE}))`,
                }}
              >
                {tick.label}
              </span>
            ),
          )}
        </div>
      ) : null}
    </div>
  )
}
