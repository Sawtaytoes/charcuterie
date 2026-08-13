import type { ReactNode } from "react"

import { Picker } from "../Picker/Picker.tsx"

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
 * A `Picker` — a `Listbox` with its trigger attached — rather than a
 * native `Select`, per
 * [the 2026-08-10 demotion](../../../../docs/decisions/2026-08-10-listbox-and-combobox-are-the-default-and-select-is-demoted.md).
 * This file used to assemble the trigger by hand; `Picker` exists
 * because it was the fourth place in the fleet doing so.
 *
 * ### What is left here, and why it is still a component
 *
 * Only the bridging. `Combinator` is opaque to `QueryBuilder`, so it
 * cannot reach `Picker`'s string-valued API directly: `String(value)`
 * carries it out and the matching option carries it back, so the
 * generic never leaks. The caption is plain text rather than a
 * `Field`, because `useAnchoredOverlay` overwrites the trigger's `id`
 * and a `<label htmlFor>` would then address an element that no longer
 * carries it — the exact defect `Field` exists to prevent.
 */
export const QueryBuilderCombinator = <Combinator,>({
  label,
  onChange,
  options,
  value,
}: QueryBuilderCombinatorProps<Combinator>): ReactNode => (
  <div className="flex flex-col gap-1.5">
    <span className="font-medium text-content-primary text-sm">
      {label}
    </span>

    <Picker
      // No chevron: this is a refactor onto the shared component, and
      // the trigger that shipped in 2.14.0 had none. Adding the
      // affordance here is a visual change and belongs in its own PR,
      // not smuggled in under an extraction.
      iconEnd={null}
      label={label}
      onChange={(nextValue) => {
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
      value={String(value)}
    />
  </div>
)
