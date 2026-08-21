import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"

import { intentArgType } from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { Toast } from "./Toast.tsx"
import type { ToastRecord } from "./ToastRegion.tsx"
import { ToastRegion } from "./ToastRegion.tsx"

const noop = () => undefined

/**
 * `duration={0}` throughout the boards. A toast that removes itself
 * after five seconds makes a screenshot a race, and pinning it open
 * is the documented way to hold one for an action anyway.
 */
const meta = {
  title: "Components/Overlays/Toast",
  component: Toast,
  parameters: { layout: "padded" },
  argTypes: { intent: intentArgType },
  args: {
    duration: 0,
    intent: "neutral",
    onRemove: noop,
    title: "Rip finished",
  },
} satisfies Meta<typeof Toast>

export default meta

type Story = StoryObj<typeof meta>

const ToastList = ({
  children,
}: {
  children: ReactNode
}): ReactNode => (
  <ul className="flex w-full max-w-sm list-none flex-col gap-2 p-0">
    {children}
  </ul>
)

export const Default: Story = {
  args: {
    children: "Blade Runner (1982) · 9 titles.",
    title: "Rip finished",
  },
  render: (args) => (
    <ToastList>
      <Toast {...args} />
    </ToastList>
  ),
}

export const AllVariants: Story = {
  args: { title: "Rip finished" },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell label="success">
        <ToastList>
          <Toast
            duration={0}
            intent="success"
            onRemove={noop}
            title="Rip finished"
          >
            Blade Runner (1982) · 9 titles.
          </Toast>
        </ToastList>
      </StoryCell>

      <StoryCell label="warning">
        <ToastList>
          <Toast
            duration={0}
            intent="warning"
            onRemove={noop}
            title="Retried title 4"
          >
            Two read errors, recovered.
          </Toast>
        </ToastList>
      </StoryCell>

      <StoryCell label="danger">
        <ToastList>
          <Toast
            duration={0}
            intent="danger"
            onRemove={noop}
            title="Bay 3 offline"
          />
        </ToastList>
      </StoryCell>

      <StoryCell label="no description">
        <ToastList>
          <Toast
            duration={0}
            intent="info"
            onRemove={noop}
            title="Order saved"
          />
        </ToastList>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * The lifecycle, laid out. `entering` and `exiting` are both
 * *painted* states — a toast that is leaving still occupies its
 * slot — which is exactly what a boolean cannot express and why
 * this is a `Status`.
 */
export const AllStates: Story = {
  args: { title: "Rip finished" },
  render: () => (
    <ToastList>
      <Toast
        duration={0}
        intent="success"
        onRemove={noop}
        title="Pinned open"
      >
        `duration={0}` — stays until dismissed, which is
        what a toast carrying an action has to do.
      </Toast>

      <Toast
        duration={60_000}
        intent="info"
        onRemove={noop}
        title="Timed"
      >
        Hovering pauses it, which is why `exiting → visible`
        is a legal transition.
      </Toast>
    </ToastList>
  ),
}

/**
 * The region, doing its actual job. Add a few and watch them stack;
 * each removes itself when its own machine reaches `removed`, and
 * the list belongs to the app rather than to this library.
 */
export const Interactive: Story = {
  args: { title: "Rip finished" },
  render: function InteractiveRegion() {
    const [toasts, setToasts] = useState<ToastRecord[]>([])

    const [count, setCount] = useState(0)

    return (
      <>
        <Button
          onClick={() => {
            setCount((previous) => previous + 1)

            setToasts((previous) => [
              ...previous,
              {
                description: `Bay ${count + 1} finished.`,
                intent: "success",
                key: `rip-${count}`,
                title: `Rip ${count + 1} finished`,
              },
            ])
          }}
        >
          Finish a rip
        </Button>

        <ToastRegion
          onDismiss={(key) => {
            setToasts((previous) =>
              previous.filter((one) => one.key !== key),
            )
          }}
          toasts={toasts}
        />
      </>
    )
  },
}
