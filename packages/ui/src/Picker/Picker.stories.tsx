import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"

import {
  controlSizeArgType,
  intentArgType,
  placementArgType,
} from "../argTypes.storyHelpers.ts"
import { Badge } from "../Badge/Badge.tsx"
import { Field } from "../Field/Field.tsx"
import {
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import type { PickerOption } from "./Picker.tsx"
import { Picker } from "./Picker.tsx"

const LANGUAGES: PickerOption[] = [
  { label: "English", value: "eng" },
  { label: "Spanish", value: "spa" },
  { label: "French", value: "fra" },
  { isDisabled: true, label: "German", value: "deu" },
  { label: "Japanese", value: "jpn" },
]

/**
 * The rich options a native `<option>` cannot render — a trailing
 * intent-coloured badge. No emoji: the VRT runner has no emoji font, so
 * a flag would snapshot as a blank box and make the shot font-dependent.
 */
const TRACKS: PickerOption[] = [
  {
    label: (
      <span className="flex items-center gap-2">
        <span>English</span>
        <Badge intent="neutral" size="sm">
          5.1
        </Badge>
      </span>
    ),
    textValue: "English",
    value: "eng",
  },
  {
    label: (
      <span className="flex items-center gap-2">
        <span>Japanese</span>
        <Badge intent="warning" size="sm">
          forced
        </Badge>
      </span>
    ),
    textValue: "Japanese",
    value: "jpn",
  },
]

const meta = {
  title: "Components/Picker",
  component: Picker,
  parameters: { layout: "padded" },
  argTypes: {
    intent: intentArgType,
    placement: placementArgType,
    size: controlSizeArgType,
  },
  args: {
    label: "Language",
    onChange: () => {},
    options: LANGUAGES,
  },
} satisfies Meta<typeof Picker>

export default meta

type Story = StoryObj<typeof meta>

const PickerHarness = ({
  initialValue,
  label,
  options,
  placeholder,
}: {
  initialValue?: string
  label: string
  options: PickerOption[]
  placeholder?: string
}): ReactNode => {
  const [value, setValue] = useState<string | undefined>(
    initialValue,
  )

  return (
    <Picker
      label={label}
      onChange={setValue}
      options={options}
      placeholder={placeholder}
      value={value}
    />
  )
}

/**
 * The assembled default: a button showing the current value, a
 * chevron, and the `Listbox` panel already wired to it.
 */
export const Default: Story = {
  render: () => (
    <PickerHarness
      initialValue="eng"
      label="Language"
      options={LANGUAGES}
    />
  ),
}

/**
 * Nothing chosen yet, a disabled option, and rich option labels —
 * each with a `textValue` so type-ahead and the trigger's text stay
 * plain strings.
 */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <StorySection title="Seeded">
        <StoryRow>
          <PickerHarness
            initialValue="spa"
            label="Language"
            options={LANGUAGES}
          />
        </StoryRow>
      </StorySection>

      <StorySection title="Empty — reads its placeholder">
        <StoryRow>
          <PickerHarness
            label="Language"
            options={LANGUAGES}
            placeholder="Choose a language…"
          />
        </StoryRow>
      </StorySection>

      <StorySection title="Rich options">
        <StoryRow>
          <PickerHarness
            initialValue="eng"
            label="Audio track"
            options={TRACKS}
          />
        </StoryRow>
      </StorySection>

      <StorySection title="Disabled">
        <StoryRow>
          <Picker
            isDisabled
            label="Language"
            onChange={() => {}}
            options={LANGUAGES}
            value="eng"
          />
        </StoryRow>
      </StorySection>
    </div>
  ),
}

/**
 * Drive it: open, choose, and watch the trigger's accessible name
 * follow the value — `"Language: English"` becomes
 * `"Language: French"`.
 */
export const Interactive: Story = {
  render: () => (
    <PickerHarness
      initialValue="eng"
      label="Language"
      options={LANGUAGES}
    />
  ),
}

const COUNTS: PickerOption[] = [
  { label: "1", value: "1" },
  {
    label: (
      <span className="flex items-center gap-2">
        <span>2</span>
        <Badge intent="neutral" size="sm">
          Default
        </Badge>
      </span>
    ),
    textValue: "2 Default",
    value: "2",
  },
  { label: "Custom…", value: "custom" },
]

/**
 * The trigger has no outer margin. Sitting it next to a label without
 * a parent gap is the flush-against-the-word bug; `Field` or an
 * `inline-flex gap-*` row is the parent owning the gutter.
 */
export const NextToText: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <StorySection title="Flush — the parent gave it no gap">
        <StoryRow>
          <span>
            Chapters queued per turn{" "}
            <Picker
              label="Chapters queued per turn"
              onChange={() => undefined}
              options={COUNTS}
              size="sm"
              value="2"
            />
          </span>
        </StoryRow>
      </StorySection>
      <StorySection title="Inline — the row owns the gap">
        <StoryRow>
          <span className="inline-flex items-center gap-2.5">
            Chapters queued per turn
            <Picker
              label="Chapters queued per turn"
              onChange={() => undefined}
              options={COUNTS}
              size="sm"
              value="2"
            />
          </span>
        </StoryRow>
      </StorySection>
      <StorySection title="Stacked — Field owns the gap">
        <StoryRow>
          <Field
            description="How long this entry’s turn is when the queue reaches it."
            label="Chapters queued per turn"
          >
            <Picker
              label="Chapters queued per turn"
              onChange={() => undefined}
              options={COUNTS}
              size="sm"
              value="2"
            />
          </Field>
        </StoryRow>
      </StorySection>
    </div>
  ),
}
