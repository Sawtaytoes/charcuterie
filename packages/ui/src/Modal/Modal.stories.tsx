import { useVisibility } from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"

import { Button } from "../Button/Button.tsx"
import { Modal } from "./Modal.tsx"

const meta = {
  title: "Components/Modal",
  component: Modal,
  parameters: { layout: "padded" },
  args: {
    isDismissable: true,
    role: "dialog",
  },
} satisfies Meta<typeof Modal>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The base layer has no chrome, so a demo supplies its own — the
 * point being that `Modal` is the backdrop-plus-dismiss-plus-portal
 * foundation and the content is entirely the caller's. `Dialog` is
 * the batteries-included version of exactly this.
 */
const ModalDemo = ({
  buttonLabel,
  children,
  label,
  role,
}: {
  buttonLabel: string
  children?: ReactNode
  label: string
  role?: "alertdialog" | "dialog"
}): ReactNode => {
  const { hide, isVisible, show } = useVisibility()

  return (
    <>
      <Button appearance="soft" onClick={show} size="sm">
        {buttonLabel}
      </Button>

      <Modal
        aria-label={label}
        isVisible={isVisible}
        onClose={hide}
        role={role}
      >
        <div className="flex flex-col gap-3 p-4">
          {children ?? (
            <p className="text-content-secondary text-sm">
              A bare `Modal`: a scrim, a focus trap, Escape,
              and an outside press. Everything you see
              inside is the caller's own markup.
            </p>
          )}

          <Button
            appearance="soft"
            intent="neutral"
            onClick={hide}
            size="sm"
          >
            Close
          </Button>
        </div>
      </Modal>
    </>
  )
}

export const Default: Story = {
  args: {
    "aria-label": "Read error on title 4",
    children: null,
    isVisible: false,
    onClose: () => {},
  },
  render: () => (
    <ModalDemo
      buttonLabel="Open the base modal"
      label="Read error on title 4"
    />
  ),
}

/**
 * `role="alertdialog"` is the one configuration the base exposes that
 * `Dialog` does not surface directly — an interruption the user has
 * to answer, announced as an alert rather than a plain dialog.
 */
export const Alert: Story = {
  args: {
    "aria-label": "Confirm erase",
    children: null,
    isVisible: false,
    onClose: () => {},
  },
  render: () => (
    <ModalDemo
      buttonLabel="Open an alertdialog"
      label="Confirm erase"
      role="alertdialog"
    >
      <p className="text-content-secondary text-sm">
        This erases eight completed titles.
      </p>
    </ModalDemo>
  ),
}

/**
 * The keyboard contract, driven. `OverlayPanel`'s
 * `FloatingFocusManager` traps focus and restores it to the trigger;
 * `useDismiss` routes Escape and an outside press through `onClose`.
 */
export const Interactive: Story = {
  args: {
    "aria-label": "Stop the rip?",
    children: null,
    isVisible: false,
    onClose: () => {},
  },
  render: () => (
    <ModalDemo
      buttonLabel="Stop the rip"
      label="Stop the rip?"
    >
      <p className="text-content-secondary text-sm">
        Escape, an outside press, or the button below all
        land on the same `onClose`.
      </p>
    </ModalDemo>
  ),
}
