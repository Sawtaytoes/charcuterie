import {
  selectTabIndex,
  useRovingFocus,
  useSinglePicker,
} from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { Placement } from "@floating-ui/react"
import {
  FloatingFocusManager,
  FloatingPortal,
} from "@floating-ui/react"
import type { ReactElement, ReactNode } from "react"
import { useEffect, useRef } from "react"

import { PANEL_SURFACE_CLASS } from "../Overlay/overlayPanelClass.ts"
import { useAnchoredOverlay } from "../Overlay/useAnchoredOverlay.ts"
import { usePanelItemSize } from "../Overlay/usePanelItemSize.ts"
import { toClassName } from "../toClassName.ts"
import { ListboxOption } from "./ListboxOption.tsx"

export type ListboxItem = {
  isDisabled?: boolean
  label: ReactNode
  /**
   * Required when `label` is rich (an icon, two lines, a badge): it is
   * the type-ahead target and the accessible name a screen reader
   * reads. When `label` is a plain string it is used as the fallback.
   */
  textValue?: string
  value: string
}

export type ListboxProps = {
  className?: string
  isVisible: boolean
  /**
   * How tall each option is, from the same density-aware tokens a
   * `Button` reads — so a `md` option is exactly as tall as the `md`
   * trigger that opened it. `lg` is the fat one: 2.75rem at
   * `comfortable` density, and a bigger target to aim at.
   *
   * A short window steps it back down on its own
   * (`usePanelItemSize`), so a `lg` list is never the reason the last
   * option is off-screen.
   */
  itemSize?: ControlSize
  /** Outside press and Escape both land here. */
  onDismiss: () => void
  onSelect: (value: string) => void
  options: readonly ListboxItem[]
  placement?: Placement
  /** The initial seed. The live selection is the listbox's after that. */
  selectedValue?: string
  /** The control the listbox hangs off. **Cloned, not wrapped.** */
  trigger: ReactElement
}

const getOptionText = (item: ListboxItem) =>
  (
    item.textValue ??
    (typeof item.label === "string" ? item.label : "")
  ).toLowerCase()

/**
 * The single-select fancy dropdown — the rich-option sibling of the
 * native `Select`. `Select` keeps type-ahead, the mobile wheel, form
 * submission and autofill; `Listbox` is for the cases `<option>`
 * cannot render: an icon, two lines, a trailing badge.
 *
 * A listbox is **not** a menu, and that distinction is the whole
 * reason it is a separate component from `Menu`. An `option` *is*
 * something you are choosing — so it carries `aria-selected`, it
 * type-aheads (which the APG requires of a listbox and `Menu`
 * deliberately omits), and a screen reader announces "listbox,
 * selected, 2 of 4". A `menuitem` only ever *does* something.
 *
 * ### Two kinds of state, composed
 *
 * `useRovingFocus` owns which option is tabbable (exactly one, so Tab
 * enters and leaves the group once and the arrow keys move within it),
 * and `useSinglePicker` owns which option is chosen. They are the same
 * two kinds `Tabs` composes, and they never disturb each other:
 * arrowing moves focus without selecting, Enter selects the focused
 * option.
 *
 * ### Portalled, and named by its trigger
 *
 * Like `Menu`, the panel portals to `document.body` and `useRole` names
 * it by pointing `aria-labelledby` at the trigger — so there is no
 * `heading` prop; the button that opens it is its label.
 */
export const Listbox = ({
  className,
  isVisible,
  itemSize: requestedItemSize = "md",
  onDismiss,
  onSelect,
  options,
  placement = "bottom-start",
  selectedValue,
  trigger,
}: ListboxProps): ReactNode => {
  const itemSize = usePanelItemSize(requestedItemSize)

  const optionElements = useRef(
    new Map<string, HTMLButtonElement>(),
  )

  const typeahead = useRef({ buffer: "", stampMs: 0 })

  const focus = useRovingFocus<string>()

  const picker = useSinglePicker<string>({ selectedValue })

  const { activeValue, registeredValues, setActiveValue } =
    focus

  const [firstValue] = registeredValues

  const {
    clonedTrigger,
    context,
    floatingStyles,
    getFloatingProps,
    setFloating,
    triggerId,
  } = useAnchoredOverlay({
    isVisible,
    maxHeightPx: 384,
    offsetValue: 4,
    onDismiss,
    placement,
    role: "listbox",
    trigger,
  })

  const chooseValue = (value: string) => {
    picker.select(value)

    onSelect(value)

    // A single choice closes, the way the native `<select>` it stands
    // in for does — the consumer's `onDismiss` is the same one an
    // outside press and Escape use.
    onDismiss()
  }

  /**
   * Opening lands the focus on the chosen option, or the first when
   * nothing is chosen yet — the APG rule for a listbox, and the reason
   * a reopened one resumes on the current value rather than the top.
   */
  useEffect(() => {
    if (!isVisible) {
      return
    }

    const seed = picker.selectedValue ?? firstValue

    if (seed !== undefined && seed !== null) {
      setActiveValue(seed)
    }
  }, [
    firstValue,
    isVisible,
    picker.selectedValue,
    setActiveValue,
  ])

  useEffect(() => {
    if (!isVisible || activeValue === null) {
      return
    }

    optionElements.current.get(activeValue)?.focus()
  }, [activeValue, isVisible])

  const runTypeahead = (character: string) => {
    // Reset the buffer once the typing pauses, so "sk" then a beat
    // then "e" is two searches rather than "ske".
    const now = Date.now()

    typeahead.current.buffer =
      now - typeahead.current.stampMs > 500
        ? character
        : typeahead.current.buffer + character

    typeahead.current.stampMs = now

    const query = typeahead.current.buffer.toLowerCase()

    const match = options.find(
      (option) =>
        !option.isDisabled &&
        getOptionText(option).startsWith(query),
    )

    if (match) {
      setActiveValue(match.value)
    }
  }

  return (
    <>
      {clonedTrigger}

      {isVisible ? (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            initialFocus={-1}
            modal={false}
          >
            <div
              {...getFloatingProps()}
              // A bare `role="listbox"` is an ARIA input field and must
              // be named; pointing at the trigger across the portal is
              // the same link `useRole` makes for a `Menu`.
              aria-labelledby={triggerId}
              className={toClassName(
                PANEL_SURFACE_CLASS,
                // The height is clamped to the viewport by the `size`
                // middleware (`maxHeightPx`), written as an inline
                // style; this scrolls within it.
                "z-[var(--layer-modal)] flex min-w-48 flex-col gap-0.5 overflow-auto p-1",
                className,
              )}
              onKeyDown={(keyEvent) => {
                const commands: Record<string, () => void> =
                  {
                    ArrowDown: focus.next,
                    ArrowUp: focus.previous,
                    End: focus.last,
                    Home: focus.first,
                  }

                const command = commands[keyEvent.key]

                if (command) {
                  keyEvent.preventDefault()

                  command()

                  return
                }

                if (
                  (keyEvent.key === "Enter" ||
                    keyEvent.key === " ") &&
                  activeValue !== null
                ) {
                  keyEvent.preventDefault()

                  chooseValue(activeValue)

                  return
                }

                // Type-ahead: a single printable character with no
                // modifier is a search, not a shortcut.
                if (
                  keyEvent.key.length === 1 &&
                  !keyEvent.altKey &&
                  !keyEvent.ctrlKey &&
                  !keyEvent.metaKey
                ) {
                  runTypeahead(keyEvent.key)
                }
              }}
              ref={setFloating}
              // Duplicated from `getFloatingProps()` on purpose, and
              // the two cannot differ — `useRole(context, { role:
              // "listbox" })` in the hook is where it comes from.
              // Stated here because a linter cannot see a role through
              // a spread.
              role="listbox"
              style={floatingStyles}
            >
              {options.map((option) => (
                <ListboxOption
                  isSelected={
                    picker.selectedValue === option.value
                  }
                  item={option}
                  itemSize={itemSize}
                  key={option.value}
                  onSelect={chooseValue}
                  registerFocus={focus.register}
                  registerSelection={picker.register}
                  tabIndex={selectTabIndex(
                    focus,
                    option.value,
                  )}
                  trackElement={(value, element) => {
                    if (element) {
                      optionElements.current.set(
                        value,
                        element,
                      )
                    } else {
                      optionElements.current.delete(value)
                    }
                  }}
                />
              ))}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  )
}
