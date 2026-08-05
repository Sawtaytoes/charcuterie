import {
  selectTabIndex,
  useRovingFocus,
  useSinglePicker,
} from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useCallback, useEffect, useRef } from "react"

import { toClassName } from "../toClassName.ts"
import { RadioGroupOption } from "./RadioGroupOption.tsx"

export type RadioItem = {
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

export type RadioGroupProps = {
  className?: string
  items: readonly RadioItem[]
  /** The group's accessible name. Required. */
  label: string
  onChange?: (selectedValue: string | null) => void
  /** **Initial** only. Charcuterie owns it from then on. */
  selectedValue?: string
  size?: ControlSize
}

const GAP_CLASS: Record<ControlSize, string> = {
  sm: "gap-1",
  md: "gap-1.5",
  lg: "gap-2",
}

/**
 * One choice out of many, each on its own row with a label the size
 * of prose — the stacked sibling of `SegmentedControl`.
 *
 * The two are the *same* composition — `SinglePicker` + `RovingFocus`,
 * a `radiogroup` of `radio`s where selection follows focus — and a
 * different shape. `SegmentedControl` is a compact strip for a
 * handful of short options that share a control row; `RadioGroup` is
 * the form-length list where each option carries a real sentence and
 * an in-line strip would wrap. Picking between them is layout, not
 * behaviour, which is why the keyboard model here is identical and
 * lives in the same two hooks.
 *
 * ### `radiogroup`, not a stack of checkboxes
 *
 * A column of `<input type="checkbox">` is the **independent
 * toggles** pattern: nothing says the options are mutually
 * exclusive, and a screen reader never announces "1 of 4". A single
 * choice from a named set is a radio group, and its arrow keys both
 * move focus and check — APG's one activation mode, the same reason
 * `SegmentedControl` has no `manual` prop.
 */
export const RadioGroup = ({
  className,
  items,
  label,
  onChange,
  selectedValue,
  size = "md",
}: RadioGroupProps): ReactNode => {
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
    // line a `manual` mode this component deliberately lacks would
    // remove.
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
        "flex flex-col",
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

        // Space checks the focused option. Selection already follows
        // focus, so this is almost always a no-op — one idempotent
        // command, not a second code path.
        if (keyEvent.key === " " && activeValue !== null) {
          keyEvent.preventDefault()

          select(activeValue)
        }
      }}
      ref={groupRef}
      role="radiogroup"
    >
      {items.map((item) => (
        <RadioGroupOption
          isChecked={checkedValue === item.value}
          item={item}
          key={item.value}
          onChoose={chooseOption}
          registerFocus={focus.register}
          registerSelection={selection.register}
          size={size}
          // The roving-tabindex rule read from the core rather than
          // restated here: exactly one option is in the tab order, so
          // Tab enters and leaves the group once.
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
