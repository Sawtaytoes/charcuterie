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
 * Its own file because each row measures its own text, and a hook
 * cannot run in a loop.
 *
 * ### The tooltip appears only while the text is clipped
 *
 * `useIsTextClipped` is `Badge`'s: an ellipsis leaves no trace in the
 * DOM, so the only way to know a label is cut off is to measure it.
 * A `title` on every row would put a tooltip on forty short names to
 * help the one long one.
 *
 * ### The actions wrap; they never squeeze the text
 *
 * The row is a wrapping flex line. The text column asks for 12rem
 * and grows into the rest, so in a wide list the actions sit at the
 * inline end of the same line, and in a list narrower than the text
 * plus the actions they drop under the text instead of crushing the
 * label to an ellipsis and nothing. No container query: the wrap is
 * decided by the content itself.
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

  return (
    <li
      className={toClassName(
        "flex flex-wrap items-center gap-x-3 gap-y-2",
        ROW_SIZE_CLASS[size],
      )}
    >
      <div className="flex min-w-0 flex-[1_1_12rem] flex-col gap-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={toClassName(
              "min-w-0 max-w-full font-medium text-content-primary",
              size === "sm" ? "text-sm" : "text-md",
              overflowClass,
            )}
            ref={labelRef}
            title={
              isTextTruncated ? clippedLabel : undefined
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

      {item.actions ? (
        <div className="flex shrink-0 items-center gap-2">
          {item.actions}
        </div>
      ) : null}
    </li>
  )
}
