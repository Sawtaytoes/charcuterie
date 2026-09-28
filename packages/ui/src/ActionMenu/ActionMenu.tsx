import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useState } from "react"

import { IconButton } from "../IconButton/IconButton.tsx"
import type { MenuEntry } from "../Menu/Menu.tsx"
import { Menu } from "../Menu/Menu.tsx"

export type ActionMenuProps = {
  /**
   * Replaces the default dots. Pass the app's own glyph to match an
   * icon set exactly — Docket and Whereabouts both use lucide's
   * `EllipsisVertical` at `strokeWidth={1.75}`.
   */
  icon?: ReactNode
  items: MenuEntry[]
  /**
   * The trigger's accessible name, and through it the menu's. Name
   * the THING, not the gesture: `Actions for Cables`, so a page with
   * twenty of these has twenty different buttons.
   */
  label: string
  size?: ControlSize
}

/**
 * Three dots stacked, drawn as three round boxes sized in `em` so they grow with the trigger's `size`, rather than a `⋮`
 * character or an SVG. The library ships neither a glyph in a default
 * — a font without `⋮` paints nothing — nor an icon asset
 * (`docs/decisions/2026-07-29-ship-no-icons-and-no-symbol-glyphs.md`).
 * `currentColor` fill, so it takes the trigger's intent and its hover.
 */
const DEFAULT_DOTS = (
  <span
    aria-hidden="true"
    className="flex flex-col items-center gap-[0.17em]"
  >
    <span className="block size-[0.17em] rounded-full bg-current" />
    <span className="block size-[0.17em] rounded-full bg-current" />
    <span className="block size-[0.17em] rounded-full bg-current" />
  </span>
)

/**
 * The overflow control: a thing's secondary actions behind one
 * labelled vertical-dots button, opening a `Menu` aligned to the
 * button's end edge.
 *
 * Docket's `TaskActionMenu` and Whereabouts' `PlaceActionsMenu` were
 * the same fifty lines — a ghost neutral `IconButton`, a `useState`
 * for visibility, `placement="bottom-end"`, a toggle on click and a
 * close on dismiss. This owns all of it, so the caller hands over
 * only the actions and a name.
 *
 * The open state is internal on purpose: nothing outside the button
 * has a reason to open it, and choosing an item, Escape and an
 * outside press already close it through `Menu`'s `onDismiss`.
 */
export const ActionMenu = ({
  icon,
  items,
  label,
  size,
}: ActionMenuProps): ReactNode => {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <Menu
      isVisible={isVisible}
      items={items}
      onDismiss={() => {
        setIsVisible(false)
      }}
      placement="bottom-end"
      trigger={
        <IconButton
          appearance="ghost"
          // A trigger at the end of a flex row with a long title
          // beside it is where this lives, and a flex item shrinks by
          // default — measured at 23px of a 40px button.
          className="shrink-0"
          intent="neutral"
          label={label}
          onClick={() => {
            setIsVisible(
              (isCurrentlyVisible) => !isCurrentlyVisible,
            )
          }}
          size={size}
        >
          {icon ?? DEFAULT_DOTS}
        </IconButton>
      }
    />
  )
}
