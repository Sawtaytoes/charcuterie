import type { TextMatchRange } from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type {
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react"

import { PANEL_ITEM_SIZE_CLASS } from "../controlStyles.ts"
import { UnstyledLink } from "../RouterLink/UnstyledLink.tsx"
import { toClassName } from "../toClassName.ts"
import type { CommandPaletteItem } from "./commandPaletteSections.ts"

export type CommandPaletteOptionProps = {
  /** The DOM id `aria-activedescendant` points at. */
  id: string
  isActive: boolean
  item: CommandPaletteItem
  itemSize: ControlSize
  /** A click on the row: the link has navigated (or will), so close and run `onSelect`. */
  onChoose: () => void
  /** The pointer moved over the row. */
  onPoint: () => void
  titleRanges: readonly TextMatchRange[]
}

const ICON_SIZE_CLASS: Record<ControlSize, string> = {
  lg: "size-7 [&>img]:size-7 [&>svg]:size-5",
  md: "size-6 [&>img]:size-6 [&>svg]:size-4",
  sm: "size-5 [&>img]:size-5 [&>svg]:size-4",
}

/**
 * The title with each matched range wrapped in a `<mark>`. Plain
 * text in, so nothing the caller typed is ever read as markup.
 */
const HighlightedTitle = ({
  ranges,
  title,
}: {
  ranges: readonly TextMatchRange[]
  title: string
}): ReactNode => {
  if (ranges.length === 0) {
    return title
  }

  const pieces: ReactNode[] = []
  let cursor = 0

  for (const { end, start } of ranges) {
    if (start > cursor) {
      pieces.push(title.slice(cursor, start))
    }

    pieces.push(
      <mark
        className="bg-transparent font-semibold text-intent-accent-content"
        key={start}
      >
        {title.slice(start, end)}
      </mark>,
    )

    cursor = end
  }

  if (cursor < title.length) {
    pieces.push(title.slice(cursor))
  }

  return pieces
}

/**
 * One row of the palette's listbox.
 *
 * **Focus never comes here.** The input keeps it, and the row the
 * arrows have reached is announced through the input's
 * `aria-activedescendant` — the APG combobox pattern `Combobox` uses
 * too. So the row is `tabIndex={-1}`, and a mouse press is prevented
 * from moving focus (`onMouseDown`), which keeps the caret in the
 * input while the click still lands.
 *
 * **An `href` item is a real `<a href>`.** It goes through
 * `UnstyledLink`, so an app's injected router link handles a plain
 * click, and middle-click, ctrl-click and "copy link address" all
 * work, because it is a link. Enter in the input clicks this same
 * element, so the keyboard and the mouse take one path. An item
 * without one is a `<button>`, as in `Combobox`.
 *
 * **The pointer moves the active row on `pointermove`, not
 * `pointerenter`.** Arrowing scrolls the list under a mouse that has
 * not moved, and an enter event would then hand the active row to
 * whatever slid under the pointer.
 *
 * **One highlight.** The active row is tinted and nothing else is —
 * no separate `:hover` tint — because the pointer makes a row active,
 * and two tinted rows would leave Enter's target ambiguous.
 */
export const CommandPaletteOption = ({
  id,
  isActive,
  item,
  itemSize,
  onChoose,
  onPoint,
  titleRanges,
}: CommandPaletteOptionProps): ReactNode => {
  const { description, hint, href, icon, target, title } =
    item

  const className = toClassName(
    "flex w-full cursor-pointer items-center rounded-md text-start text-content-primary no-underline",
    PANEL_ITEM_SIZE_CLASS[itemSize],
    isActive && "bg-intent-neutral-surface-hover",
  )

  const content = (
    <>
      {icon === undefined ? null : (
        <span
          aria-hidden="true"
          className={toClassName(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-sm text-content-secondary [&>img]:object-contain",
            ICON_SIZE_CLASS[itemSize],
          )}
        >
          {icon}
        </span>
      )}

      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
        <span className="min-w-0 wrap-anywhere">
          <HighlightedTitle
            ranges={titleRanges}
            title={title}
          />
        </span>

        {description === undefined ? null : (
          <span className="min-w-0 text-content-muted text-sm wrap-anywhere">
            {description}
          </span>
        )}
      </span>

      {hint === undefined ? null : (
        <span className="shrink-0 text-content-muted text-sm">
          {hint}
        </span>
      )}
    </>
  )

  const keepFocusInInput = (
    mouseEvent: ReactMouseEvent<HTMLElement>,
  ) => {
    mouseEvent.preventDefault()
  }

  if (href !== undefined) {
    return (
      <UnstyledLink
        aria-selected={isActive}
        className={className}
        href={href}
        id={id}
        onClick={onChoose}
        onMouseDown={keepFocusInInput}
        onPointerMove={onPoint}
        rel={
          target === "_blank"
            ? "noopener noreferrer"
            : undefined
        }
        role="option"
        tabIndex={-1}
        target={target}
      >
        {content}
      </UnstyledLink>
    )
  }

  return (
    <button
      aria-selected={isActive}
      className={className}
      id={id}
      onClick={onChoose}
      onMouseDown={keepFocusInInput}
      onPointerMove={onPoint}
      role="option"
      tabIndex={-1}
      type="button"
    >
      {content}
    </button>
  )
}
