import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { Field } from "../Field/Field.tsx"
import { MARKDOWN_ICONS } from "../icons.storyHelpers.tsx"
import { MarkdownEditor } from "./MarkdownEditor.tsx"

/**
 * Invented, like every fixture in this repo. A task in a made-up
 * homelab project, exercising each construct the painted layer
 * knows about.
 */
const SAMPLE = `## Rack move, phase two

The **short** version: pull the _old_ switch, land the new one, and
keep the ~~three~~ two uplinks live throughout.

- [x] Label every patch lead
- [ ] Photograph the current cabling
- [ ] Cut over at 02:00

1. Power down the shelf
2. Swap the rails
3. Bring it back up

> Nothing here touches the storage pool.

Run \`ping -c 3 gateway.invalid\` before and after, and read
[the runbook](https://example.invalid/runbook) first.

| Port | Goes to |
| --- | --- |
| 1 | uplink |
| 2 | shelf |

\`\`\`sh
ip -br addr show
\`\`\`
`

const noop = () => undefined

const meta = {
  title: "Components/Controls/MarkdownEditor",
  component: MarkdownEditor,
  parameters: { layout: "padded" },
  args: {
    isDisabled: false,
    isReadOnly: false,
    label: "Description",
    placeholder: "Write it in markdown…",
  },
} satisfies Meta<typeof MarkdownEditor>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    defaultValue: SAMPLE,
    label: "Description",
  },
}

export const AllVariants: Story = {
  args: { label: "Description" },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="empty">
        <MarkdownEditor
          label="Empty description"
          placeholder="Write it in markdown…"
        />
      </StoryCell>

      <StoryCell align="stretch" label="inside a Field">
        <Field
          description="Markdown is what gets stored."
          label="Acceptance criteria"
        >
          <MarkdownEditor defaultValue="- [ ] It **works**" />
        </Field>
      </StoryCell>

      <StoryCell align="stretch" label="a whole document">
        <MarkdownEditor
          defaultValue={SAMPLE}
          label="Long description"
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="HTML is text, not markup"
      >
        <MarkdownEditor
          defaultValue={
            "<script>alert('xss')</script>\n\nA tag pasted in here is four coloured characters, because nothing in this component ever builds HTML.\n\n&amp; &lt; &gt; survive as literal text too."
          }
          label="HTML description"
        />
      </StoryCell>
    </StoryGrid>
  ),
}

export const AllStates: Story = {
  args: { label: "Description" },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="idle">
        <MarkdownEditor
          defaultValue="An **idle** editor."
          label="Idle description"
        />
      </StoryCell>

      <StoryCell align="stretch" label="read only">
        <MarkdownEditor
          defaultValue="A **read-only** editor still highlights."
          isReadOnly
          label="Read-only description"
        />
      </StoryCell>

      <StoryCell align="stretch" label="disabled">
        <MarkdownEditor
          defaultValue="A **disabled** editor."
          isDisabled
          label="Disabled description"
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="invalid, in a Field"
      >
        <Field
          error="A description is required before a task can leave Backlog."
          isRequired
          label="Task description"
        >
          <MarkdownEditor defaultValue="" />
        </Field>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * The only honest way to story a container query: three fixed
 * inline sizes, side by side, while the browser window never moves.
 *
 * The toolbar is this package's `Toolbar`, so it collapses into a
 * **menu by measurement** rather than at a breakpoint — which is
 * what the Narrow View actually needs, since a lane in a three-up
 * board is narrow on a 4K display. The hint line under the surface
 * is the container-query half: `sr-only` below `--cq-sm`, painted
 * above it, and in the accessibility tree at every width.
 */
export const Responsive: Story = {
  args: { label: "Description" },
  render: () => (
    <ContainerBoard>
      {(width) => (
        <MarkdownEditor
          defaultValue={
            "## Cut over\n\n- [ ] Label the leads\n- [ ] **Photograph** the cabling"
          }
          label={`Description at ${width}`}
        />
      )}
    </ContainerBoard>
  ),
}

/**
 * Type into it. The syntax colours as you go, and the markers on
 * the line the caret is on paint in the accent colour while every
 * other line's stay muted — that is the "raw syntax on the cursor's
 * line" behaviour, in a medium where hiding the markers would move
 * the text out from under the caret.
 *
 * Everything the toolbar does has a shortcut: **Ctrl+B**, **Ctrl+I**,
 * **Ctrl+K**, **Ctrl+E**, **Ctrl+]** and **Ctrl+[**, and Enter
 * continues a list. **Tab is never captured** — it moves focus, at
 * every time, because a multi-line field on a form is exactly where
 * somebody tabs onward.
 *
 * The upload here is a fake that resolves after a beat with a data
 * URL, so the placeholder is visible while it runs. A real consumer
 * returns a URL from its own blob storage.
 */
export const Interactive: Story = {
  args: { label: "Description" },
  render: function LiveEditor() {
    const [stored, setStored] = useState(
      "Paste an image, or press Ctrl+B and type.\n",
    )

    return (
      <div className="flex flex-col gap-3">
        <MarkdownEditor
          label="Task description"
          defaultValue={stored}
          onChange={setStored}
          onUploadImage={async (file) => {
            await new Promise((resolve) => {
              setTimeout(resolve, 600)
            })

            return {
              alt: file.name,
              url: `https://example.invalid/blobs/${encodeURIComponent(file.name)}`,
            }
          }}
          placeholder="Write it in markdown…"
        />

        <div className="flex flex-col gap-1">
          <span className="font-mono text-content-muted text-xs">
            what gets stored
          </span>

          {/*
            Wraps rather than scrolls. A scrollable region has to be
            keyboard-reachable — axe's
            `scrollable-region-focusable`, a real rule rather than a
            nag — and `biome --write --unsafe` strips a `tabIndex`
            off a non-interactive element, so the two fight. Not
            being a scroll container settles it.
          */}
          <pre className="whitespace-pre-wrap rounded-md bg-surface-sunken p-3 font-mono text-content-secondary text-sm wrap-anywhere">
            {stored}
          </pre>
        </div>
      </div>
    )
  },
}

/**
 * Nothing but the surface, for a screenshot of the painted layer on
 * its own.
 */
export const NoUpload: Story = {
  args: {
    defaultValue:
      "# Heading\n\n**bold**, _italic_, `code`, ~~struck~~, [a link](https://example.invalid).\n\n- [ ] a task\n- [x] a done task\n\n> a quote\n",
    label: "Description",
    onUploadImage: undefined,
  },
  render: (args) => <MarkdownEditor {...args} />,
}

export const Blank: Story = {
  args: {
    label: "Description",
    onChange: noop,
    placeholder: "Write it in markdown…",
  },
}

/**
 * The bar with an app's icon set, and the `overflow` glyph that
 * finishes it.
 *
 * This editor's overflow is a `Menu` rather than a `Popover`, so
 * the collapsed actions keep their words in the menu rows — the
 * icons buy width in the bar without costing the names anywhere.
 */
export const IconToolbar: Story = {
  args: {
    defaultValue: SAMPLE,
    icons: MARKDOWN_ICONS,
    label: "Description",
  },
}
