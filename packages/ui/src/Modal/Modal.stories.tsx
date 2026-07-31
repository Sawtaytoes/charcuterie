import { useVisibility } from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"

import { toStoryChoice } from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import { StoryRow } from "../board.storyHelpers.tsx"
import type { ModalSize } from "./Modal.tsx"
import { Modal } from "./Modal.tsx"

const meta = {
  title: "Components/Modal",
  component: Modal,
  parameters: { layout: "padded" },
  argTypes: {
    size: toStoryChoice([
      "sm",
      "md",
      "lg",
      "xl",
      "full",
    ] as const),
  },
  args: {
    headingLevel: 2,
    isDismissable: true,
    size: "md",
  },
} satisfies Meta<typeof Modal>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Every board here is triggers-plus-one-open-dialog rather than a
 * grid, and that is the component rather than the stories being
 * awkward: `showModal()` puts a dialog in the **top layer**, so two
 * of them side by side is not a thing the platform can do. What the
 * boards show instead is the real arrangement — a page, a scrim,
 * and one dialog over both.
 *
 * `footer` is a function of `hide` because a dialog's own buttons
 * are the normal way out of it, and they need the same `hide` the
 * close button gets. One `useVisibility` per demo, no second source
 * of truth.
 */
const ModalDemo = ({
  buttonLabel,
  children,
  footer,
  heading,
  isDismissable = true,
  size,
}: {
  buttonLabel: string
  children?: ReactNode
  footer?: (hide: () => void) => ReactNode
  heading: string
  isDismissable?: boolean
  size?: ModalSize
}): ReactNode => {
  const { hide, isVisible, show } = useVisibility()

  return (
    <>
      <Button appearance="soft" onClick={show} size="sm">
        {buttonLabel}
      </Button>

      <Modal
        footer={footer?.(hide)}
        heading={heading}
        isDismissable={isDismissable}
        isVisible={isVisible}
        onClose={hide}
        size={size}
      >
        {children ?? (
          <p className="text-content-secondary text-sm">
            MakeMKV reported a read error on title 4. The
            rip can continue with the remaining eight
            titles, or stop here and keep what has
            completed.
          </p>
        )}
      </Modal>
    </>
  )
}

export const Default: Story = {
  args: {
    heading: "Bay 3",
    isVisible: false,
    onClose: () => {},
  },
  render: () => (
    <ModalDemo
      buttonLabel="Show the read error"
      heading="Read error on title 4"
    />
  ),
}

const SIZES: ModalSize[] = ["sm", "md", "lg", "xl", "full"]

export const AllVariants: Story = {
  args: {
    heading: "Bay 3",
    isVisible: false,
    onClose: () => {},
  },
  render: () => (
    <StoryRow>
      {SIZES.map((size) => (
        <ModalDemo
          buttonLabel={`Open ${size}`}
          heading={`Read error — ${size}`}
          key={size}
          size={size}
        />
      ))}
    </StoryRow>
  ),
}

export const AllStates: Story = {
  args: {
    heading: "Bay 3",
    isVisible: false,
    onClose: () => {},
  },
  render: () => (
    <StoryRow>
      <ModalDemo
        buttonLabel="With a footer"
        footer={(hide) => (
          <>
            <Button
              appearance="soft"
              intent="neutral"
              onClick={hide}
              size="sm"
            >
              Keep going
            </Button>

            <Button intent="danger" size="sm">
              Stop the rip
            </Button>
          </>
        )}
        heading="Stop the rip?"
      />

      <ModalDemo
        buttonLabel="Not dismissable"
        footer={(hide) => (
          <>
            <Button
              appearance="soft"
              intent="neutral"
              onClick={hide}
              size="sm"
            >
              Keep the titles
            </Button>

            <Button intent="danger" size="sm">
              Erase and re-rip
            </Button>
          </>
        )}
        heading="This erases eight completed titles"
        isDismissable={false}
      />

      <ModalDemo
        buttonLabel="Long body"
        heading="MakeMKV log"
      >
        <div className="flex flex-col gap-2">
          {Array.from(
            { length: 24 },
            (_, index) =>
              `14:0${index % 10}:22  title ${
                index + 1
              }  AACS handshake complete, reading…`,
          ).map((line) => (
            <p
              className="font-mono text-content-secondary text-xs"
              key={line}
            >
              {line}
            </p>
          ))}
        </div>
      </ModalDemo>
    </StoryRow>
  ),
}

/**
 * A modal is the one surface in this library that is **not** a
 * container-query citizen, so it gets no `ContainerBoard`. Its size
 * is measured against the viewport by definition — it is the thing
 * covering the viewport — and boarding it at three container widths
 * would be measuring something that has no bearing on it.
 *
 * What does vary is the clamp: every size caps at `85dvh`, and
 * `full` takes the lot. `dvh` rather than `vh` because on a phone
 * the two differ by the address bar, and a dialog whose footer is
 * underneath it is a dialog with no buttons.
 */
export const Responsive: Story = {
  args: {
    heading: "Bay 3",
    isVisible: false,
    onClose: () => {},
  },
  render: () => (
    <ModalDemo
      buttonLabel="Open full-bleed"
      heading="MakeMKV log — full"
      size="full"
    >
      <p className="text-content-secondary text-sm">
        `full` is the kiosk and phone case: the dialog is
        the screen, so there is nothing behind it worth
        showing.
      </p>
    </ModalDemo>
  ),
}

/**
 * The keyboard contract, driven. `showModal()` supplies the focus
 * trap and the focus restore; what this asserts is that the state
 * layer never disagrees with the element — Escape routes through
 * `onCancel` → `hide()` → the effect → `close()`, rather than the
 * browser closing the dialog behind the app's back.
 */
export const Interactive: Story = {
  args: {
    heading: "Bay 3",
    isVisible: false,
    onClose: () => {},
  },
  render: () => (
    <ModalDemo
      buttonLabel="Stop the rip"
      footer={(hide) => (
        <>
          <Button
            appearance="soft"
            intent="neutral"
            onClick={hide}
            size="sm"
          >
            Keep going
          </Button>

          <Button intent="danger" size="sm">
            Stop it now
          </Button>
        </>
      )}
      heading="Stop the rip?"
    />
  ),
}
