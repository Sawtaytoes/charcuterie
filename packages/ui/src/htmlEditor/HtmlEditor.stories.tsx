import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { Field } from "../Field/Field.tsx"
import { HtmlEditor } from "./HtmlEditor.tsx"
import { HtmlView } from "./HtmlView.tsx"
import {
  HOSTILE_HTML,
  HTML_DOCUMENT,
  ORIGINAL_HTML,
} from "./htmlDocument.storyHelpers.ts"

const meta = {
  title: "Components/Controls/HtmlEditor",
  component: HtmlEditor,
  parameters: { layout: "padded" },
  args: {
    defaultValue: HTML_DOCUMENT,
    label: "Notes",
    isDisabled: false,
    isReadOnly: false,
  },
  argTypes: { icons: { control: false } },
} satisfies Meta<typeof HtmlEditor>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: playgroundParameters,
}
export const AllVariants: Story = {
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="Existing rich HTML">
        <HtmlEditor
          defaultValue={HTML_DOCUMENT}
          label="Rich notes"
          toolbarLabel="Rich note formatting"
        />
      </StoryCell>
      <StoryCell align="stretch" label="Inside a Field">
        <Field
          label="Recipe notes"
          description="Stored as HTML; existing notes stay untouched until an edit."
        >
          <HtmlEditor
            defaultValue="<p>Inspect the fit.</p>"
            toolbarLabel="Recipe note formatting"
          />
        </Field>
      </StoryCell>
      <StoryCell align="stretch" label="Empty">
        <HtmlEditor
          label="Empty notes"
          toolbarLabel="Empty note formatting"
        />
      </StoryCell>
    </StoryGrid>
  ),
}
export const AllStates: Story = {
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="Editing">
        <HtmlEditor
          defaultValue={HTML_DOCUMENT}
          label="Editable notes"
          toolbarLabel="Editable note formatting"
        />
      </StoryCell>
      <StoryCell align="stretch" label="Read only">
        <HtmlEditor
          defaultValue={HTML_DOCUMENT}
          isReadOnly
          label="Read-only notes"
          toolbarLabel="Read-only note formatting"
        />
      </StoryCell>
      <StoryCell align="stretch" label="Disabled">
        <HtmlEditor
          defaultValue={HTML_DOCUMENT}
          isDisabled
          label="Disabled notes"
          toolbarLabel="Disabled note formatting"
        />
      </StoryCell>
      <StoryCell align="stretch" label="Invalid">
        <Field
          error="Add notes before saving."
          isRequired
          label="Required notes"
        >
          <HtmlEditor toolbarLabel="Required note formatting" />
        </Field>
      </StoryCell>
    </StoryGrid>
  ),
}
export const Responsive: Story = {
  render: () => (
    <ContainerBoard>
      {(width) => (
        <HtmlEditor
          defaultValue={HTML_DOCUMENT}
          label={`Notes at ${width}`}
          toolbarLabel={`Formatting at ${width}`}
        />
      )}
    </ContainerBoard>
  ),
}
export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState(ORIGINAL_HTML)
    const [defaultValue, setDefaultValue] =
      useState(ORIGINAL_HTML)
    const [changes, setChanges] = useState(0)
    const [submitted, setSubmitted] = useState("")
    return (
      <div className="space-y-4">
        <form
          aria-label="Notes form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(
              String(
                new FormData(event.currentTarget).get(
                  "notes",
                ),
              ),
            )
          }}
        >
          <Field label="Saved notes">
            <HtmlEditor
              defaultValue={defaultValue}
              name="notes"
              onChange={(next) => {
                setValue(next)
                setChanges((count) => count + 1)
              }}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Save notes</Button>
            <Button
              appearance="outline"
              onClick={() =>
                setDefaultValue(
                  "<p>External default changed</p>",
                )
              }
            >
              Change external default
            </Button>
          </div>
        </form>
        <p>Document edits: {changes}</p>
        <section aria-label="Stored HTML">
          <pre className="whitespace-pre-wrap wrap-anywhere">
            {value}
          </pre>
        </section>
        <section aria-label="Submitted HTML">
          <pre className="whitespace-pre-wrap wrap-anywhere">
            {submitted}
          </pre>
        </section>
        <HtmlView
          label="Saved note preview"
          value={value}
        />
      </div>
    )
  },
}
export const Hostile: Story = {
  args: {
    defaultValue: HOSTILE_HTML,
    label: "Untrusted notes",
  },
}
export const Blank: Story = {
  args: { defaultValue: "", label: "New notes" },
}
