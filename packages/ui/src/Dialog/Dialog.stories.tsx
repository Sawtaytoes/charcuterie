import { useVisibility } from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"

import { toStoryChoice } from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import { StoryRow } from "../board.storyHelpers.tsx"
import { OverlayStackProvider } from "../Overlay/OverlayStack.tsx"
import type { DialogSize } from "./Dialog.tsx"
import { Dialog } from "./Dialog.tsx"

const meta = {
  title: "Components/Dialog",
  component: Dialog,
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
    // `render` supplies the real content; this satisfies the required
    // `children` for the Controls panel's arg type.
    children: null,
    headingLevel: 2,
    isDismissable: true,
    size: "md",
  },
} satisfies Meta<typeof Dialog>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Every board here is triggers-plus-one-open-dialog rather than a
 * grid, and that is the component rather than the stories being
 * awkward: a dialog covers the viewport, so two side by side is not
 * the real arrangement. What the boards show instead is a page, a
 * scrim, and one dialog over both.
 *
 * `footer` is a function of `hide` because a dialog's own buttons
 * are the normal way out of it, and they need the same `hide` the
 * close button gets. One `useVisibility` per demo, no second source
 * of truth.
 */
const DialogDemo = ({
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
  size?: DialogSize
}): ReactNode => {
  const { hide, isVisible, show } = useVisibility()

  return (
    <>
      <Button appearance="soft" onClick={show} size="sm">
        {buttonLabel}
      </Button>

      <Dialog
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
      </Dialog>
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
    <DialogDemo
      buttonLabel="Show the read error"
      heading="Read error on title 4"
    />
  ),
}

const SIZES: DialogSize[] = ["sm", "md", "lg", "xl", "full"]

export const AllVariants: Story = {
  args: {
    heading: "Bay 3",
    isVisible: false,
    onClose: () => {},
  },
  render: () => (
    <StoryRow>
      {SIZES.map((size) => (
        <DialogDemo
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
      <DialogDemo
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

      <DialogDemo
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

      <DialogDemo
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
      </DialogDemo>
    </StoryRow>
  ),
}

/**
 * Stacking — one dialog opened from inside another. An
 * `OverlayStackProvider` at the app root is the one piece of setup a
 * lone dialog does not need: it renders a **single** shared scrim
 * behind both, keeps the second on top, marks the first `inert`, and
 * closes them top-first on Escape or an outside press. Open the first,
 * then open the second from its footer.
 */
const StackedDemo = (): ReactNode => {
  const first = useVisibility()

  const second = useVisibility()

  return (
    <OverlayStackProvider>
      <Button
        appearance="soft"
        onClick={first.show}
        size="sm"
      >
        Open the first dialog
      </Button>

      <Dialog
        footer={
          <Button onClick={second.show} size="sm">
            Open a second over it
          </Button>
        }
        heading="First dialog"
        isVisible={first.isVisible}
        onClose={first.hide}
      >
        <p className="text-content-secondary text-sm">
          This one stays open and goes `inert` while the
          second is over it.
        </p>
      </Dialog>

      <Dialog
        footer={
          <Button
            appearance="soft"
            intent="neutral"
            onClick={second.hide}
            size="sm"
          >
            Close this one
          </Button>
        }
        heading="Second dialog"
        isVisible={second.isVisible}
        onClose={second.hide}
      >
        <p className="text-content-secondary text-sm">
          One scrim behind both. Escape or a backdrop press
          closes this one first.
        </p>
      </Dialog>
    </OverlayStackProvider>
  )
}

export const Stacked: Story = {
  args: {
    heading: "First dialog",
    isVisible: false,
    onClose: () => {},
  },
  render: () => <StackedDemo />,
}

/**
 * A dialog is the one surface in this library that is **not** a
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
    <DialogDemo
      buttonLabel="Open full-bleed"
      heading="MakeMKV log — full"
      size="full"
    >
      <p className="text-content-secondary text-sm">
        `full` is the kiosk and phone case: the dialog is
        the screen, so there is nothing behind it worth
        showing.
      </p>
    </DialogDemo>
  ),
}

/**
 * The keyboard contract, driven. `OverlayPanel`'s
 * `FloatingFocusManager` supplies the focus trap and the focus
 * restore, and `useDismiss` routes Escape through `onClose` — which,
 * unlike the old native `<dialog>`, a synthetic `userEvent.keyboard`
 * can now press for real.
 */
/**
 * A confirm dialog with **no body**: the question is the `heading`
 * (which is the dialog's accessible name) and the answers are the
 * `footer`. `children` is optional precisely for this shape — the old
 * chrome `Modal` extended `<dialog>`'s DOM props, so it allowed it,
 * and image-viewer's delete-confirm renders exactly this.
 */
const NoBodyDemo = (): ReactNode => {
  const { hide, isVisible, show } = useVisibility()

  return (
    <>
      <Button appearance="soft" onClick={show} size="sm">
        Delete the file
      </Button>

      <Dialog
        footer={
          <>
            <Button
              appearance="soft"
              intent="neutral"
              onClick={hide}
              size="sm"
            >
              Keep it
            </Button>

            <Button intent="danger" size="sm">
              Delete
            </Button>
          </>
        }
        heading="Delete this file? This cannot be undone."
        isVisible={isVisible}
        onClose={hide}
      />
    </>
  )
}

export const NoBody: Story = {
  args: {
    heading: "Delete this file? This cannot be undone.",
    isVisible: false,
    onClose: () => {},
  },
  render: () => <NoBodyDemo />,
}

export const Interactive: Story = {
  args: {
    heading: "Bay 3",
    isVisible: false,
    onClose: () => {},
  },
  render: () => (
    <DialogDemo
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
