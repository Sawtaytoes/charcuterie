import { useVisibility } from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"

import { Button } from "../Button/Button.tsx"
import type { ListboxItem } from "../Listbox/Listbox.tsx"
import { Combobox } from "./Combobox.tsx"

const LANGUAGES: ListboxItem[] = [
  { label: "English", value: "eng" },
  { label: "Spanish", value: "spa" },
  { label: "French", value: "fra" },
  { label: "German", value: "deu" },
  { label: "Japanese", value: "jpn" },
  { label: "Korean", value: "kor" },
  { label: "Portuguese", value: "por" },
]

// A long list, to trip the auto-virtualization threshold.
const MANY: ListboxItem[] = Array.from(
  { length: 500 },
  (_unused, index) => ({
    label: `Track ${index + 1}`,
    textValue: `Track ${index + 1}`,
    value: `track-${index + 1}`,
  }),
)

const meta = {
  title: "Components/Combobox",
  component: Combobox,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Combobox>

export default meta

type Story = StoryObj<typeof meta>

const ComboboxHarness = ({
  emptyLabel,
  error,
  footer,
  isCreatable,
  isInitiallyVisible = false,
  isLoading,
  isMultiple,
  isVirtualized,
  options,
  triggerLabel,
}: {
  emptyLabel?: string
  error?: ReactNode
  footer?: ReactNode
  isCreatable?: boolean
  isInitiallyVisible?: boolean
  isLoading?: boolean
  isMultiple?: boolean
  isVirtualized?: boolean
  options: ListboxItem[]
  triggerLabel: string
}): ReactNode => {
  const { hide, isVisible, toggle } = useVisibility({
    isVisible: isInitiallyVisible,
  })

  const [chosen, setChosen] = useState<string[]>([])

  return (
    <>
      <Combobox
        emptyLabel={emptyLabel}
        error={error}
        footer={footer}
        isCreatable={isCreatable}
        isLoading={isLoading}
        isMultiple={isMultiple}
        isVirtualized={isVirtualized}
        isVisible={isVisible}
        onDismiss={hide}
        onSelect={(value) => {
          setChosen((previous) =>
            previous.includes(value)
              ? previous.filter((one) => one !== value)
              : [...previous, value],
          )
        }}
        options={options}
        trigger={
          <Button appearance="outline" onClick={toggle}>
            {triggerLabel}
          </Button>
        }
      />

      <p className="mt-2 text-content-muted text-xs">
        Chosen: {chosen.join(", ") || "—"}
      </p>
    </>
  )
}

export const Default: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: LANGUAGES,
    trigger: <Button>Search languages</Button>,
  },
  render: () => (
    <ComboboxHarness
      options={LANGUAGES}
      triggerLabel="Search languages"
    />
  ),
}

/**
 * The loading and error panel states — the ones only `PathPicker` had
 * all of, and every fleet picker did differently. Both keep the popup
 * open.
 */
export const AllStates: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: LANGUAGES,
    trigger: <Button>Search</Button>,
  },
  render: () => (
    <div className="flex flex-col gap-8">
      <ComboboxHarness
        isLoading
        options={LANGUAGES}
        triggerLabel="Loading state"
      />

      <ComboboxHarness
        error="Could not reach the server."
        options={LANGUAGES}
        triggerLabel="Error state"
      />
    </div>
  ),
}

/**
 * Multi-select renders the chosen values as removable chips rather
 * than filling the input, with a sticky footer hint — the
 * `LanguageCodeField` and `LinkPicker` shapes. `isCreatable` lets Enter
 * commit the raw query.
 */
export const AllVariants: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: LANGUAGES,
    trigger: <Button>Pick languages</Button>,
  },
  render: () => (
    <ComboboxHarness
      footer="Type a code and press Enter to add it."
      isCreatable
      isMultiple
      options={LANGUAGES}
      triggerLabel="Pick languages"
    />
  ),
}

/**
 * Five hundred options, windowed with `@tanstack/react-virtual`: only
 * the visible rows are in the DOM, so each carries `aria-setsize` and
 * `aria-posinset` — otherwise a screen reader announces "2 of 12" for
 * a list that is nothing of the sort.
 */
export const Virtualized: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: MANY,
    trigger: <Button>Search 500 tracks</Button>,
  },
  render: () => (
    <ComboboxHarness
      isInitiallyVisible
      options={MANY}
      triggerLabel="Search 500 tracks"
    />
  ),
}

/**
 * Open it and type: the list filters as you go, arrows move the active
 * option while the caret stays in the input, Enter chooses, and Escape
 * clears the query before it closes.
 */
export const Interactive: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: LANGUAGES,
    trigger: <Button>Search languages</Button>,
  },
  render: () => (
    <ComboboxHarness
      options={LANGUAGES}
      triggerLabel="Search languages"
    />
  ),
}
