import type { Meta, StoryObj } from "@storybook/react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { FieldGroup } from "../Field/FieldGroup.tsx"
import { Checkbox } from "./Checkbox.tsx"

const meta = {
  title: "Components/Controls/Checkbox",
  component: Checkbox,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  // The component's own defaults, restated — Storybook does not seed
  // `args` from docgen, so an unstated default shows in the props
  // table with nothing selected in its control.
  args: {
    isChecked: false,
    isDisabled: false,
    isReadOnly: false,
    size: "md",
  },
} satisfies Meta<typeof Checkbox>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: "Delete originals after import" },
}

export const AllVariants: Story = {
  args: { label: "Delete originals after import" },
  render: (controlProps) => (
    <StorySection title="Three control heights, all reading the density axis rather than hardcoding a length.">
      <StoryGrid columns={3}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <StoryCell key={size} label={size}>
            <Checkbox
              {...controlProps}
              isChecked
              label={`Enabled at ${size}`}
              size={size}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * `isChecked` seeds the first paint and nothing after — the `<input>`
 * owns its state from then on, so a disabled-and-checked box is a
 * saved preference the user cannot currently change, not a bug.
 */
export const AllStates: Story = {
  args: { label: "Delete originals after import" },
  render: (controlProps) => (
    <StorySection title="What varies is whether the box is checked and whether it can be changed.">
      <StoryGrid columns={2}>
        <StoryCell label="unchecked">
          <Checkbox {...controlProps} label="Unchecked" />
        </StoryCell>

        <StoryCell label="checked">
          <Checkbox
            {...controlProps}
            isChecked
            label="Checked"
          />
        </StoryCell>

        <StoryCell label="disabled, unchecked">
          <Checkbox
            {...controlProps}
            isDisabled
            label="Disabled"
          />
        </StoryCell>

        <StoryCell label="disabled, checked">
          <Checkbox
            {...controlProps}
            isChecked
            isDisabled
            label="Disabled and checked"
          />
        </StoryCell>

        <StoryCell label="read-only, unchecked">
          <Checkbox
            {...controlProps}
            isReadOnly
            label="Read-only"
          />
        </StoryCell>

        <StoryCell label="read-only, checked">
          <Checkbox
            {...controlProps}
            isChecked
            isReadOnly
            label="Read-only and checked"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The whole keyboard path is the browser's: Tab reaches the box,
 * Space toggles it. A `<label>` wrapping the control is what makes a
 * pointer press on the *text* toggle it too.
 */
export const Interactive: Story = {
  args: { label: "Delete originals after import" },
}

/**
 * `value` names which member of a group a box IS — not whether it is
 * ticked. It matters as soon as there is more than one box: a group is
 * read back with a single query over its container, and without a
 * `value` every box in it answers `"on"`.
 *
 * ```ts
 * const chosen = [...group.querySelectorAll("input")]
 *   .filter((input) => input.checked)
 *   .map((input) => input.value)
 * ```
 *
 * A lone boolean needs none of this and should omit the prop.
 */
export const WithValues: Story = {
  args: { label: "Anime" },
  render: (controlProps) => (
    <StorySection title="A library picker: each box carries the id the caller will read back, and the checked ones are the answer.">
      <StoryGrid columns={2}>
        {[
          { id: "11", isChosen: true, title: "Anime" },
          { id: "1", isChosen: false, title: "Movies" },
          { id: "15", isChosen: true, title: "Shorts" },
          { id: "2", isChosen: false, title: "Shows" },
        ].map((library) => (
          <StoryCell
            key={library.id}
            label={`value="${library.id}"`}
          >
            <Checkbox
              {...controlProps}
              isChecked={library.isChosen}
              label={library.title}
              value={library.id}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * `description` is standing help that follows the box, bound with
 * `aria-describedby` so a screen reader reads it **with** the control
 * — the same slot, the same words and the same announcement order as
 * `Field`'s.
 *
 * It renders outside the `<label>`, which is the only place it can go:
 * a `<label>`'s text content *is* the control's accessible name, so a
 * hint inside it would be announced twice and a pointer press on it
 * would toggle the box.
 *
 * The gap this closes is a mixed box. Before it, a hint after a
 * checkbox had to be the app's own paragraph while the hint after the
 * `Field` two rows down came from the library, and the two disagreed
 * about the size of a hint — one control's help looking unlike its
 * neighbour's, in the same editor.
 */
export const WithDescriptions: Story = {
  args: { label: "Delete originals after import" },
  render: (controlProps) => (
    <StorySection title="One hint typography for the whole library: `text-sm`, `content-secondary`, hung under the label text rather than under the box.">
      <StoryGrid columns={2}>
        <StoryCell label="described">
          <Checkbox
            {...controlProps}
            description="The source files are removed once every title has been written."
            label="Delete originals after import"
          />
        </StoryCell>

        <StoryCell label="described and checked">
          <Checkbox
            {...controlProps}
            description="Nothing plays after the last title finishes."
            isChecked
            label="Turn everything off when it finishes"
          />
        </StoryCell>

        <StoryCell label="described and disabled">
          <Checkbox
            {...controlProps}
            description="A turned-off box is exactly when this sentence gets read, so it keeps full contrast."
            isDisabled
            label="Re-encode to the archive profile"
          />
        </StoryCell>

        <StoryCell label="described, in a group">
          <FieldGroup
            description="A group's own help sits under all of it."
            label="After a rip"
          >
            <Checkbox
              {...controlProps}
              description="Written beside the video, not into it."
              label="Keep chapter markers"
              size="sm"
            />

            <Checkbox
              {...controlProps}
              description="Costs a second pass over each title."
              label="Verify the checksum"
              size="sm"
            />
          </FieldGroup>
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}
