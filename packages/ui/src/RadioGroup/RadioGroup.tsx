import {
  selectTabIndex,
  useRovingFocus,
  useSinglePicker,
} from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { CSSProperties, ReactNode } from "react"
import { useCallback, useEffect, useRef } from "react"

import { toClassName } from "../toClassName.ts"
import { RadioGroupOption } from "./RadioGroupOption.tsx"

/**
 * Which shape the options are drawn in. The control is the same
 * `radiogroup` either way — this is layout, and it is a prop rather
 * than a second component because nothing about the semantics, the
 * keyboard model or the element changes with it.
 *
 *  - `row` — the default. Each option is a line of prose beside its
 *    radio, stacked down the page. The form-length list.
 *  - `tile` — each option is a bordered card carrying a name, an
 *    optional line of help and a selected surface, and the group is
 *    a grid that gains columns with the CONTAINER's width.
 */
export type RadioItemShape = "row" | "tile"

export type RadioItem = {
  /**
   * A line of help under the label. Drawn one step down the type
   * ramp in `content-muted`, inside the option's accessible name —
   * a hint a screen reader never reads is a hint half the audience
   * does not have.
   */
  hint?: ReactNode
  /**
   * Leading content, before the name. A `Badge`, an app's own icon,
   * a count. `tile` only: a row already leads with its radio, and a
   * second leading mark either side of it has nowhere to sit.
   */
  icon?: ReactNode
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
  /**
   * Draws each option as a card in a grid instead of a row in a
   * stack. Defaults to `row`.
   */
  itemShape?: RadioItemShape
  items: readonly RadioItem[]
  /**
   * Shows which option is chosen at full contrast but refuses to move
   * the choice — the arrow keys and clicks no longer select, and the
   * group announces `aria-readonly`. Focus can still travel the
   * options so a keyboard user can read them.
   */
  isReadOnly?: boolean
  /** The group's accessible name. Required. */
  label: string
  /**
   * The narrowest a tile track may be, in CSS px. `tile` only.
   *
   * It is the grid's floor and not the tile's width: tracks below it
   * are not created, and the ones that are share the row evenly.
   */
  minTileInlineSize?: number
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
 * Wider than the row gaps: rows are separated by their leading, and
 * tiles by nothing but the gap, so the same 6px that reads as a list
 * reads as a seam between two cards.
 */
const TILE_GAP_CLASS: Record<ControlSize, string> = {
  sm: "gap-1.5",
  md: "gap-2",
  lg: "gap-3",
}

/**
 * `auto-fill`, and deliberately not `auto-fit`.
 *
 * `auto-fit` collapses the empty tracks and lets the ones that
 * remain share the whole row, so six tiles in a 2560px container
 * become six 420px slabs — the full-width-row shape in a new
 * costume. `auto-fill` keeps the empty tracks, so a tile stays a
 * tile and the grid simply has room to spare.
 *
 * `min(…, 100%)` is what stops the floor overflowing a container
 * narrower than one tile, which is the Narrow View and is otherwise
 * a horizontal scrollbar on a phone.
 *
 * The floor arrives as a custom property rather than an interpolated
 * class because Tailwind scans source *text* for complete class
 * strings: `` `grid-cols-[…${n}px…]` `` generates nothing, paints
 * nothing and reports nothing. One written-out literal reading
 * `var(--charcuterie-tile-min-inline-size)` covers every width an
 * app can ask for — the same reason `Card`'s accent edge goes
 * through one property.
 *
 * This is **not** `useAdaptiveColumns`, and the difference is the
 * question being asked. That hook buys a column with height, for an
 * unbounded gallery that will scroll; a radio group is a bounded set
 * of options inside a form section, where the only question is how
 * many fit across the box it was given.
 */
const TILE_COLUMNS_CLASS =
  "grid-cols-[repeat(auto-fill,minmax(min(var(--charcuterie-tile-min-inline-size),100%),1fr))]"

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
 *
 * ### `itemShape="tile"` is the choice tile
 *
 * A bordered card carrying a name, a line of help and a selected
 * surface, in a grid that gains columns with its container. It is a
 * prop and not a third component because **only the box changes**:
 * the element, the role, the roving tabindex, selection-follows-focus
 * and `isReadOnly` are the ones already tested here. `SegmentedControl`
 * earns its own file by being a different control — one connected
 * strip, no radio affordance; a tile is this control with a border.
 */
export const RadioGroup = ({
  className,
  itemShape = "row",
  items,
  isReadOnly = false,
  label,
  minTileInlineSize = 200,
  onChange,
  selectedValue,
  size = "md",
}: RadioGroupProps): ReactNode => {
  const groupRef = useRef<HTMLDivElement>(null)

  const optionElements = useRef(
    new Map<string, HTMLButtonElement>(),
  )

  const isTile = itemShape === "tile"

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
      // Focus may still land on the option so it can be read; only the
      // choice is frozen when read-only.
      setActiveValue(value)

      if (!isReadOnly) {
        select(value)
      }
    },
    [isReadOnly, select, setActiveValue],
  )

  useEffect(() => {
    // Selection follows focus — the radio-group rule, and the one
    // line a `manual` mode this component deliberately lacks would
    // remove. Read-only severs exactly this link: focus still travels
    // for reading, but moving it no longer moves the choice.
    if (activeValue !== null && !isReadOnly) {
      select(activeValue)
    }
  }, [activeValue, isReadOnly, select])

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
      aria-readonly={isReadOnly || undefined}
      className={toClassName(
        isTile
          ? toClassName("grid", TILE_COLUMNS_CLASS)
          : "flex flex-col",
        isTile ? TILE_GAP_CLASS[size] : GAP_CLASS[size],
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
        // command, not a second code path — and read-only skips it.
        if (
          keyEvent.key === " " &&
          activeValue !== null &&
          !isReadOnly
        ) {
          keyEvent.preventDefault()

          select(activeValue)
        }
      }}
      ref={groupRef}
      style={
        isTile
          ? ({
              "--charcuterie-tile-min-inline-size": `${minTileInlineSize}px`,
            } as CSSProperties)
          : undefined
      }
      role="radiogroup"
    >
      {items.map((item) => (
        <RadioGroupOption
          isChecked={checkedValue === item.value}
          isReadOnly={isReadOnly}
          item={item}
          itemShape={itemShape}
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
