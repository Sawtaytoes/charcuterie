import type { ControlSize } from "@charcuterie/tokens"
import type { CSSProperties, ReactNode } from "react"

import { toClassName } from "../toClassName.ts"
import { toInitials } from "./catalogPickerView.ts"

export type CatalogPickerMarkProps = {
  accentColor?: string
  icon?: ReactNode
  /**
   * The group label the badge's initials come from. `undefined` with
   * no `icon` draws an empty slot of the same size, so a row with no
   * group still lines its label up with the rows above it.
   */
  initialsOf?: string
  size: ControlSize
}

const MARK_SIZE_CLASS: Record<ControlSize, string> = {
  lg: "size-7 [&>img]:size-7 [&>svg]:size-5",
  md: "size-6 [&>img]:size-6 [&>svg]:size-4",
  sm: "size-5 [&>img]:size-5 [&>svg]:size-4",
}

/**
 * A group's mark — the app's icon, or the group's initials on a
 * neutral badge — in a fixed square.
 *
 * `accentColor` is drawn as an **outer ring** (`box-shadow`), never as
 * the badge's fill or its text. The initials stay `content-primary` on
 * a neutral surface, which the contrast gate already covers, so a
 * consumer's arbitrary color cannot make the text unreadable. A ring
 * also takes no layout space, so a ringed mark and a plain one are the
 * same size.
 *
 * Decorative throughout (`aria-hidden`): the row, the tab and the
 * trigger all carry the group or item name as text or `aria-label`.
 */
export const CatalogPickerMark = ({
  accentColor,
  icon,
  initialsOf,
  size,
}: CatalogPickerMarkProps): ReactNode => {
  const ringStyle: CSSProperties | undefined =
    accentColor === undefined
      ? undefined
      : { boxShadow: `0 0 0 2px ${accentColor}` }

  if (icon !== undefined && icon !== null) {
    return (
      <span
        aria-hidden="true"
        className={toClassName(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-sm text-content-secondary [&>img]:object-contain",
          MARK_SIZE_CLASS[size],
        )}
        style={ringStyle}
      >
        {icon}
      </span>
    )
  }

  if (initialsOf === undefined) {
    return (
      <span
        aria-hidden="true"
        className={toClassName(
          "shrink-0",
          MARK_SIZE_CLASS[size],
        )}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={toClassName(
        "flex shrink-0 items-center justify-center rounded-sm bg-intent-neutral-surface-hover font-semibold text-content-primary text-xs leading-none",
        MARK_SIZE_CLASS[size],
      )}
      style={ringStyle}
    >
      {toInitials(initialsOf)}
    </span>
  )
}
