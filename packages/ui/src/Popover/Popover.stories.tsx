import { useVisibility } from "@charcuterie/logic"
import type { Placement } from "@floating-ui/react"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"

import { placementArgType } from "../argTypes.storyHelpers.ts"
import { Badge } from "../Badge/Badge.tsx"
import { Button } from "../Button/Button.tsx"
import {
  StoryCell,
  StoryGrid,
  StoryRow,
} from "../board.storyHelpers.tsx"
import { Popover } from "./Popover.tsx"

const meta = {
  title: "Components/Popover",
  component: Popover,
  parameters: { layout: "padded" },
  argTypes: { placement: placementArgType },
  args: { placement: "bottom-start" },
} satisfies Meta<typeof Popover>

export default meta

type Story = StoryObj<typeof meta>

/**
 * One `useVisibility` per popover, and the trigger is a real
 * `Button` that the component clones rather than wraps.
 */
const PopoverDemo = ({
  children,
  heading,
  placement,
  triggerLabel,
}: {
  children?: ReactNode
  heading: string
  placement?: Placement
  triggerLabel: string
}): ReactNode => {
  const { hide, isVisible, toggle } = useVisibility()

  return (
    <Popover
      heading={heading}
      isVisible={isVisible}
      onDismiss={hide}
      placement={placement}
      trigger={
        <Button
          appearance="soft"
          onClick={toggle}
          size="sm"
        >
          {triggerLabel}
        </Button>
      }
    >
      {children ?? (
        <div className="flex flex-col gap-2">
          <p className="text-content-secondary">
            Filters apply to this bay only.
          </p>

          <Button appearance="outline" size="sm">
            Clear filters
          </Button>
        </div>
      )}
    </Popover>
  )
}

export const Default: Story = {
  args: {
    children: null,
    heading: "Filters",
    isVisible: false,
    onDismiss: () => {},
    trigger: <Button>Filters</Button>,
  },
  render: () => (
    <PopoverDemo heading="Filters" triggerLabel="Filters" />
  ),
}

const PLACEMENTS: Placement[] = [
  "top",
  "bottom-start",
  "right",
  "left-end",
]

export const AllVariants: Story = {
  args: {
    children: null,
    heading: "Filters",
    isVisible: false,
    onDismiss: () => {},
    trigger: <Button>Filters</Button>,
  },
  render: () => (
    <StoryGrid columns={4}>
      {PLACEMENTS.map((placement) => (
        <StoryCell key={placement} label={placement}>
          <PopoverDemo
            heading={`Filters — ${placement}`}
            placement={placement}
            triggerLabel={`Open ${placement}`}
          >
            <p className="text-content-secondary">
              Requested {placement}. `flip` and `shift` will
              overrule it rather than let the panel leave
              the viewport.
            </p>
          </PopoverDemo>
        </StoryCell>
      ))}
    </StoryGrid>
  ),
}

export const AllStates: Story = {
  args: {
    children: null,
    heading: "Filters",
    isVisible: false,
    onDismiss: () => {},
    trigger: <Button>Filters</Button>,
  },
  render: () => (
    <StoryRow>
      <PopoverDemo
        heading="Bay 3 filters"
        triggerLabel="Interactive content"
      />

      <PopoverDemo
        heading="Read error detail"
        triggerLabel="Text only"
      >
        <p className="text-content-secondary">
          MakeMKV reported a read error on title 4 at
          00:41:12. Eight of nine titles completed.
        </p>
      </PopoverDemo>

      <PopoverDemo
        heading="Bay 3 status"
        triggerLabel="With a badge"
      >
        <div className="flex flex-col gap-2">
          <Badge intent="warning" size="sm">
            degraded
          </Badge>

          <p className="text-content-secondary">
            One read retry in the last hour.
          </p>
        </div>
      </PopoverDemo>
    </StoryRow>
  ),
}

/**
 * The board a container query cannot help with, and for the
 * opposite reason to `Modal`'s. A popover is positioned against the
 * **viewport** — `flip` and `shift` measure collisions with it — so
 * what varies is where the trigger sits on screen, not how wide its
 * container is. Three triggers pinned to three edges is the honest
 * instrument.
 */
export const Responsive: Story = {
  args: {
    children: null,
    heading: "Filters",
    isVisible: false,
    onDismiss: () => {},
    trigger: <Button>Filters</Button>,
  },
  render: () => (
    <div className="flex min-h-64 flex-col justify-between gap-4">
      <div className="flex justify-between">
        <PopoverDemo
          heading="Filters — top start"
          placement="top"
          triggerLabel="Top edge, asks for top"
        >
          <p className="text-content-secondary">
            Asked for `top`, has no room, so `flip` sends it
            down.
          </p>
        </PopoverDemo>

        <PopoverDemo
          heading="Filters — top end"
          placement="right"
          triggerLabel="Right edge, asks for right"
        >
          <p className="text-content-secondary">
            Asked for `right`, has no room, so `shift` and
            `flip` bring it back inside.
          </p>
        </PopoverDemo>
      </div>

      <PopoverDemo
        heading="Filters — bottom"
        placement="bottom"
        triggerLabel="Bottom, asks for bottom"
      >
        <p className="text-content-secondary">
          Room below, so it gets what it asked for.
        </p>
      </PopoverDemo>
    </div>
  ),
}

/**
 * The dismiss layer, driven. Outside press and Escape both route
 * through `useDismiss` → `onDismiss` → `hide()`, so the panel is
 * never closed by anything except the state saying so.
 *
 * Escape *is* pressable here, unlike `Modal`'s: `useDismiss`
 * listens for a keydown rather than relying on a UA default
 * action, and a synthetic keydown is a real keydown as far as a
 * listener is concerned.
 */
export const Interactive: Story = {
  args: {
    children: null,
    heading: "Filters",
    isVisible: false,
    onDismiss: () => {},
    trigger: <Button>Filters</Button>,
  },
  render: () => (
    <PopoverDemo
      heading="Bay 3 filters"
      triggerLabel="Filters"
    />
  ),
}

/**
 * The bug the whole M8 portal reversal exists to fix. The trigger sits
 * inside a small `overflow: hidden` box — the top layer was still
 * clipped by it; a `FloatingPortal` to `document.body` is not. Open it
 * and the panel escapes the clip whole.
 */
export const EscapesOverflowClip: Story = {
  args: {
    children: null,
    heading: "Filters",
    isVisible: false,
    onDismiss: () => {},
    trigger: <Button>Filters</Button>,
  },
  render: () => (
    <div className="h-24 w-56 overflow-hidden rounded-md border border-border-default bg-surface-raised p-3">
      <p className="mb-2 text-content-secondary text-xs">
        This box is `overflow: hidden`.
      </p>

      <PopoverDemo
        heading="Escapes the clip"
        triggerLabel="Open (escapes the clip)"
      >
        <p className="text-content-secondary">
          Portalled to the body, so the clip cannot reach
          it.
        </p>
      </PopoverDemo>
    </div>
  ),
}
