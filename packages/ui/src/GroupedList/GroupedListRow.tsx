import type { IntentName } from "@charcuterie/tokens"
import type { ReactNode } from "react"

import { useIsTextClipped } from "../Badge/useIsTextClipped.ts"
import { toClassName } from "../toClassName.ts"
import type {
  GroupedListItem,
  GroupedListSize,
} from "./GroupedList.tsx"

export type GroupedListRowProps = {
  isTextTruncated: boolean
  item: GroupedListItem
  size: GroupedListSize
}

const ROW_SIZE_CLASS: Record<GroupedListSize, string> = {
  md: "px-4 py-3",
  sm: "px-3 py-2",
}

/**
 * Written out per intent, because Tailwind scans source text for
 * whole class strings: `inset-ring-intent-${intent}-content`
 * generates nothing. `-content` rather than `-border`, because a
 * ring that announces "this just changed" has to clear the 3:1
 * non-text contrast floor against the row, and a border role is
 * tuned to sit quietly under it.
 */
const HIGHLIGHT_RING_CLASS: Record<IntentName, string> = {
  accent: "inset-ring-intent-accent-content",
  danger: "inset-ring-intent-danger-content",
  info: "inset-ring-intent-info-content",
  neutral: "inset-ring-intent-neutral-content",
  success: "inset-ring-intent-success-content",
  warning: "inset-ring-intent-warning-content",
}

/**
 * The whole-row button. It is the bottom layer of the row: the text
 * columns above it are `pointer-events-none`, so a click on the label
 * lands here, and the actions above it keep their own targets.
 *
 * Every state is a SURFACE plus an edge, never colour alone. Hover is
 * scoped by Tailwind's own `hover:` to devices that hover, so a tap on
 * a phone does not leave a row lit. The focus ring is drawn INSIDE the
 * row's edge (a negative offset) because the group's list clips its
 * rounded corners, and an outside ring would be cut off on the first
 * and last row. It sits one ring-width in from the edge, so it never
 * shares pixels with the hover edge or the highlight ring, which both
 * hug the edge — a highlighted row that has focus shows both.
 */
const SELECT_BUTTON_CLASS =
  "absolute inset-0 cursor-pointer appearance-none border-0 bg-transparent p-0 transition-[background-color,box-shadow] duration-(--duration-fast) ease-standard hover:bg-intent-neutral-surface-hover hover:inset-ring hover:inset-ring-intent-accent-border active:bg-intent-neutral-surface-hover focus-visible:outline-solid focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-[calc(var(--focus-ring-width)*-2)] focus-visible:outline-focus-ring"

/**
 * The press. The row sinks a little while its button is held — the
 * motion the owner asked for on tally-marks' cards — and only when the
 * user has not asked the OS for less; the surface change on the button
 * carries the press without it. Keyed on the row's OWN button, so
 * holding an action does not press the row.
 */
const SELECTABLE_ROW_CLASS =
  "relative transition-transform duration-(--duration-fast) ease-standard motion-safe:has-[>button:active]:scale-[0.99]"

/**
 * Its own file because each row measures its own text, and a hook
 * cannot run in a loop.
 *
 * ### The tooltip appears only while the text is clipped
 *
 * `useIsTextClipped` is `Badge`'s: an ellipsis leaves no trace in the
 * DOM, so the only way to know a label is cut off is to measure it.
 * A `title` on every row would put a tooltip on forty short names to
 * help the one long one. In a selectable row the text lets the
 * pointer through, so the clipped label's tooltip moves to the button
 * the pointer is actually over.
 *
 * ### The actions wrap; they never squeeze the text
 *
 * The row is a wrapping flex line. The text column asks for 12rem
 * and grows into the rest, and the aside asks for at least 11rem, so
 * in a wide list the aside and the actions sit at the inline end of
 * the same line, and in a list narrower than all of them they drop
 * under the text instead of crushing the label to an ellipsis and
 * nothing. No container query: the wrap is decided by the content
 * itself.
 *
 * ### The layers of a selectable row
 *
 * In tree order, and every one of them positioned, so they paint in
 * that order with no `z-index` to keep in step: the button (bottom),
 * the text and the aside (pointer passes through), the actions
 * (their own targets), and the highlight ring (top, pointer passes
 * through) — the ring is last so a hovered row cannot paint over it.
 */
export const GroupedListRow = ({
  isTextTruncated,
  item,
  size,
}: GroupedListRowProps): ReactNode => {
  const [labelRef, clippedLabel] = useIsTextClipped()

  const [descriptionRef, clippedDescription] =
    useIsTextClipped()

  const overflowClass = isTextTruncated
    ? "truncate"
    : "wrap-anywhere"

  const {
    highlightIntent = "accent",
    isHighlighted = false,
    isMuted = false,
    onSelect,
  } = item

  const isSelectable = onSelect !== undefined

  // A layer that sits above the button and must let the pointer
  // through to it. Without a button it is an ordinary column.
  const passThroughClass = isSelectable
    ? "pointer-events-none relative"
    : null

  return (
    <li
      className={toClassName(
        "flex flex-wrap items-center gap-x-3 gap-y-2",
        ROW_SIZE_CLASS[size],
        isSelectable && SELECTABLE_ROW_CLASS,
        isHighlighted && "relative",
        isMuted && "bg-surface-sunken",
      )}
    >
      {isSelectable ? (
        <button
          aria-label={item.selectLabel ?? item.label}
          className={SELECT_BUTTON_CLASS}
          onClick={onSelect}
          title={isTextTruncated ? clippedLabel : undefined}
          type="button"
        />
      ) : null}

      <div
        className={toClassName(
          "flex min-w-0 flex-[1_1_12rem] flex-col gap-0.5",
          passThroughClass,
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={toClassName(
              "min-w-0 max-w-full font-medium",
              isMuted
                ? "text-content-secondary"
                : "text-content-primary",
              size === "sm" ? "text-sm" : "text-md",
              overflowClass,
            )}
            ref={labelRef}
            title={
              isTextTruncated && !isSelectable
                ? clippedLabel
                : undefined
            }
          >
            {item.label}
          </span>

          {item.badges ? (
            <span className="flex min-w-0 flex-wrap items-center gap-1">
              {item.badges}
            </span>
          ) : null}
        </div>

        {item.description ? (
          <span
            className={toClassName(
              "block min-w-0 text-content-secondary",
              size === "sm" ? "text-xs" : "text-sm",
              overflowClass,
            )}
            ref={descriptionRef}
            title={
              isTextTruncated
                ? clippedDescription
                : undefined
            }
          >
            {item.description}
          </span>
        ) : null}

        {item.content ? (
          <div className="mt-1 min-w-0 wrap-anywhere text-content-secondary text-sm">
            {item.content}
          </div>
        ) : null}
      </div>

      {item.aside ? (
        <div
          className={toClassName(
            // An 11rem floor, so a short figure does not squeeze in
            // beside a phone-width label: it sits beside the text only
            // when there is room for a real column, and drops under
            // it otherwise. `min(…, 100%)` keeps the floor from
            // overflowing a list narrower than the floor itself.
            "flex min-w-[min(11rem,100%)] max-w-full flex-[0_1_auto] wrap-anywhere",
            passThroughClass,
          )}
        >
          {item.aside}
        </div>
      ) : null}

      {item.actions ? (
        <div
          className={toClassName(
            "flex shrink-0 items-center gap-2",
            isSelectable && "relative",
          )}
        >
          {item.actions}
        </div>
      ) : null}

      {isHighlighted ? (
        <span
          aria-hidden
          className={toClassName(
            "charcuterie-highlight pointer-events-none absolute inset-0 inset-ring-2",
            HIGHLIGHT_RING_CLASS[highlightIntent],
          )}
        />
      ) : null}
    </li>
  )
}
