import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { FileDropZone } from "./FileDropZone.tsx"

const noop = () => undefined

const meta = {
  title: "Components/Controls/FileDropZone",
  component: FileDropZone,
  parameters: { layout: "padded" },
  args: {
    isDisabled: false,
    isMultiple: false,
    label: "Drop a disc image here",
    onDropFiles: noop,
  },
} satisfies Meta<typeof FileDropZone>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    description: "ISO or MKV, up to 50 GB.",
    label: "Drop a disc image here",
  },
}

export const AllVariants: Story = {
  args: { label: "Drop a disc image here" },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="single file">
        <FileDropZone
          description="ISO or MKV, up to 50 GB."
          label="Drop a disc image"
          onDropFiles={noop}
        />
      </StoryCell>

      <StoryCell align="stretch" label="multiple">
        <FileDropZone
          description="Several at once."
          isMultiple
          label="Drop subtitle files"
          onDropFiles={noop}
        />
      </StoryCell>

      <StoryCell align="stretch" label="accepting a type">
        <FileDropZone
          accept=".srt,.ass"
          description="Subtitles only."
          label="Drop a subtitle track"
          onDropFiles={noop}
        />
      </StoryCell>

      <StoryCell align="stretch" label="no description">
        <FileDropZone
          label="Drop anything"
          onDropFiles={noop}
        />
      </StoryCell>
    </StoryGrid>
  ),
}

export const AllStates: Story = {
  args: { label: "Drop a disc image here" },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="idle">
        <FileDropZone
          label="Drop an idle image"
          onDropFiles={noop}
        />
      </StoryCell>

      <StoryCell align="stretch" label="disabled">
        <FileDropZone
          description="A rip is already running."
          isDisabled
          label="Drop a disabled image"
          onDropFiles={noop}
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Tab to it and press Enter — the file picker opens, which is the
 * whole point: **there is no keyboard gesture for drag-and-drop**,
 * so the zone is a `<label>` around a real `<input type="file">` and
 * the drop handlers are an enhancement on top of a control that
 * already works without them.
 *
 * Dragging a *link* reports through `onDropText`, because a browser
 * hands over a dragged URL as `text/plain` with no files at all —
 * which is what gallery-downloader's page is built entirely around.
 */
export const Interactive: Story = {
  args: { label: "Drop a disc image here" },
  render: function DropTarget() {
    const [dropped, setDropped] = useState<string[]>([])

    return (
      <div className="flex flex-col gap-3">
        <FileDropZone
          description="Files, or a dragged link."
          isMultiple
          label="Drop files or a link"
          onDropFiles={(files) => {
            setDropped(files.map((file) => file.name))
          }}
          onDropText={(text) => {
            setDropped([text])
          }}
        />

        <ul className="list-none p-0 text-content-secondary text-sm">
          {dropped.map((one) => (
            <li key={one}>{one}</li>
          ))}
        </ul>
      </div>
    )
  },
}
