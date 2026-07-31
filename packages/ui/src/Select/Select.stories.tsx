import type { Meta, StoryObj } from "@storybook/react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { Field } from "../Field/Field.tsx"
import type { SelectItem } from "./Select.tsx"
import { Select } from "./Select.tsx"

const PROFILES: SelectItem[] = [
  { label: "Lossless remux", value: "lossless" },
  { label: "Compressed 1080p", value: "compressed" },
  { isDisabled: true, label: "Dolby Vision", value: "dv" },
]

const GROUPED: SelectItem[] = [
  {
    label: "Video",
    options: [
      { label: "Remux", value: "remux" },
      { label: "Transcode", value: "transcode" },
    ],
  },
  {
    label: "Audio",
    options: [
      { label: "Passthrough", value: "passthrough" },
      { label: "Downmix", value: "downmix" },
    ],
  },
]

const meta = {
  title: "Components/Select",
  component: Select,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  args: {
    isDisabled: false,
    options: PROFILES,
    size: "md",
  },
} satisfies Meta<typeof Select>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: "Rip profile", options: PROFILES },
}

export const AllVariants: Story = {
  args: { label: "Rip profile", options: PROFILES },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell label="sm">
        <Select
          label="Profile sm"
          options={PROFILES}
          size="sm"
        />
      </StoryCell>

      <StoryCell label="lg">
        <Select
          label="Profile lg"
          options={PROFILES}
          size="lg"
        />
      </StoryCell>

      <StoryCell label="grouped">
        <Select label="Stream kind" options={GROUPED} />
      </StoryCell>

      <StoryCell label="placeholder">
        <Select
          label="Profile with prompt"
          options={PROFILES}
          placeholder="Choose a profile…"
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * The disabled option is still announced and still unselectable —
 * "you cannot do this right now", rather than the option not
 * existing. A `placeholder` is the same trick at the top of the
 * list: disabled, so it reads as a prompt and can never be
 * submitted.
 */
export const AllStates: Story = {
  args: { label: "Rip profile", options: PROFILES },
  render: () => (
    <StoryGrid columns={3}>
      <StoryCell label="default">
        <Select
          label="Profile default"
          options={PROFILES}
        />
      </StoryCell>

      <StoryCell label="disabled">
        <Select
          isDisabled
          label="Profile disabled"
          options={PROFILES}
        />
      </StoryCell>

      <StoryCell label="in a Field">
        <Field
          description="Applied to every title on the disc."
          label="Profile in a field"
        >
          <Select options={PROFILES} />
        </Field>
      </StoryCell>
    </StoryGrid>
  ),
}
