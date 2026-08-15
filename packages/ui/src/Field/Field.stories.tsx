import type { Meta, StoryObj } from "@storybook/react"

import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { Picker } from "../Picker/Picker.tsx"
import { Select } from "../Select/Select.tsx"
import { Tooltip } from "../Tooltip/Tooltip.tsx"
import { Field } from "./Field.tsx"
import { FieldGroup } from "./FieldGroup.tsx"

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
 * The control carries its own `id` — `rename-pattern`, the kind of
 * stable id a deep link or a server-rendered error summary points at.
 * The `Field` adopts it rather than minting a `-control` id over the
 * top, so the `<label htmlFor>` and every outside-in reference agree.
 */
export const AdoptsChildId: Story = {
  args: {
    children: (
      <input
        className={TEXT_INPUT_CLASS}
        id="rename-pattern"
        type="text"
      />
    ),
    label: "Rename pattern",
  },
}

/**
 * An overlay-triggered control — `Picker`, and by the same route
 * `Listbox`, `Combobox` and `Menu` — is the case that used to break.
 *
 * `useAnchoredOverlay` minted its own trigger id and cloned it over
 * whatever was there, so the `<label htmlFor>` above pointed at an
 * element that did not exist. It failed silently: a dangling `htmlFor`
 * throws nothing, renders nothing, and only shows up if you go looking
 * for the id in the DOM. The hook now prefers the trigger's own id.
 */
export const AdoptsOverlayTriggerId: Story = {
  args: {
    children: (
      <Picker
        label="Language"
        onChange={() => {}}
        options={[
          { label: "English", value: "en" },
          { label: "Japanese", value: "ja" },
        ]}
        value="en"
      />
    ),
    label: "Language",
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

/**
 * Two slot components around one control, in both orders.
 *
 * `Field` and `Tooltip` each clone onto their single child, so
 * nesting them used to hand `Field`'s `id`, `aria-describedby`,
 * `aria-invalid` and `required` to the `Tooltip` **component** —
 * which declares none of them and dropped all four, silently, with an
 * identical render and a `<label>` pointing at an id that was nowhere
 * in the document.
 *
 * A slot is a pass-through: whatever arrives from above is forwarded
 * to the child at the bottom of the chain, and `aria-describedby` —
 * the one prop that is a *list* — is merged rather than overwritten,
 * outer first.
 */
export const Nested: Story = {
  args: {
    children: (
      <input className={TEXT_INPUT_CLASS} type="text" />
    ),
    label: "Output directory",
  },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell label="tooltip inside field">
        <Field
          description="Applied to every title."
          isRequired
          label="Rename pattern"
        >
          <Tooltip label="A JavaScript regular expression.">
            <input
              className={TEXT_INPUT_CLASS}
              defaultValue="^(.*)$"
              type="text"
            />
          </Tooltip>
        </Field>
      </StoryCell>

      <StoryCell label="field inside tooltip">
        <Tooltip label="Where finished rips are moved.">
          <Field error="Not writable." label="Archive path">
            <input
              className={TEXT_INPUT_CLASS}
              defaultValue="/mnt/readonly"
              type="text"
            />
          </Field>
        </Tooltip>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * `FieldGroup` — one label over **several** controls, which is where
 * `Field` cannot go: an `id` names one element and a
 * `<label htmlFor>` points at one.
 *
 * Six of mux-magic's sixteen field components are in this position,
 * and every one of them renders a `FieldLabel` whose `htmlFor` names
 * at best one of the controls under it. The element for the job is a
 * `<fieldset>` with a `<legend>` — the one place in this library
 * where `<fieldset>` is right, because here the content really *is* a
 * form-control grouping.
 */
export const Group: Story = {
  args: {
    children: (
      <input className={TEXT_INPUT_CLASS} type="text" />
    ),
    label: "Output directory",
  },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell label="several controls">
        <FieldGroup
          description="Applied to every title in the disc."
          isRequired
          label="Rename pattern"
        >
          <div className="flex gap-2">
            <input
              aria-label="Pattern"
              className={TEXT_INPUT_CLASS}
              defaultValue="^(.*)$"
              type="text"
            />

            <input
              aria-label="Flags"
              className={TEXT_INPUT_CLASS}
              defaultValue="gi"
              type="text"
            />
          </div>

          <input
            aria-label="Sample"
            className={TEXT_INPUT_CLASS}
            defaultValue="Disc 1 — Title 04"
            type="text"
          />
        </FieldGroup>
      </StoryCell>

      <StoryCell label="invalid group">
        <FieldGroup
          error="A pattern needs at least one capture group."
          label="Chapter split"
        >
          <div className="flex gap-2">
            <Select
              label="Unit"
              options={[
                { label: "Chapters", value: "chapters" },
                { label: "Minutes", value: "minutes" },
              ]}
            />

            <input
              aria-label="Every"
              className={TEXT_INPUT_CLASS}
              defaultValue="5"
              type="number"
            />
          </div>
        </FieldGroup>
      </StoryCell>
    </StoryGrid>
  ),
}
