import { useVisibility } from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"

import {
  controlSizeArgType,
  placementArgType,
} from "../argTypes.storyHelpers.ts"
import { Badge } from "../Badge/Badge.tsx"
import { Button } from "../Button/Button.tsx"
import {
  StoryCell,
  StoryGrid,
  StoryRow,
} from "../board.storyHelpers.tsx"
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
  title: "Components/Controls/Listbox",
  component: Listbox,
  parameters: { layout: "padded" },
  argTypes: {
    itemSize: controlSizeArgType,
    placement: placementArgType,
  },
  args: { itemSize: "md", placement: "bottom-start" },
} satisfies Meta<typeof Listbox>

export default meta

type Story = StoryObj<typeof meta>

const ListboxHarness = ({
  initialSelected,
  isInitiallyVisible = false,
  itemSize,
  options,
  triggerLabel,
}: {
  initialSelected?: string
  isInitiallyVisible?: boolean
  itemSize?: ControlSize
  options: ListboxItem[]
  triggerLabel: string
}): ReactNode => {
  const { hide, isVisible, toggle } = useVisibility({
    isVisible: isInitiallyVisible,
  })

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
      itemSize={itemSize}
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

/**
 * The three option sizes, open side by side.
 *
 * `md` is the default, and the reason is the report that started this
 * work: an option that is smaller than the control which opened it
 * reads as a different, lesser thing inside its own panel. `md` is
 * `--control-height-md` — the same 2.25rem a default `Button` and a
 * `Select` take — so a picker's options now measure the same as its
 * trigger.
 *
 * `lg` is the fat one: 2.75rem, the 44px target, for a list that is
 * aimed at rather than scanned. `sm` is what this component rendered
 * before, kept for a genuinely dense list.
 *
 * The floor is a **minimum**, not a fixed height — the rich option
 * below (flag, name, badge) still grows past it, which is why this is
 * `min-h-` and a `Button`'s is `h-`.
 */
export const ItemSizes: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: LANGUAGES,
    trigger: <Button>Language</Button>,
  },
  render: () => (
    <StoryGrid columns={3}>
      <StoryCell label="sm — the old option">
        <ListboxHarness
          isInitiallyVisible
          itemSize="sm"
          options={LANGUAGES}
          triggerLabel="Language"
        />
      </StoryCell>

      <StoryCell label="md — the default, matches the trigger">
        <ListboxHarness
          isInitiallyVisible
          itemSize="md"
          options={LANGUAGES}
          triggerLabel="Language"
        />
      </StoryCell>

      <StoryCell label="lg — the fat option (44px)">
        <ListboxHarness
          isInitiallyVisible
          itemSize="lg"
          options={LANGUAGES}
          triggerLabel="Language"
        />
      </StoryCell>
    </StoryGrid>
  ),
}
