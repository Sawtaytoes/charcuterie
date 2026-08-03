import { useVisibility } from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"

import { placementArgType } from "../argTypes.storyHelpers.ts"
import { Badge } from "../Badge/Badge.tsx"
import { Button } from "../Button/Button.tsx"
import { StoryRow } from "../board.storyHelpers.tsx"
import type { ListboxItem } from "./Listbox.tsx"
import { Listbox } from "./Listbox.tsx"

const LANGUAGES: ListboxItem[] = [
  { label: "English", value: "eng" },
  { label: "Spanish", value: "spa" },
  { label: "French", value: "fra" },
  { isDisabled: true, label: "German", value: "deu" },
  { label: "Japanese", value: "jpn" },
]

/**
 * The rich options a native `<option>` cannot render — a leading
 * flag, a two-line detail, a trailing confidence badge — each with a
 * `textValue` so type-ahead and the accessible name still work.
 */
const TRACKS: ListboxItem[] = [
  {
    label: (
      <span className="flex items-center gap-2">
        <span aria-hidden="true">🇬🇧</span>
        <span className="flex flex-col">
          <span>English</span>
          <span className="text-content-muted text-xs">
            5.1 · forced
          </span>
        </span>
      </span>
    ),
    textValue: "English",
    value: "eng",
  },
  {
    label: (
      <span className="flex items-center gap-2">
        <span aria-hidden="true">🇯🇵</span>
        <span className="flex flex-col">
          <span>Japanese</span>
          <span className="text-content-muted text-xs">
            2.0 · original
          </span>
        </span>
      </span>
    ),
    textValue: "Japanese",
    value: "jpn",
  },
  {
    label: (
      <span className="flex items-center gap-2">
        <span aria-hidden="true">🇫🇷</span>
        <span>French</span>
        <Badge intent="warning" size="sm">
          low confidence
        </Badge>
      </span>
    ),
    textValue: "French",
    value: "fra",
  },
]

const meta = {
  title: "Components/Listbox",
  component: Listbox,
  parameters: { layout: "padded" },
  argTypes: { placement: placementArgType },
  args: { placement: "bottom-start" },
} satisfies Meta<typeof Listbox>

export default meta

type Story = StoryObj<typeof meta>

const ListboxHarness = ({
  initialSelected,
  options,
  triggerLabel,
}: {
  initialSelected?: string
  options: ListboxItem[]
  triggerLabel: string
}): ReactNode => {
  const { hide, isVisible, toggle } = useVisibility()

  const [selected, setSelected] = useState<
    string | undefined
  >(initialSelected)

  const current = options.find(
    (option) => option.value === selected,
  )

  const label =
    current === undefined
      ? triggerLabel
      : (current.textValue ??
        (typeof current.label === "string"
          ? current.label
          : triggerLabel))

  return (
    <Listbox
      isVisible={isVisible}
      onDismiss={hide}
      onSelect={setSelected}
      options={options}
      selectedValue={selected}
      trigger={
        <Button appearance="outline" onClick={toggle}>
          {label}
        </Button>
      }
    />
  )
}

export const Default: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: LANGUAGES,
    trigger: <Button>Choose a language</Button>,
  },
  render: () => (
    <ListboxHarness
      options={LANGUAGES}
      triggerLabel="Choose a language"
    />
  ),
}

/**
 * A disabled option stays in the list and stays announced — it joins
 * the choice but not the focus group, so the arrow keys and type-ahead
 * skip it. `Spanish` is seeded as the current value.
 */
export const AllStates: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: LANGUAGES,
    trigger: <Button>Choose a language</Button>,
  },
  render: () => (
    <ListboxHarness
      initialSelected="spa"
      options={LANGUAGES}
      triggerLabel="Choose a language"
    />
  ),
}

/**
 * The thing a native `<select>` cannot do: two-line options, a leading
 * flag, and a trailing intent-coloured badge.
 */
export const AllVariants: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: TRACKS,
    trigger: <Button>Choose a track</Button>,
  },
  render: () => (
    <StoryRow>
      <ListboxHarness
        options={TRACKS}
        triggerLabel="Choose a track"
      />
    </StoryRow>
  ),
}

/**
 * Open it and drive it from the keyboard: arrows move focus without
 * selecting, type a letter to jump, Enter chooses, Escape closes.
 */
export const Interactive: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: LANGUAGES,
    trigger: <Button>Choose a language</Button>,
  },
  render: () => (
    <ListboxHarness
      options={LANGUAGES}
      triggerLabel="Choose a language"
    />
  ),
}
