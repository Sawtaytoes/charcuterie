import {
  selectTabIndex,
  useRovingFocus,
  useSinglePicker,
} from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useCallback, useEffect, useRef } from "react"

import { toClassName } from "../toClassName.ts"
import { SegmentedOption } from "./SegmentedOption.tsx"

export type SegmentedItem = {
  /**
   * A disabled option is simply **not registered** with the roving
   * group, so the arrow keys skip it without any command in
   * `RovingFocus` having to know what "disabled" means. It stays
   * registered with the picker: it is still one of the options.
   */
  isDisabled?: boolean
  label: ReactNode
  value: string
}

export type SegmentedControlProps = {
  className?: string
  /**
   * Fill the available inline space, with every option claiming an
   * equal share. A board's Narrow View selector needs this: its
   * options name the only lane on screen, so a content-width strip
   * leaves the rest of the board looking disconnected.
   *
   * The default stays content-width. Most segmented controls choose
   * a compact view or density, where stretching three short words
   * across a whole toolbar would weaken their grouping.
   */
  isFullWidth?: boolean
  items: readonly SegmentedItem[]
  /** The group's accessible name. Required. */
  label: string
  onChange?: (selectedValue: string | null) => void
  /** **Initial** only. Charcuterie owns it from then on. */
  selectedValue?: string
  size?: ControlSize
}

const GAP_CLASS: Record<ControlSize, string> = {
  sm: "gap-0.5",
  md: "gap-1",
  lg: "gap-1",
}

/**
 * One choice out of a handful, all of them on screen at once.
 *
 * This is `Tabs`' composition — `SinglePicker` + `RovingFocus` —
 * with the panels taken away, and it exists because taking the
 * panels away used to be impossible. Under M4's model a tab bar's
 * selection *was* a group of visibilities, so a control that chooses
 * something without revealing anything had nothing to reuse and
 * hand-rolled its own state. rip-deck's `ColumnPicker` is that
 * hand-roll
 * ([decision](../../../docs/decisions/2026-07-30-tab-selection-is-a-single-picker.md)).
 *
 * ### `radiogroup`, not a row of pressed buttons
 *
 * rip-deck's version is five `<button aria-pressed>` in a
 * `<fieldset>`, which is the **toolbar of independent toggles**
 * pattern: nothing in it says the five are mutually exclusive, so a
 * screen reader announces "auto, pressed" with no "1 of 5" and no
 * clue that pressing another un-presses this one. A single choice
 * from a named set is a radio group, and ARIA has a pattern for it.
 *
 * ### Selection follows focus, and here that is correct
 *
 * `Tabs` has two activation modes because a tab panel can cost a
 * network request. A radio group has one: APG says the arrow keys
 * both move focus and check, and there is nothing behind an option
 * here to be expensive. So the mode is `automatic` and there is no
 * prop — a `manual` segmented control would be a control the arrow
 * keys appear to do nothing in.
 *
 * The two kinds are still separate underneath, which is what makes
 * Space's behaviour trivial rather than a special case: it checks
 * whatever focus is on, whether or not focus moved there by arrow.
 */
export const SegmentedControl = ({
  className,
  isFullWidth = false,
  items,
  label,
  onChange,
  selectedValue,
  size = "md",
}: SegmentedControlProps): ReactNode => {
  const groupRef = useRef<HTMLDivElement>(null)

  const optionElements = useRef(
    new Map<string, HTMLButtonElement>(),
  )

  const initialValue =
    selectedValue ??
    items.find((one) => !one.isDisabled)?.value ??
    null

  const selection = useSinglePicker<string>({
    onChange,
    selectedValue: initialValue,
  })

  const focus = useRovingFocus<string>({
    activeValue: initialValue,
  })

  const { select } = selection

  const { activeValue, setActiveValue } = focus

  /**
   * Selected **or** pending. Members register from an effect, so on
   * the first paint `selectedValue` is still null and the intent
   * lives in `pendingValue` — reading only the former renders a
   * group with nothing checked, then corrects itself a frame later.
   * A flash on a desktop; a visible blank on a kiosk Pi.
   */
  const checkedValue =
    selection.selectedValue ?? selection.pendingValue

  const chooseOption = useCallback(
    (value: string) => {
      setActiveValue(value)

      select(value)
    },
    [select, setActiveValue],
  )

  useEffect(() => {
    // Selection follows focus — the radio-group rule, and the one
    // line that would be absent in a `manual` mode this component
    // deliberately does not have.
    if (activeValue !== null) {
      select(activeValue)
    }
  }, [activeValue, select])

  useEffect(() => {
    const group = groupRef.current

    if (
      !group ||
      activeValue === null ||
      !group.contains(document.activeElement)
    ) {
      return
    }

    optionElements.current.get(activeValue)?.focus()
  }, [activeValue])

  return (
    <div
      aria-label={label}
      className={toClassName(
        "inline-flex items-center rounded-md border border-border-subtle bg-surface-sunken p-0.5",
        isFullWidth && "w-full",
        GAP_CLASS[size],
        className,
      )}
      onKeyDown={(keyEvent) => {
        const commands: Record<string, () => void> = {
          ArrowDown: focus.next,
          ArrowLeft: focus.previous,
          ArrowRight: focus.next,
          ArrowUp: focus.previous,
          End: focus.last,
          Home: focus.first,
        }

        const command = commands[keyEvent.key]

        if (command) {
          // Arrow keys scroll the page by default, and a control
          // that scrolls the window while it moves focus is the
          // hand-rolled version of this component.
          keyEvent.preventDefault()

          command()

          return
        }

        // Space checks the focused option. In a group where
        // selection already follows focus this is almost always a
        // no-op — which is the point: it is one command, not a
        // second code path, because `select` is idempotent.
        if (keyEvent.key === " " && activeValue !== null) {
          keyEvent.preventDefault()

          select(activeValue)
        }
      }}
      ref={groupRef}
      role="radiogroup"
    >
      {items.map((item) => (
        <SegmentedOption
          isChecked={checkedValue === item.value}
          isFullWidth={isFullWidth}
          item={item}
          key={item.value}
          onChoose={chooseOption}
          registerFocus={focus.register}
          registerSelection={selection.register}
          size={size}
          // The roving-tabindex rule read from the core rather than
          // restated here: exactly one option is in the tab order,
          // so Tab enters and leaves the group once while the arrow
          // keys move inside it.
          tabIndex={selectTabIndex(focus, item.value)}
          trackElement={(value, element) => {
            if (element) {
              optionElements.current.set(value, element)
            } else {
              optionElements.current.delete(value)
            }
          }}
        />
      ))}
    </div>
  )
}
