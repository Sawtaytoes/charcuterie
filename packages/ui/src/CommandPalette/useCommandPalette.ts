import { useVisibility } from "@charcuterie/logic"
import { useCallback, useState } from "react"

import {
  type CommandPaletteHotkeysOptions,
  useCommandPaletteHotkeys,
} from "./useCommandPaletteHotkeys.ts"

export type UseCommandPaletteOptions = Pick<
  CommandPaletteHotkeysOptions,
  "isOpenedByTyping"
> & {
  /** Register the global keys (`useCommandPaletteHotkeys`). Default `true`. */
  hasHotkeys?: boolean
}

export type UseCommandPaletteResult = {
  close: () => void
  isVisible: boolean
  /** Open it, optionally with text already in the field. */
  open: (initialQuery?: string) => void
  /** Spread onto `CommandPalette`. */
  paletteProps: {
    defaultQuery: string
    isVisible: boolean
    onClose: () => void
  }
}

/**
 * The open state for one `CommandPalette`, and its global keys.
 *
 * ```tsx
 * const palette = useCommandPalette()
 *
 * <Button onClick={() => palette.open()}>Search</Button>
 * <CommandPalette {...palette.paletteProps} items={items} />
 * ```
 *
 * The keys are off while it is open, so a second `Ctrl K` does not
 * reset what has been typed.
 */
export const useCommandPalette = ({
  hasHotkeys = true,
  isOpenedByTyping,
}: UseCommandPaletteOptions = {}): UseCommandPaletteResult => {
  const { hide, isVisible, show } = useVisibility()

  const [initialQuery, setInitialQuery] = useState("")

  const open = useCallback(
    (nextInitialQuery = "") => {
      setInitialQuery(nextInitialQuery)
      show()
    },
    [show],
  )

  useCommandPaletteHotkeys({
    isEnabled: hasHotkeys && !isVisible,
    isOpenedByTyping,
    onOpen: open,
  })

  return {
    close: hide,
    isVisible,
    open,
    paletteProps: {
      defaultQuery: initialQuery,
      isVisible,
      onClose: hide,
    },
  }
}
