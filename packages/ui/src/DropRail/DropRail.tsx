import {
  useLatestRef,
  useRovingFocus,
  useUniqueId,
} from "@charcuterie/logic"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"

export type DropRailTarget = {
  /**
   * A number after the label — a lane's size, a project's open
   * count. Optional, and absent is a real answer: a rail of
   * destinations that have no size should not print a zero on every
   * chip.
   */
  count?: number
  /**
   * Where the thing being moved already is. It stays **visible and
   * unofferable** rather than being filtered out, because a rail
   * whose contents change depending on what you grabbed is a rail
   * whose chips move under the pointer between one move and the
   * next — and muscle memory is the only reason this control is
   * faster than a menu.
   */
  isCurrent?: boolean
  isDisabled?: boolean
  key: string
  label: string
  /** A leading glyph the app owns — an emoji, a dot, an icon. */
  mark?: ReactNode
}

export type DropRailProps = {
  className?: string
  /**
   * Whether the rail is showing. The host owns this, because only
   * the host knows a move started — and it is the same boolean
   * whether the move began as a pointer drag or as a tap on a
   * handle.
   */
  isOpen: boolean
  /** The rail's accessible name. Required — it is a listbox. */
  label: string
  onDismiss?: () => void
  onPick: (targetKey: string) => void
  targets: readonly DropRailTarget[]
}

/**
 * The attribute the pointer hit test reads. A `data-` attribute
 * rather than a class, for the same reason `Board` marks its cards
 * with one: a class is a style and may be renamed by a consumer's
 * tooling, and this is a contract with a hit test.
 */
const TARGET_ATTRIBUTE = "data-drop-rail-target"

const TARGET_SELECTOR = "[data-drop-rail-target]"

/**
 * Every destination at once, brought to the pointer instead of the
 * pointer being carried to it.
 *
 * ### The measurement this exists for
 *
 * `Board` moves a card with a `Menu` on the card, and that is the
 * right control for a board: three or four lanes, all on screen, and
 * the menu opens where your hand already is. It stops being the
 * right control at the size the fleet's real lists reach. Docket's
 * Backlog draws **34 project groups down one page**, of which about
 * four fit on a display. Dragging a card from the first to the
 * thirty-fourth means holding a pointer down while the page scrolls,
 * and a menu of 34 items is a scrolling list inside a popup — the
 * same problem in a smaller box.
 *
 * A rail answers both. It pins to the top for the length of the
 * move, so nothing is ever off screen, and there is no travel: every
 * destination is the same short distance away.
 *
 * ### One control, three drivers, and that is the whole design
 *
 * WCAG 2.5.7 requires a single-pointer alternative to any dragging
 * movement, and `FileDropZone` next door says the same thing about
 * its own gesture: build the accessible path first and let the drag
 * be the enhancement. So the rail is **not** a drag affordance with
 * a fallback bolted on. It is a listbox that three things drive:
 *
 *  1. **Pointer.** While a button is held, the chip under the
 *     pointer is active and releasing over it commits.
 *  2. **Tap.** Opened with no button held, it is a list you touch.
 *     Identical markup, identical commit.
 *  3. **Keyboard.** Arrow keys walk it, Enter commits, Escape
 *     abandons. `useRovingFocus` owns which chip is tabbable, so
 *     there is no second keyboard model in this file to drift out of
 *     step with `Listbox`.
 *
 * The rail does not know which of the three opened it, and the host
 * does not have to say. It reads `event.buttons` on the first
 * pointer event it sees: a button already down means a drag is in
 * flight, and nothing else needs threading through.
 *
 * ### It takes no drag-and-drop dependency, and it hit-tests chips
 *
 * The board's decision priced four libraries and took none of them,
 * because a published library's dependency list is inherited by
 * every consumer — including one with 60 KB gzipped to spend in
 * total. Nothing here changes that arithmetic, and this needs far
 * less than `Board` does: a chip is a box under the pointer, so
 * `elementFromPoint` answers the only geometric question there is.
 * No snapshot, no collision strategy, no sortable transform.
 *
 * ### It is not `Rail`, and the two must not be confused
 *
 * `Rail` is the app shell's side rail — a landmark, an `<aside>` or
 * a `<nav>`, permanent furniture down one edge of a page. This is a
 * horizontal strip of drop targets that exists only for the length
 * of a move, and it is a `listbox`. They share four letters and
 * nothing else. `FileDropZone` sets the precedent for the prefix
 * carrying the distinction.
 *
 * ### What it deliberately does not do
 *
 * It does not render the thing being dragged, own the handle, or
 * know what a move means. The host keeps all three, which is what
 * lets the same rail sit above a board, a card grid, or a list of
 * accordions without any of them being modelled here.
 */
export const DropRail = ({
  className,
  isOpen,
  label,
  onDismiss,
  onPick,
  targets,
}: DropRailProps): ReactNode => {
  const baseId = useUniqueId()

  const railRef = useRef<HTMLDivElement>(null)

  /**
   * A pointer button was already down when the rail opened, so this
   * move is a drag and it commits on release. A tap-opened rail
   * commits on click instead, and the two must not both fire — a
   * released drag also produces a `click`.
   */
  const isPointerDriven = useRef(false)

  /**
   * Focus is moved into the rail once per open, not once per render.
   * Without the latch the effect below re-runs whenever the host
   * re-renders and drags focus back to the first chip, which
   * undoes every arrow key the moment anything above updates.
   */
  const hasTakenFocus = useRef(false)

  const [announcement, setAnnouncement] = useState("")

  const offerableKeys = targets
    .filter(
      (target) => !target.isCurrent && !target.isDisabled,
    )
    .map((target) => target.key)

  /**
   * The offerable keys as one string, because the effects below
   * depend on *which* destinations are offerable and none of them
   * may depend on the array's identity.
   *
   * `targets` is almost always a literal in the host's render, so
   * the array is new on every render. An effect keyed on it
   * re-registers every chip each time, and re-registering loses the
   * active one — which during a keyboard walk means the arrow keys
   * stop moving for no reason a consumer could ever debug.
   */
  const offerableKeysText = offerableKeys.join(" ")

  const firstOfferableKey = offerableKeys[0]

  const {
    activeValue,
    next,
    previous,
    register,
    setActiveValue,
  } = useRovingFocus<string>({ isWrapping: true })

  /**
   * Read by the global listeners, which are registered once per
   * open rather than once per render. Without them the pointer
   * handler closes over a stale `activeValue`, and Enter commits
   * whichever chip was active when the rail opened.
   */
  const activeValueRef = useLatestRef(activeValue)

  const offerableKeysRef = useLatestRef(offerableKeys)

  const onDismissRef = useLatestRef(onDismiss)

  const onPickRef = useLatestRef(onPick)

  const targetsRef = useLatestRef(targets)

  useEffect(() => {
    const releases = offerableKeysText
      .split(" ")
      .filter((key) => key !== "")
      .map((key) => register(key))

    return () => {
      for (const release of releases) {
        release()
      }
    }
  }, [offerableKeysText, register])

  /**
   * Closing resets everything a reopen must not inherit. Without it
   * a rail reopened for a different card starts on whatever the last
   * move chose, and the first arrow key moves from a place the
   * person never went.
   */
  useEffect(() => {
    if (isOpen) {
      return
    }

    setActiveValue(null)

    isPointerDriven.current = false

    hasTakenFocus.current = false

    setAnnouncement("")
  }, [isOpen, setActiveValue])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const commit = (targetKey: string) => {
      const target = targetsRef.current.find(
        (one) => one.key === targetKey,
      )

      if (target) {
        setAnnouncement(`Moved to ${target.label}.`)
      }

      onPickRef.current(targetKey)
    }

    const getKeyAt = (clientX: number, clientY: number) => {
      const chip = globalThis.document
        .elementFromPoint(clientX, clientY)
        ?.closest(TARGET_SELECTOR)

      return chip?.getAttribute(TARGET_ATTRIBUTE) ?? null
    }

    const getIsOfferable = (key: string | null) =>
      key !== null && offerableKeysRef.current.includes(key)

    const onPointerMove = (pointerEvent: PointerEvent) => {
      if (pointerEvent.buttons === 0) {
        return
      }

      isPointerDriven.current = true

      const key = getKeyAt(
        pointerEvent.clientX,
        pointerEvent.clientY,
      )

      // `null` when the pointer is between chips or off the rail
      // entirely, and that has to clear the highlight. A rail that
      // keeps the last chip lit is telling you it will land
      // somewhere it will not.
      setActiveValue(getIsOfferable(key) ? key : null)
    }

    const onPointerUp = (pointerEvent: PointerEvent) => {
      if (!isPointerDriven.current) {
        return
      }

      const key = getKeyAt(
        pointerEvent.clientX,
        pointerEvent.clientY,
      )

      if (getIsOfferable(key) && key !== null) {
        commit(key)

        return
      }

      onDismissRef.current?.()
    }

    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") {
        keyEvent.preventDefault()

        onDismissRef.current?.()

        return
      }

      if (
        keyEvent.key === "ArrowRight" ||
        keyEvent.key === "ArrowDown"
      ) {
        keyEvent.preventDefault()

        next()

        return
      }

      if (
        keyEvent.key === "ArrowLeft" ||
        keyEvent.key === "ArrowUp"
      ) {
        keyEvent.preventDefault()

        previous()

        return
      }

      const isCommitKey =
        keyEvent.key === "Enter" || keyEvent.key === " "

      if (isCommitKey && activeValueRef.current !== null) {
        keyEvent.preventDefault()

        commit(activeValueRef.current)
      }
    }

    globalThis.addEventListener(
      "pointermove",
      onPointerMove,
    )

    globalThis.addEventListener("pointerup", onPointerUp)

    globalThis.addEventListener("keydown", onKeyDown)

    return () => {
      globalThis.removeEventListener(
        "pointermove",
        onPointerMove,
      )

      globalThis.removeEventListener(
        "pointerup",
        onPointerUp,
      )

      globalThis.removeEventListener("keydown", onKeyDown)
    }
  }, [
    activeValueRef,
    isOpen,
    next,
    offerableKeysRef,
    onDismissRef,
    onPickRef,
    previous,
    setActiveValue,
    targetsRef,
  ])

  /**
   * Focus enters the rail only when a pointer is NOT driving it.
   * Stealing focus mid-drag scrolls the page to the rail on some
   * browsers, which is the one thing this control exists to avoid.
   */
  useEffect(() => {
    if (
      !isOpen ||
      isPointerDriven.current ||
      hasTakenFocus.current ||
      firstOfferableKey === undefined
    ) {
      return
    }

    hasTakenFocus.current = true

    setActiveValue(firstOfferableKey)

    railRef.current
      ?.querySelector<HTMLElement>(
        "[data-drop-rail-target]:not([aria-disabled='true'])",
      )
      ?.focus()
  }, [firstOfferableKey, isOpen, setActiveValue])

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div
        aria-label={label}
        className={toClassName(
          "sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-md border border-border-default bg-surface-overlay p-2 shadow-(--elevation-medium)",
          className,
        )}
        id={baseId}
        ref={railRef}
        role="listbox"
      >
        {targets.map((target) => {
          const isOfferable =
            !target.isCurrent && !target.isDisabled

          const isActive =
            isOfferable && activeValue === target.key

          return (
            <button
              aria-disabled={isOfferable ? undefined : true}
              aria-selected={isActive}
              className={toClassName(
                "flex max-w-80 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors duration-(--duration-fast) ease-standard",
                isOfferable
                  ? "cursor-pointer border-border-default bg-surface-raised text-content-primary hover:bg-surface-sunken"
                  : "cursor-not-allowed border-border-subtle bg-surface-sunken text-content-disabled",
                isActive &&
                  "border-intent-accent-border bg-intent-accent-surface text-intent-accent-content outline-solid outline-(length:--focus-ring-width) outline-focus-ring",
              )}
              data-drop-rail-target={target.key}
              key={target.key}
              onClick={() => {
                // A released drag also fires a click. The pointer path
                // has already committed by then, so this guard is what
                // stops a drag committing twice.
                if (
                  isPointerDriven.current ||
                  !isOfferable
                ) {
                  return
                }

                onPick(target.key)
              }}
              role="option"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              {target.mark === undefined ? null : (
                <span aria-hidden>{target.mark}</span>
              )}

              <span className="truncate">
                {target.label}
              </span>

              {target.count === undefined ? null : (
                <span className="text-content-secondary text-xs">
                  {target.count}
                </span>
              )}

              {target.isCurrent ? (
                // Said out loud, not shown by dimming alone. WCAG
                // 1.4.1: the one chip a person must not aim for is
                // exactly the one that must not be marked by colour.
                <VisuallyHidden>
                  — where it is now
                </VisuallyHidden>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* OUTSIDE the listbox, and that is not a style choice. A
          `role="listbox"` may contain only `option` children, so a
          live region inside it is an axe `aria-required-children`
          violation — which is how this was found. It is `sr-only`,
          so being a sibling costs no layout. */}
      <output aria-live="polite" className="sr-only">
        {announcement}
      </output>
    </>
  )
}
