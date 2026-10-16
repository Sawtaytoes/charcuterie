import type { ReactNode } from "react"
import { useRef } from "react"

import { Modal } from "../Modal/Modal.tsx"
import { toClassName } from "../toClassName.ts"
import {
  CommandPalettePanel,
  type CommandPalettePanelProps,
} from "./CommandPalettePanel.tsx"

export type CommandPaletteProps = Omit<
  CommandPalettePanelProps,
  "inputRef" | "onChoose"
> & {
  className?: string
  isVisible: boolean
  /** Every route out: Escape, a press outside, and a chosen row. */
  onClose: () => void
}

/**
 * Top-anchored on a wide window, so the list grows downward from a
 * fixed field instead of re-centering as it fills; nearly the whole
 * screen in the Narrow View, where a phone keyboard takes the bottom.
 *
 * `self-start` because `OverlayPanel` centers its child in a flex
 * box. `dvh` for the reason `Dialog` gives: on a phone `vh` includes
 * the address bar.
 */
const PALETTE_BOX_CLASS =
  "mt-[12dvh] max-h-[76dvh] w-[calc(100vw-2rem)] max-w-[45rem] self-start max-sm:mt-2 max-sm:h-[calc(100dvh-1rem)] max-sm:max-h-[calc(100dvh-1rem)] max-sm:w-[calc(100vw-1rem)]"

/**
 * The launcher: a search field over a grouped list, opened over the
 * page.
 *
 * - **It shows something before anything is typed** — the caller's
 *   `suggestions` ("Pinned", "Recently opened").
 * - **Typing filters `items` by word prefix**: every typed word must
 *   start a word of the title, the description or a keyword, and the
 *   initials count (`ha` → `Home Automation`). Matches are grouped by
 *   each item's `group`.
 * - **A prefix command** — `au lego` — routes the rest of the query
 *   to one of the caller's `prefixes`.
 * - **The last row is the caller's fallback** (`getFallbackItem`), so
 *   a query nothing matches still goes somewhere.
 *
 * The library owns the shape. Every name, link and target is data the
 * app passes in.
 *
 * ### Open state
 *
 * `isVisible` and `onClose`, as on `Modal`: the app holds the state,
 * usually in `useCommandPalette()`, which also wires the global keys.
 * The query is controlled (`query` + `onQueryChange`) or uncontrolled
 * (`defaultQuery`, read each time it opens), as on `Combobox`.
 *
 * ### Keys
 *
 * Arrow keys, Home and End move the active row; Enter opens it;
 * `Ctrl Enter` or `⌘ Enter` opens an `href` row in a new tab; Escape
 * closes. Focus stays in the field the whole time and the active row
 * is its `aria-activedescendant`. Focus is trapped while it is open and
 * goes back to where it was when it closes.
 */
export const CommandPalette = ({
  className,
  isVisible,
  label = "Search",
  onClose,
  ...panelProps
}: CommandPaletteProps): ReactNode => {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <Modal
      aria-label={label}
      className={toClassName(PALETTE_BOX_CLASS, className)}
      initialFocus={inputRef}
      isVisible={isVisible}
      onClose={onClose}
    >
      <CommandPalettePanel
        {...panelProps}
        inputRef={inputRef}
        label={label}
        onChoose={onClose}
      />
    </Modal>
  )
}
