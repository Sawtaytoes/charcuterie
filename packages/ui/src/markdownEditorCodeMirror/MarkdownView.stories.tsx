import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { Card } from "../Card/Card.tsx"
import { MarkdownEditorCodeMirror } from "./MarkdownEditorCodeMirror.tsx"
import { MarkdownView } from "./MarkdownView.tsx"

/**
 * Invented, like every fixture in this repo — a task in a made-up
 * homelab project, and deliberately the **same string** the editor's
 * stories use.
 *
 * That is what makes the `SameAsTheEditor` story an argument rather
 * than an illustration: the two surfaces are handed one document and
 * a reader compares the frames.
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
 * Link text with inline markup in it — the shape that used to take
 * the **whole document** down to raw source.
 *
 * The closing bracket was read as the node right after `[`, which
 * is the bracket only while the link text is plain prose. A code
 * span or a `**bold**` run becomes that node instead, the link text
 * measures zero characters, `Decoration.mark` refuses an empty
 * range, and the throw destroys the view plugin — so every
 * decoration in the file disappears at once, not just this link's.
 *
 * Invented, like every fixture here, but the shape is not invented:
 * agent-written task descriptions are full of ``[`file.md`](path)``.
 */
const NESTED_LINK_TEXT = `## Where the fix landed

The range walk lives in [\`livePreviewRanges.ts\`](https://example.invalid/ranges)
and the decorations in [\`livePreview.ts\`](https://example.invalid/preview).

- A code span: [\`AGENTS.md\`](https://example.invalid/agents)
- Strong: [**the runbook**](https://example.invalid/runbook)
- Emphasis: [*the older note*](https://example.invalid/note)
- Struck through: [~~the retired page~~](https://example.invalid/retired)
- Mixed: [read \`this\` **first**](https://example.invalid/first)

Plain links still work: [the index](https://example.invalid/index).
`

/**
 * A drawing rather than a fetched file, so the story needs no
 * network and the frame is the same on every machine. The same
 * technique `Avatar`'s portrait uses, and one of the few things
 * `data:` is genuinely good for.
 */
const DIAGRAM_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"><rect width="240" height="60" rx="6" fill="#2F6F4E"/><rect x="12" y="14" width="96" height="32" rx="4" fill="#F2E8CF"/><rect x="132" y="14" width="96" height="32" rx="4" fill="#F2E8CF"/><path d="M108 30h24" stroke="#F2E8CF" stroke-width="4"/></svg>',
)}`

const WITH_IMAGE = `## Rack inventory

![Two shelves and the uplink between them](${DIAGRAM_URL})

| Port | Goes to | **Speed** |
| :--- | :---: | ---: |
| 1 | uplink | 10G |
| 2 | shelf | 1G |
`

/**
 * The document nobody in this house wrote: what a fetched file looks
 * like when its author would rather it did something else.
 *
 * Every line here is a thing that used to work. The `javascript:`
 * link opened and ran; the `<script>` was never a script but is
 * worth showing anyway; the `data:text/html` image was an `src` this
 * component wrote verbatim.
 */
const HOSTILE = `# A file fetched from somewhere else

[Looks like a link](javascript:alert(document.domain)) — and is not one.

<script>alert("this is four coloured characters, not a script")</script>

<img src=x onerror="alert(1)">

![Not an image](data:text/html,<script>alert(1)</script>)

[This one is fine](https://example.invalid/runbook), and so is ./RELEASING.md.
`

const CHECKLIST = `## Before the window

- [x] Label every patch lead
- [ ] Photograph the current cabling
- [ ] Cut over at 02:00
`

/**
 * A second list rather than the same one twice, and the difference
 * is load bearing: two checkboxes with the same accessible name on
 * one page are two things `getByRole("checkbox", { name })` cannot
 * tell apart — which is the drivability property this library gates
 * on, failing in a *story* rather than in a component.
 */
const TICKABLE_CHECKLIST = `## After the window

- [x] Bring the shelf back up
- [ ] Re-check both uplinks
- [ ] Close the change record
`

/**
 * The state the checkbox story cannot show without one: a tick that
 * goes somewhere.
 *
 * `onToggleTask` hands back the whole next markdown document, which
 * is the same shape the editors' `onChange` uses — so a consumer
 * wires one autosave and points both at it.
 */
const TickableChecklist = () => {
  const [value, setValue] = useState(TICKABLE_CHECKLIST)

  return (
    <MarkdownView
      label="Tickable checklist"
      onToggleTask={setValue}
      value={value}
    />
  )
}

const meta = {
  title: "Components/Data/MarkdownView",
  component: MarkdownView,
  parameters: { layout: "padded" },
  args: {
    label: "Description",
    onToggleTask: undefined,
    value: SAMPLE,
  },
} satisfies Meta<typeof MarkdownView>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The whole point in one frame: the document is drawn, and there is
 * **no toolbar above it**. Not a disabled one, not a hidden one —
 * `getAllByRole("toolbar")` returns nothing, because nothing in this
 * component can render one.
 */
export const Default: Story = {}

/**
 * The same string, in both surfaces, side by side.
 *
 * This is the requirement the component exists to meet, and it is
 * the one a screenshot can actually check: the heading is the same
 * size, the table has the same borders and the same alignment, the
 * checkboxes are in the same places, and the bare URL is a link in
 * both. They agree because they are the same code — one parser, one
 * set of range rules, one theme — rather than because somebody kept
 * two renderers in step.
 */
export const SameAsTheEditor: Story = {
  render: (viewProps) => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="MarkdownView">
        <MarkdownView {...viewProps} />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="MarkdownEditorCodeMirror"
      >
        <MarkdownEditorCodeMirror
          defaultValue={SAMPLE}
          label="Description"
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Everything the reader can be shown, including the two states that
 * are easy to get wrong: an empty document, and a checkbox nobody
 * may tick.
 */
export const AllStates: Story = {
  render: (viewProps) => (
    <StoryGrid columns={2}>
      <StoryCell
        align="stretch"
        label="checkboxes are inert without onToggleTask"
      >
        <MarkdownView
          {...viewProps}
          label="Read-only checklist"
          value={CHECKLIST}
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="…and operable with one"
      >
        <TickableChecklist />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="an image and a table"
      >
        <MarkdownView
          {...viewProps}
          label="Rack inventory"
          value={WITH_IMAGE}
        />
      </StoryCell>

      <StoryCell align="stretch" label="an empty document">
        <MarkdownView
          {...viewProps}
          label="Nothing written yet"
          value=""
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * A file from a git host, rendering as the characters it contains.
 *
 * The `javascript:` link keeps its brackets and its parentheses on
 * purpose. A link-coloured word that silently refuses to work tells
 * the reader nothing; the source tells them exactly what the file
 * tried to do.
 */
export const HostileMarkdown: Story = {
  args: {
    label: "README.md at 9f3c1ab",
    value: HOSTILE,
  },
}

/**
 * The three container widths. A table that will not fit scrolls
 * inside its own block rather than pushing the column sideways, and
 * an image is capped at the width it is given — which is what keeps
 * the Narrow View readable instead of merely small.
 */
export const Responsive: Story = {
  render: (viewProps) => (
    <ContainerBoard>
      {(width) => (
        <Card heading={`Rack inventory (${width})`}>
          <MarkdownView
            {...viewProps}
            label={`Rack inventory at ${width}`}
            value={WITH_IMAGE}
          />
        </Card>
      )}
    </ContainerBoard>
  ),
}

/**
 * The complete keyboard path, which for a reader is short and is the
 * point.
 *
 * The document itself is **not** a tab stop — there is nothing in it
 * to operate, and a reading surface that swallowed a Tab would be
 * one more thing between the reader and the next control. What *is*
 * reachable is every link in it, in document order, because they are
 * real anchors rather than painted spans: Tab to one, Enter to open
 * it, and the context menu will copy its address.
 *
 * The buttons on either side are there so the path is visible — Tab
 * from the first lands on each link in turn and ends on the second.
 */
export const Interactive: Story = {
  args: {
    label: "Rack move, phase two",
    value: SAMPLE,
  },
  render: (viewProps) => (
    <div className="flex flex-col items-start gap-3">
      <button
        className="rounded-md border border-border-default px-3 py-1 text-content-primary text-sm"
        type="button"
      >
        {"Before"}
      </button>

      <MarkdownView {...viewProps} />

      <button
        className="rounded-md border border-border-default px-3 py-1 text-content-primary text-sm"
        type="button"
      >
        {"After"}
      </button>
    </div>
  ),
}

/**
 * The regression frame.
 *
 * Every line here is a link whose text carries inline markup, and
 * the assertion a reader can make from the picture is the one that
 * matters: the document is **drawn**. Before the fix this frame was
 * the markdown source, brackets and parentheses and all, because
 * one empty mark decoration killed the plugin for the whole file.
 *
 * The last line is the control. A plain `[text](url)` never had the
 * bug, so if it renders and the ones above it do not, the failure
 * is this and not something else.
 */
export const NestedLinkText: Story = {
  args: {
    label: "Where the fix landed",
    value: NESTED_LINK_TEXT,
  },
}
