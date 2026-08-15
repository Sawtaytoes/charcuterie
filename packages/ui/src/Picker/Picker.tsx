import { useVisibility } from "@charcuterie/logic"
import type {
  ControlSize,
  IntentName,
} from "@charcuterie/tokens"
import type { Placement } from "@floating-ui/react"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { Button } from "../Button/Button.tsx"
import type { IntentAppearance } from "../intentStyles.ts"
import type { ListboxItem } from "../Listbox/Listbox.tsx"
import { Listbox } from "../Listbox/Listbox.tsx"

export type PickerOption = ListboxItem

/**
 * A constant element rather than a component, for the same reason
 * `Select` inlines its own: a second component in this file trips the
 * house rule, and this never varies.
 */
const CHEVRON_DOWN = (
  <svg
    aria-hidden="true"
    className="size-4"
    fill="none"
    focusable={false}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.75}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export type PickerProps = Omit<
  ComponentPropsWithRef<"button">,
  "disabled" | "onChange" | "value"
> & {
  appearance?: IntentAppearance
  className?: string
  intent?: IntentName
  isDisabled?: boolean
  /**
   * What the control is FOR — "Language", "Quantifier", "Rule type".
   * Not the current value; that is read off `options`.
   */
  label: string
  /**
   * Defaults to a chevron. Pass `null` to drop it — a picker rendered
   * inside a denser control row may not want the affordance, and a
   * refactor moving an existing hand-rolled trigger onto `Picker`
   * stays pixel-identical by passing `null` rather than re-baselining
   * every screenshot that contains it.
   */
  iconEnd?: ReactNode
  onChange: (value: string) => void
  options: readonly PickerOption[]
  placement?: Placement
  /** Read by the trigger when `value` matches no option. */
  placeholder?: string
  size?: ControlSize
  value?: string
}

/**
 * A `Listbox` with the trigger already attached — the shape every app
 * reaches for when it wants "a select, but ours".
 *
 * ### Four repos wrote this, and the fourth is this package
 *
 * `Listbox` is deliberately trigger-agnostic: it takes a `trigger`
 * element and owns none of the open state, which is what lets it hang
 * off a button, a tile, a table header. The cost is that the *common*
 * case — a button showing the current value — is about thirty lines,
 * and the fleet wrote them four times: queuepilot's `SelectListbox`,
 * board-games' `SelectMenu` (on `useState` rather than
 * `useVisibility`), mux-magic's `ListboxPicker`, and — the tell —
 * **twice inside this package**, in `QueryBuilderCombinator` and in
 * `QueryBuilder`'s own story. Each also hand-rolled the same chevron.
 *
 * `Listbox` stays exactly as it is. This is the assembled default.
 *
 * ### Why it is not called `SinglePicker`
 *
 * The state layer has `useSinglePicker` and `useMultiplePicker`, so a
 * name near "picker" invites the question of whether this is their
 * component. It is not, and no component is: `useSinglePicker` is a
 * state kind that `Listbox`, `Combobox` and `Tabs` all compose. This
 * component owns a `useVisibility` and delegates selection to
 * `Listbox`, which is where the picker state actually lives. The name
 * is the owner's, chosen over `SelectListbox` and `ListboxButton`.
 *
 * ### The accessible name carries the current value
 *
 * `"Language: English"`, not `"Language"`. The trigger's visible text
 * IS the current value, and WCAG 2.5.3 requires the visible text to be
 * contained in the accessible name — so a bare `aria-label={label}`
 * fails it, which is a latent defect in one of the hand-rolled
 * versions this replaces. It also makes each control uniquely findable
 * when a form has several, which is the property `expectAgentDrivable`
 * exists to protect.
 *
 * Query it as `getByRole("button", { name: /^Language: / })`.
 *
 * ### `id` survives — it did not always
 *
 * `useAnchoredOverlay` used to overwrite the trigger's `id` with a
 * generated one so the portalled listbox could point `aria-labelledby`
 * across at it. That silently broke `Field`, which renders
 * `<label htmlFor>` against an id it clones onto its child: the label
 * pointed at nothing for every overlay control in a `Field`. The hook
 * now prefers the trigger's own id and mints one only when absent, so
 * both the label and the panel name the same element.
 *
 * `data-testid` remains the sturdier e2e handle — queuepilot and
 * mux-magic both moved to it while `id` was still being replaced — but
 * `id` is no longer a trap. Everything else on the button (`data-*`,
 * `onClick`, `form`, …) passes straight through.
 */
export const Picker = ({
  appearance = "outline",
  className,
  iconEnd = CHEVRON_DOWN,
  intent = "neutral",
  isDisabled = false,
  label,
  onChange,
  options,
  placement,
  placeholder,
  size,
  value,
  ...buttonProps
}: PickerProps): ReactNode => {
  const { hide, isVisible, toggle } = useVisibility()

  const currentOption = options.find(
    (option) => option.value === value,
  )

  const currentText =
    currentOption === undefined
      ? placeholder
      : (currentOption.textValue ??
        (typeof currentOption.label === "string"
          ? currentOption.label
          : undefined))

  const triggerText = currentText ?? placeholder ?? ""

  return (
    <Listbox
      // A disabled control must not open, and hiding the panel is a
      // truer way to say that than trusting the trigger's click alone —
      // Escape and outside-press both route through `onDismiss`.
      isVisible={isVisible && !isDisabled}
      onDismiss={hide}
      onSelect={onChange}
      options={options}
      placement={placement}
      selectedValue={value}
      trigger={
        <Button
          {...buttonProps}
          appearance={appearance}
          aria-label={`${label}: ${triggerText}`}
          className={className}
          iconEnd={iconEnd}
          intent={intent}
          isDisabled={isDisabled}
          onClick={(clickEvent) => {
            buttonProps.onClick?.(clickEvent)

            toggle()
          }}
          size={size}
          type="button"
        >
          {currentOption === undefined
            ? placeholder
            : currentOption.label}
        </Button>
      }
    />
  )
}
