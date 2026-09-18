import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"

import { intentArgType } from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { Modal } from "../Modal/Modal.tsx"
import { OverlayStackProvider } from "../Overlay/OverlayStack.tsx"
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

export const Playground: Story = {
  parameters: playgroundParameters,
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

/**
 * Twelve at once, which is the case the bottom-anchored column
 * cannot hold. Without a bound the oldest climb off the top of the
 * page and take the stack with them; the list is capped, pinned to
 * its bottom edge, and scrolls. The newest is always the one on
 * screen.
 */
export const ManyAtOnce: Story = {
  args: { title: "Rip finished" },
  parameters: { layout: "fullscreen" },
  render: function ManyRegion() {
    const [toasts, setToasts] = useState<ToastRecord[]>(
      Array.from({ length: 12 }, (_, index) => ({
        description: `Bay ${index + 1} finished.`,
        duration: 0,
        intent: "success" as const,
        key: `rip-${index}`,
        title: `Rip ${index + 1} finished`,
      })),
    )

    return (
      <div className="h-dvh">
        <ToastRegion
          onDismiss={(key) => {
            setToasts((previous) =>
              previous.filter((one) => one.key !== key),
            )
          }}
          toasts={toasts}
        />
      </div>
    )
  },
}

/**
 * The story the `z-50` bug needed and never had.
 *
 * Two stacked modals and a pinned toast carrying an Undo. Three
 * things have to be true at once, and each one was false before the
 * layering change:
 *
 * 1. The toast paints **above both modals**, which cascade at
 *    `--layer-modal + n`.
 * 2. Pressing its Undo does **not** close the modal — a press on a
 *    toast is not an outside press.
 * 3. The toast stays in the accessibility tree while the focus
 *    manager hides the rest of the page.
 */
export const OverStackedModals: Story = {
  args: { title: "Rip finished" },
  parameters: { layout: "fullscreen" },
  render: function OverModalsRegion() {
    const [isOuterVisible, setIsOuterVisible] =
      useState(true)

    const [isInnerVisible, setIsInnerVisible] =
      useState(true)

    const [isUndone, setIsUndone] = useState(false)

    const [toasts, setToasts] = useState<ToastRecord[]>([
      {
        description: "Undo",
        duration: 0,
        intent: "success",
        key: "moved",
        title: "Moved to Done",
      },
    ])

    return (
      <OverlayStackProvider>
        <div className="h-dvh p-4">
          {/* Page content beside the region, and load-bearing.
              `markOthers` marks it, which is what makes
              `OverlayPanel`'s `outsidePress` predicate decide the
              press on Undo — a story holding nothing but the
              region takes a different branch inside floating-ui
              and passes whether the guard exists or not. */}
          <h2 className="m-0 text-lg">Rip queue</h2>

          <p className="m-0">
            Four bays, three of them busy.
          </p>

          <Modal
            aria-label="Rip settings"
            isVisible={isOuterVisible}
            onClose={() => {
              setIsOuterVisible(false)
            }}
          >
            <div className="flex flex-col gap-2 p-4">
              <p className="m-0">The outer modal.</p>

              <Button
                onClick={() => {
                  setIsInnerVisible(true)
                }}
              >
                Open the inner modal
              </Button>
            </div>
          </Modal>

          <Modal
            aria-label="Confirm the rip"
            isVisible={isOuterVisible && isInnerVisible}
            onClose={() => {
              setIsInnerVisible(false)
            }}
          >
            <div className="flex flex-col gap-2 p-4">
              <p className="m-0">
                The inner modal, on top of the outer one.
              </p>

              <p className="m-0">
                {isUndone ? "Undone" : "Not undone"}
              </p>
            </div>
          </Modal>

          <ToastRegion
            onDismiss={(key) => {
              setToasts((previous) =>
                previous.filter((one) => one.key !== key),
              )
            }}
            toasts={toasts.map((one) => ({
              ...one,
              description: (
                <Button
                  onClick={() => {
                    setIsUndone(true)
                  }}
                  appearance="ghost"
                  size="sm"
                >
                  Undo
                </Button>
              ),
            }))}
          />
        </div>
      </OverlayStackProvider>
    )
  },
}
