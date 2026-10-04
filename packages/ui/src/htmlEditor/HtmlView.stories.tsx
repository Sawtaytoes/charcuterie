import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { HtmlView } from "./HtmlView.tsx"
import {
  DOCUMENT_IMAGE,
  HOSTILE_HTML,
  HTML_DOCUMENT,
} from "./htmlDocument.storyHelpers.ts"

const meta = {
  title: "Components/Data/HtmlView",
  component: HtmlView,
  parameters: { layout: "padded" },
  args: { label: "Saved notes", value: HTML_DOCUMENT },
} satisfies Meta<typeof HtmlView>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: playgroundParameters,
}
export const AllVariants: Story = {
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell
        align="stretch"
        label="Rich paragraphs and lists"
      >
        <HtmlView
          label="Rich notes"
          value={HTML_DOCUMENT}
        />
      </StoryCell>
      <StoryCell align="stretch" label="Safe image">
        <HtmlView
          label="Illustrated notes"
          value={`<p>Mounting fixture</p><img src="${DOCUMENT_IMAGE}" alt="Fixture illustration">`}
        />
      </StoryCell>
      <StoryCell align="stretch" label="Relative link">
        <HtmlView
          label="Linked notes"
          value='<p>Read <a href="./instructions">the instructions</a>.</p>'
        />
      </StoryCell>
      <StoryCell
        align="stretch"
        label="Code and line breaks"
      >
        <HtmlView
          label="Technical notes"
          value="<p>Inspect<br>then assemble.</p><pre><code>width = 24 &lt; 32</code></pre>"
        />
      </StoryCell>
    </StoryGrid>
  ),
}
export const AllStates: Story = {
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="Saved">
        <HtmlView
          label="Saved document"
          value={HTML_DOCUMENT}
        />
      </StoryCell>
      <StoryCell align="stretch" label="Empty">
        <HtmlView label="Empty document" value="" />
      </StoryCell>
      <StoryCell
        align="stretch"
        label="Untrusted HTML is filtered"
      >
        <HtmlView
          label="Filtered document"
          value={HOSTILE_HTML}
        />
      </StoryCell>
    </StoryGrid>
  ),
}
export const Responsive: Story = {
  render: () => (
    <ContainerBoard>
      {(width) => (
        <HtmlView
          label={`Notes at ${width}`}
          value={`${HTML_DOCUMENT}<p>https://example.invalid/an-extremely-long-source-path-with-no-spaces-in-the-identifier-for-a-recipe-revision</p>`}
        />
      )}
    </ContainerBoard>
  ),
}
export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState(HTML_DOCUMENT)
    return (
      <div className="space-y-4">
        <Button
          onClick={() =>
            setValue(
              "<p>Updated <strong>saved notes</strong>.</p>",
            )
          }
        >
          Show next revision
        </Button>
        <HtmlView label="Current revision" value={value} />
      </div>
    )
  },
}
