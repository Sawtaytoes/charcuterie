import type { Meta, StoryObj } from "@storybook/react"

import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { Select } from "../Select/Select.tsx"
import { Field } from "./Field.tsx"

const TEXT_INPUT_CLASS =
  "w-full rounded-md border border-border-default bg-surface-raised px-3 py-2 text-content-primary text-sm focus-visible:outline-solid focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(--focus-ring-offset) focus-visible:outline-focus-ring"

const meta = {
  title: "Components/Field",
  component: Field,
  parameters: { layout: "padded" },
  args: {
    isRequired: false,
    label: "Output directory",
  },
} satisfies Meta<typeof Field>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <input className={TEXT_INPUT_CLASS} type="text" />
    ),
    description: "Where finished rips are moved.",
    label: "Output directory",
  },
}

/**
 * The control is a slot, not a hardcoded `<input>` — `Select` goes
 * in the same hole, and so does an app's own control. The `id`,
 * `aria-describedby`, `aria-invalid`, and `required` are cloned onto
 * whatever is passed.
 */
export const AllVariants: Story = {
  args: {
    children: (
      <input className={TEXT_INPUT_CLASS} type="text" />
    ),
    label: "Output directory",
  },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell label="text input">
        <Field label="Output directory">
          <input className={TEXT_INPUT_CLASS} type="text" />
        </Field>
      </StoryCell>

      <StoryCell label="select">
        <Field label="Rip profile">
          <Select
            options={[
              { label: "Lossless", value: "lossless" },
              { label: "Compressed", value: "compressed" },
            ]}
          />
        </Field>
      </StoryCell>

      <StoryCell label="with description">
        <Field
          description="Where finished rips are moved."
          label="Archive path"
        >
          <input className={TEXT_INPUT_CLASS} type="text" />
        </Field>
      </StoryCell>

      <StoryCell label="required">
        <Field isRequired label="Disc label">
          <input className={TEXT_INPUT_CLASS} type="text" />
        </Field>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * `error` is the only source of invalidity — there is no separate
 * `isInvalid`, because two sources for one fact is how a control
 * ends up `aria-invalid="true"` with nothing saying why.
 *
 * With both a description and an error, `aria-describedby` names
 * them in that order. A screen reader reads the list in sequence,
 * and the two sentences are not interchangeable.
 */
export const AllStates: Story = {
  args: {
    children: (
      <input className={TEXT_INPUT_CLASS} type="text" />
    ),
    label: "Output directory",
  },
  render: () => (
    <StoryGrid columns={3}>
      <StoryCell label="valid">
        <Field label="Bay name">
          <input
            className={TEXT_INPUT_CLASS}
            defaultValue="Bay 3"
            type="text"
          />
        </Field>
      </StoryCell>

      <StoryCell label="invalid">
        <Field
          error="That path is not writable."
          label="Scratch path"
        >
          <input
            className={TEXT_INPUT_CLASS}
            defaultValue="/mnt/readonly"
            type="text"
          />
        </Field>
      </StoryCell>

      <StoryCell label="described and invalid">
        <Field
          description="Absolute paths only."
          error="That path is not writable."
          isRequired
          label="Archive path"
        >
          <input
            className={TEXT_INPUT_CLASS}
            defaultValue="mnt/archive"
            type="text"
          />
        </Field>
      </StoryCell>
    </StoryGrid>
  ),
}
