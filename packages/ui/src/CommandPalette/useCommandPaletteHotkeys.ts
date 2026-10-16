import { useLatestRef } from "@charcuterie/logic"
import { useEffect } from "react"

export type CommandPaletteHotkeysOptions = {
  /** Off while the palette is open, or on a page that should not take the keys. Default `true`. */
  isEnabled?: boolean
  /**
   * A printable key typed outside an editable field opens the palette
   * with that character as the query. Default `true`.
   */
  isOpenedByTyping?: boolean
  /** Receives the text the palette should open with: `""`, or the character typed. */
  onOpen: (initialQuery: string) => void
}

/**
 * Elements that keep their keys: anything you type into, and the
 * widgets with their own type-to-find (a focused `Listbox` or `Menu`
 * jumps to the option you type, and stealing that key breaks it).
 */
const TYPEAHEAD_OWNER_SELECTOR = [
  "input",
  "textarea",
  "select",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='combobox']",
  "[role='grid']",
  "[role='listbox']",
  "[role='menu']",
  "[role='menubar']",
  "[role='searchbox']",
  "[role='textbox']",
  "[role='tree']",
  "[role='treegrid']",
].join(",")

/** Input types that take no text, so a letter typed on one is free to open the palette. */
const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
])

export const getIsTypingTarget = (
  target: EventTarget | null,
): boolean => {
  if (!(target instanceof Element)) {
    return false
  }

  if (
    target instanceof HTMLInputElement &&
    NON_TEXT_INPUT_TYPES.has(target.type)
  ) {
    return false
  }

  return (
    (target instanceof HTMLElement &&
      target.isContentEditable) ||
    target.closest(TYPEAHEAD_OWNER_SELECTOR) !== null
  )
}

/**
 * The global keys that open a command palette, as an opt-in hook.
 *
 * - **`Ctrl K`, `Ctrl Space`** (or `⌘` on a Mac) open it from
 *   anywhere, a text field included — the chord types nothing.
 * - **`/`** opens it when focus is not somewhere that types, and
 *   the slash itself is not typed.
 * - **Any printable key** does the same and becomes the query, so
 *   the page is a search box without a click (`isOpenedByTyping`).
 *
 * It is a hook, not something `CommandPalette` does on mount,
 * because a document-wide key listener is a page-level decision: an
 * app with two palettes, or a page where letters already mean
 * something (a board with its own shortcuts), must be able to say
 * no. See
 * `docs/decisions/2026-10-16-command-palette-hotkeys-are-an-opt-in-hook.md`.
 *
 * A key another handler already claimed (`defaultPrevented`), a key
 * pressed during IME composition, and a key with `Alt` held are all
 * left alone.
 */
export const useCommandPaletteHotkeys = ({
  isEnabled = true,
  isOpenedByTyping = true,
  onOpen,
}: CommandPaletteHotkeysOptions): void => {
  const onOpenRef = useLatestRef(onOpen)

  useEffect(() => {
    if (!isEnabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey
      ) {
        return
      }

      const isChord = event.ctrlKey || event.metaKey

      if (isChord) {
        if (
          !event.shiftKey &&
          (event.key.toLowerCase() === "k" ||
            event.key === " ")
        ) {
          event.preventDefault()
          onOpenRef.current("")
        }

        return
      }

      if (getIsTypingTarget(event.target)) {
        return
      }

      if (event.key === "/") {
        event.preventDefault()
        onOpenRef.current("")

        return
      }

      // `key` is the character for a printable key and a name
      // ("Enter", "ArrowDown") for everything else; a space is
      // printable but presses the focused button.
      if (
        isOpenedByTyping &&
        [...event.key].length === 1 &&
        /\S/u.test(event.key)
      ) {
        event.preventDefault()
        onOpenRef.current(event.key)
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isEnabled, isOpenedByTyping, onOpenRef])
}
