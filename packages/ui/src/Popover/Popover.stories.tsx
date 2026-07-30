import { useVisibility } from "@charcuterie/logic"
import type { Placement } from "@floating-ui/react"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { expect, waitFor } from "storybook/test"

import { Badge } from "../Badge/Badge.tsx"
import { Button } from "../Button/Button.tsx"
import {
  StoryCell,
  StoryGrid,
  StoryRow,
} from "../board.storyHelpers.tsx"
import { expectAgentDrivable } from "../testing/index.ts"
import { Popover } from "./Popover.tsx"

const meta = {
  title: "Components/Popover",
  component: Popover,
  parameters: { layout: "padded" },
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
  play: async ({ canvas, userEvent }) => {
    const trigger = expectAgentDrivable(canvas, {
      name: "Filters",
      role: "button",
    })

    await expect(trigger).toHaveAttribute(
      "aria-expanded",
      "false",
    )

    await userEvent.click(trigger)

    // Found through `canvas`, not `screen` — the panel is in the
    // top layer and still in this story's DOM, which a portal
    // would have cost.
    const panel = expectAgentDrivable(canvas, {
      name: "Filters",
      role: "dialog",
    })

    // `aria-controls` really points at the panel. An id that has
    // drifted renders identically and announces nothing, which is
    // why `useRole` owns both ends of it.
    await expect(trigger).toHaveAttribute(
      "aria-controls",
      panel.id,
    )

    await expect(panel).toHaveAttribute("popover", "manual")
  },
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
  play: async ({ canvas, userEvent }) => {
    // The first cell, so the panel drops into empty space instead
    // of covering the label of the cell beside it — a board is for
    // reading, and a popover overlaying one of its own captions
    // teaches nothing that `Responsive` does not.
    await userEvent.click(
      expectAgentDrivable(canvas, {
        name: "Open top",
        role: "button",
      }),
    )

    const panel = expectAgentDrivable(canvas, {
      name: "Filters — top",
      role: "dialog",
    })

    // Positioned at all, which is the thing that silently fails if
    // the UA's `inset: 0; margin: auto` is left in place: the panel
    // would sit dead centre of the viewport looking deliberate.
    const { left, top } = panel.getBoundingClientRect()

    await expect(left).toBeGreaterThan(0)

    await expect(top).toBeGreaterThan(0)
  },
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
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      expectAgentDrivable(canvas, {
        name: "Text only",
        role: "button",
      }),
    )

    const panel = expectAgentDrivable(canvas, {
      name: "Read error detail",
      role: "dialog",
    })

    // A panel with nothing tabbable inside still has to be
    // reachable, or a keyboard user is told a dialog opened and
    // then cannot get to it. `FloatingFocusManager` puts the panel
    // itself in the tab order — `tabindex="0"`, not `-1`, so Tab
    // reaches it and not only the programmatic focus does.
    await expect(panel).toHaveAttribute("tabindex", "0")

    await waitFor(() => {
      expect(panel.contains(document.activeElement)).toBe(
        true,
      )
    })
  },
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
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      expectAgentDrivable(canvas, {
        name: "Top edge, asks for top",
        role: "button",
      }),
    )

    const panel = expectAgentDrivable(canvas, {
      name: "Filters — top start",
      role: "dialog",
    })

    // Inside the viewport, which is the only thing `flip` and
    // `shift` actually promise — asserting a specific side would
    // be asserting the collision *did not* happen.
    const rect = panel.getBoundingClientRect()

    await expect(rect.top).toBeGreaterThanOrEqual(0)

    await expect(rect.bottom).toBeLessThanOrEqual(
      globalThis.innerHeight,
    )

    await expect(rect.left).toBeGreaterThanOrEqual(0)

    await expect(rect.right).toBeLessThanOrEqual(
      globalThis.innerWidth,
    )
  },
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
  play: async ({ canvas, userEvent }) => {
    const trigger = expectAgentDrivable(canvas, {
      name: "Filters",
      role: "button",
    })

    await userEvent.click(trigger)

    expectAgentDrivable(canvas, {
      name: "Bay 3 filters",
      role: "dialog",
    })

    await userEvent.keyboard("{Escape}")

    await waitFor(() => {
      expect(canvas.queryByRole("dialog")).toBeNull()
    })

    await expect(trigger).toHaveAttribute(
      "aria-expanded",
      "false",
    )

    // Reopened, then dismissed by pressing the page behind it.
    await userEvent.click(trigger)

    await waitFor(() => {
      expect(canvas.getByRole("dialog")).toBeInTheDocument()
    })

    await userEvent.click(document.body)

    await waitFor(() => {
      expect(canvas.queryByRole("dialog")).toBeNull()
    })
  },
}
