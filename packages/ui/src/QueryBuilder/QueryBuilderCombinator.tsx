import { useVisibility } from "@charcuterie/logic"
import type { ReactNode } from "react"

import { Button } from "../Button/Button.tsx"
import { Listbox } from "../Listbox/Listbox.tsx"

export type QueryBuilderCombinatorProps<Combinator> = {
  /** The visible caption above the control, e.g. "Match". */
  label: string
  onChange: (combinator: Combinator) => void
  options: readonly {
    label: string
    value: Combinator
  }[]
  value: Combinator
}

/**
 * One group's combinator picker.
 *
 * A `Listbox`, not a native `Select`, per
 * [the 2026-08-10 demotion](../../../../docs/decisions/2026-08-10-listbox-and-combobox-are-the-default-and-select-is-demoted.md).
 * `QueryBuilder` shipped in #84 with a `Select` the day after that
 * record landed; `charcuterie/prefer-listbox-over-select` did not
 * catch it because the component-choice block is scoped to app
 * packages and exempts this one — right for a primitive, wrong for a
 * composite an app consumes whole.
 *
 * ### Why this is its own file
 *
 * `Listbox` needs a visibility state, and a group renders one picker
 * per group inside a recursive `.map`. A hook cannot be called there,
 * so the picker becomes a component — the same member-file case as
 * `QueryBuilderRow`.
 *
 * ### The name, and why it is not a `Field`
 *
 * `Field` wires `<label htmlFor>` by cloning its `id` onto the
 * control. `Listbox`'s trigger cannot take one: `useAnchoredOverlay`
 * overwrites the cloned trigger's `id` with the one the panel points
 * `aria-labelledby` at, so the label would address an element that no
 * longer carries that id — the exact defect `Field` exists to
 * prevent. So the caption is plain text and the trigger is named with
 * `aria-label`.
 *
 * That name is `"<label>: <current value>"` rather than bare
 * `"<label>"` on purpose: the button's visible text is the current
 * combinator, and WCAG 2.5.3 wants the visible text contained in the
 * accessible name. "Match" alone would fail it; "Match: ALL — every
 * condition" reads correctly and keeps each group's control findable
 * by name.
 *
 * The combinator stays opaque here exactly as it is in the rest of
 * the component: `String(value)` bridges it to the string-valued
 * `Listbox`, and a selection is mapped back to the real `Combinator`
 * before it leaves.
 */
export const QueryBuilderCombinator = <Combinator,>({
  label,
  onChange,
  options,
  value,
}: QueryBuilderCombinatorProps<Combinator>): ReactNode => {
  const { hide, isVisible, toggle } = useVisibility()

  const currentOption = options.find(
    (option) => String(option.value) === String(value),
  )

  const currentLabel = currentOption?.label ?? ""

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-content-primary text-sm">
        {label}
      </span>

      <Listbox
        isVisible={isVisible}
        onDismiss={hide}
        onSelect={(nextValue) => {
          const match = options.find(
            (option) => String(option.value) === nextValue,
          )

          if (match) {
            onChange(match.value)
          }
        }}
        options={options.map((option) => ({
          label: option.label,
          value: String(option.value),
        }))}
        selectedValue={String(value)}
        trigger={
          <Button
            appearance="outline"
            aria-label={`${label}: ${currentLabel}`}
            intent="neutral"
            onClick={toggle}
          >
            {currentLabel}
          </Button>
        }
      />
    </div>
  )
}
