import type { Meta, StoryObj } from "@storybook/react"

import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { Field } from "../Field/Field.tsx"
import { MarkdownEditorCodeMirror } from "./MarkdownEditorCodeMirror.tsx"

/**
 * Invented, like every fixture in this repo — a task in a made-up
 * homelab project, exercising each construct the live-preview layer
 * knows about.
 *
 * The bare URL on the last line is the point of the whole exercise:
 * nobody typed `[](…)` around it, and it is a link anyway.
 */
const SAMPLE = `# Rack move, phase two

The **short** version: pull the _old_ switch, land the new one, and
keep the ~~three~~ two uplinks live throughout.

## Before the window

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

Replacement rails ordered from https://example.invalid/product?id=1234
`

/**
 * Alignment from the delimiter row, inline markup inside cells, a
 * deliberately blank cell, and a row that is one column short —
 * every table decision in one fixture.
 */
const TABLES = `## Rack inventory

| Port | Goes to | **Speed** | Notes |
| :--- | :---: | ---: | --- |
| 1 | uplink | 10G | swapped \`2026-08-19\` |
| 2 |  | 1G | see [the runbook](https://example.invalid/runbook) |
| 3 | shelf | 1G |
| 4 | ~~spare~~ | — | pulled |

A table with no outer pipes is still a table:

Disk | Size
--- | ---:
front-left | 18 TB
front-right | 18 TB
`

const meta = {
  title: "Components/Controls/MarkdownEditorCodeMirror",
  component: MarkdownEditorCodeMirror,
  parameters: { layout: "padded" },
  args: {
    isDisabled: false,
    isReadOnly: false,
    label: "Description",
    placeholder: "Write it in markdown…",
  },
} satisfies Meta<typeof MarkdownEditorCodeMirror>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The whole argument for this subpath, in one frame: the heading is
 * genuinely larger, `**` is nowhere on screen, the checkboxes are
 * checkboxes, and the bare URL is a link.
 */
export const Default: Story = {
  args: {
    defaultValue: SAMPLE,
    label: "Description",
  },
}

/**
 * The "edit Markdown" toggle, flipped.
 *
 * Nothing is concealed and no line is rescaled — but the syntax is
 * still coloured, because the point of the toggle is to see the
 * markup, not to lose the highlighting.
 */
export const RawMode: Story = {
  args: {
    defaultValue: SAMPLE,
    isRawModeDefault: true,
    label: "Description",
  },
}

export const AllStates: Story = {
  args: { label: "Description" },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="empty">
        <MarkdownEditorCodeMirror
          label="Empty description"
          placeholder="Write it in markdown…"
        />
      </StoryCell>

      <StoryCell align="stretch" label="read only">
        <MarkdownEditorCodeMirror
          defaultValue={
            "A **done** description.\n\n- [x] shipped"
          }
          isReadOnly
          label="Read-only description"
        />
      </StoryCell>

      <StoryCell align="stretch" label="disabled">
        <MarkdownEditorCodeMirror
          defaultValue={"You cannot edit _this_ one."}
          isDisabled
          label="Disabled description"
        />
      </StoryCell>

      <StoryCell align="stretch" label="in a Field">
        <Field
          description="Markdown. Paste a screenshot straight in."
          label="Description"
        >
          <MarkdownEditorCodeMirror defaultValue="Wired through `SlotProps`." />
        </Field>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Concealment is per-construct, and the caret is what reveals it.
 *
 * This story exists because the behaviour is invisible in a static
 * frame: click into the bold run and the `**` comes back, in the
 * flow, without the line reflowing around it.
 */
export const CaretReveal: Story = {
  args: {
    defaultValue:
      "Click into the **bold run** and its markers come back.\n\nLeave, and they go again.",
    label: "Description",
  },
}

/**
 * The construct whose meaning is geometry.
 *
 * Everything else on this surface is a decoration hung on text that
 * is drawn anyway — a column is not, because column two's text is
 * on four separate lines. So the pipes stop being drawn and a real
 * table is drawn instead, alignment and all, with `**bold**` and
 * links rendering inside the cells like anywhere else.
 *
 * Click a cell and the markdown comes back with the caret in that
 * cell — the same trade the rest of the surface makes for a link or
 * an image.
 */
export const Tables: Story = {
  args: {
    defaultValue: TABLES,
    label: "Description",
  },
}
