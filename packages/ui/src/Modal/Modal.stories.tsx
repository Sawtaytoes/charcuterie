import { useVisibility } from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { expect, waitFor } from "storybook/test"

import { Button } from "../Button/Button.tsx"
import { StoryRow } from "../board.storyHelpers.tsx"
import { expectAgentDrivable } from "../testing/index.ts"
import type { ModalSize } from "./Modal.tsx"
import { Modal } from "./Modal.tsx"

const meta = {
  title: "Components/Modal",
  component: Modal,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Modal>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Escape, as far as a story can press it — and the limit is worth
 * stating rather than working around quietly.
 *
 * A `play` function's `userEvent` is `@testing-library/user-event`,
 * which dispatches **untrusted** events. The browser runs a default
 * action only for trusted input, so a synthetic Escape keydown does
 * not make a native `<dialog>` fire `cancel` — it does nothing at
 * all. A story asserting "Escape did not close the non-dismissable
 * dialog" against a synthetic keypress therefore passes for the
 * wrong reason, forever, which is worse than not testing it.
 *
 * So the close request is dispatched where the browser would raise
 * it. That splits the contract honestly: the keystroke → `cancel`
 * half is the platform's and is not ours to test, and everything
 * downstream of `cancel` — `preventDefault`, `hide()`, the effect,
 * `close()`, focus restore — is ours and is asserted here.
 */
const requestClose = (dialog: HTMLElement) => {
  dialog.dispatchEvent(
    new Event("cancel", { cancelable: true }),
  )
}

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
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      expectAgentDrivable(canvas, {
        name: "Show the read error",
        role: "button",
      }),
    )

    // Scoped to `canvas`, and that is the point of not portalling:
    // the dialog paints in the top layer while staying inside the
    // story root, so an agent's scoped query still reaches it.
    const dialog = expectAgentDrivable(canvas, {
      name: "Read error on title 4",
      role: "dialog",
    })

    await expect(dialog).toHaveAttribute("open")
  },
}

const SIZES: ModalSize[] = ["sm", "md", "lg", "full"]

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
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      expectAgentDrivable(canvas, {
        name: "Open lg",
        role: "button",
      }),
    )

    const dialog = expectAgentDrivable(canvas, {
      name: "Read error — lg",
      role: "dialog",
    })

    // The size prop is a real width, not a class that happens to
    // be there: `lg` has to be wider than `sm`'s cap.
    await expect(
      dialog.getBoundingClientRect().width,
    ).toBeGreaterThan(400)
  },
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
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      expectAgentDrivable(canvas, {
        name: "Not dismissable",
        role: "button",
      }),
    )

    const dialog = expectAgentDrivable(canvas, {
      name: "This erases eight completed titles",
      role: "dialog",
    })

    // There is no Close button, and the close request is
    // *cancelled* rather than ignored — letting the browser close
    // it would leave `isVisible` true and the element shut, which
    // is the desync the component exists to prevent.
    await expect(
      canvas.queryByRole("button", { name: "Close" }),
    ).toBeNull()

    requestClose(dialog)

    // `find*` is async, which is what gives React's update from
    // that dispatch a chance to flush. If the request *had* got
    // through, this query would fail rather than the assertion
    // below passing by being too quick.
    const keepButton = await canvas.findByRole("button", {
      name: "Keep the titles",
    })

    await expect(dialog).toHaveAttribute("open")

    // The differential half. Without it, "still open" would also
    // be satisfied by a dialog nothing can close at all — a green
    // assertion about a component that does not work.
    await userEvent.click(keepButton)

    await waitFor(() => {
      expect(canvas.queryByRole("dialog")).toBeNull()
    })

    // Ends on the scrolling one, deliberately: the a11y addon runs
    // axe against whatever is on screen when `play` finishes, and a
    // board whose dialogs are all shut is a board axe never audits.
    // This is also the case that would trip
    // `scrollable-region-focusable` if the body scrolled with
    // nothing inside it to focus.
    await userEvent.click(
      canvas.getByRole("button", { name: "Long body" }),
    )

    const log = expectAgentDrivable(canvas, {
      name: "MakeMKV log",
      role: "dialog",
    })

    // Taller than its clamp, which is the state that matters: the
    // body scrolls, the header and footer do not, and the dialog
    // stops at `85dvh` rather than running off the screen.
    await expect(
      log.getBoundingClientRect().height,
    ).toBeLessThan(globalThis.innerHeight)

    await expect(
      canvas.getByText(/title 24/),
    ).toBeInTheDocument()
  },
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
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      expectAgentDrivable(canvas, {
        name: "Open full-bleed",
        role: "button",
      }),
    )

    const dialog = expectAgentDrivable(canvas, {
      name: "MakeMKV log — full",
      role: "dialog",
    })

    await expect(
      dialog.getBoundingClientRect().height,
    ).toBeGreaterThan(globalThis.innerHeight * 0.95)

    // The scrim is a token, and `::backdrop` inheriting custom
    // properties from its originating element is the half that
    // could silently not work.
    //
    // Compared against the token's *resolved* value rather than
    // against "not transparent", which M4 learned the hard way:
    // Chromium's own `::backdrop` is `rgba(0, 0, 0, 0.1)`, so the
    // loose version of this assertion stayed green against a token
    // build where `bg-scrim` generated no CSS at all.
    //
    // The probe is how the two become comparable — the same
    // `var()` put through `background-color` comes back in the
    // identical serialisation the backdrop uses.
    const probe = document.createElement("div")

    probe.style.backgroundColor = "var(--color-scrim)"

    document.body.append(probe)

    const expectedScrim =
      globalThis.getComputedStyle(probe).backgroundColor

    probe.remove()

    await expect(expectedScrim).not.toBe("rgba(0, 0, 0, 0)")

    await expect(
      globalThis.getComputedStyle(dialog, "::backdrop")
        .backgroundColor,
    ).toBe(expectedScrim)
  },
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
  play: async ({ canvas, userEvent }) => {
    const trigger = expectAgentDrivable(canvas, {
      name: "Stop the rip",
      role: "button",
    })

    await userEvent.click(trigger)

    const dialog = expectAgentDrivable(canvas, {
      name: "Stop the rip?",
      role: "dialog",
    })

    // The trap, from the platform: focus is inside the dialog, and
    // the trigger behind it is `inert` and unreachable.
    await expect(dialog).toContainElement(
      document.activeElement as HTMLElement,
    )

    requestClose(dialog)

    await waitFor(() => {
      expect(canvas.queryByRole("dialog")).toBeNull()
    })

    // Focus restored to what opened it — also the platform's, and
    // the thing hand-rolled modals in the fleet lose.
    await expect(document.activeElement).toBe(trigger)
  },
}
