import type { Meta, StoryObj } from "@storybook/react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { Field } from "../Field/Field.tsx"
import type { SelectItem } from "./Select.tsx"
import { Select } from "./Select.tsx"

/**
 * `as const satisfies`, which is a **typecheck** of the `readonly`
 * widening as much as it is a story: a consumer's options table is
 * usually a constant, and until 1.0.1 handing one to `options`
 * failed with `TS4104` — image-viewer copied the array at every call
 * site to get past it. If that widening is ever reverted, this line
 * is where `yarn typecheck` says so.
 */
const PROFILES = [
  { label: "Lossless remux", value: "lossless" },
  { label: "Compressed 1080p", value: "compressed" },
  { isDisabled: true, label: "Dolby Vision", value: "dv" },
] as const satisfies readonly SelectItem[]

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
  // `Deprecated/`, not `Components/`, and that is the whole point of
  // moving it: the sidebar is the first place an agent looks for a
  // picker, and a `Select` sitting between `Rail` and `Shell` reads
  // as a component in good standing. Nothing new gets one — `Picker`
  // is the drop-in. See the 2026-08-20 deprecation record.
  title: "Deprecated/Select",
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

/**
 * `className` sizes the **control**, chevron included, because it
 * lands on the wrapper the chevron is positioned against.
 *
 * The first cell is the shape that broke: before this, `w-44`
 * reached only the inner `<select>` while the wrapper stayed
 * `w-full`, so the chevron sat at the *row's* right edge — 869.6px
 * away in mux-magic's rules builder. `controlClassName` is the
 * inner element, for the things that are not the outer box, and
 * `font-mono` is the one every caller reaches for.
 *
 * The width is still the caller's to get right: `w-44` is narrower
 * than the longest option here, and a `<select>` clips rather than
 * wraps. That is why mux-magic measured its widths rather than
 * guessing them.
 */
export const Sized: Story = {
  args: { label: "Rip profile", options: PROFILES },
  render: () => (
    <StoryGrid columns={1}>
      <StoryCell label="w-44, in a wide row">
        <Select
          className="w-44"
          label="Profile sized"
          options={PROFILES}
        />
      </StoryCell>

      <StoryCell label="w-64, monospaced option text">
        <Select
          className="w-64"
          controlClassName="font-mono"
          label="Profile monospaced"
          options={PROFILES}
        />
      </StoryCell>

      <StoryCell label="ms-auto, pushed to the end">
        <Select
          className="ms-auto w-56"
          label="Profile pushed"
          options={PROFILES}
        />
      </StoryCell>

      <StoryCell label="default: fills its parent">
        <Select
          label="Profile full width"
          options={PROFILES}
        />
      </StoryCell>
    </StoryGrid>
  ),
}
