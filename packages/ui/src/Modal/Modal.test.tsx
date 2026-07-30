import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Modal.stories.tsx"

const {
  AllStates,
  AllVariants,
  Default,
  Interactive,
  Responsive,
} = composeStories(stories)

/**
 * Escape, as far as a test can press it — and the limit is worth
 * stating rather than working around quietly.
 *
 * `userEvent` is `@testing-library/user-event`, which dispatches
 * **untrusted** events. The browser runs a default action only for
 * trusted input, so a synthetic Escape keydown does not make a
 * native `<dialog>` fire `cancel` — it does nothing at all. A test
 * asserting "Escape did not close the non-dismissable dialog"
 * against a synthetic keypress therefore passes for the wrong
 * reason, forever, which is worse than not testing it.
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

test("the dialog is reachable from a scoped query", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

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

  // The addon's own axe pass fired before any of this was clicked,
  // so the *open* dialog audits itself.
  await expectNoAxeViolations(canvasElement)
})

test("size is a real width, not a class that happens to be there", async () => {
  const { canvas } = await mountStory(AllVariants)

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

  await expect(
    dialog.getBoundingClientRect().width,
  ).toBeGreaterThan(400)
})

test("a non-dismissable dialog cancels the close rather than ignoring it", async () => {
  const { canvas } = await mountStory(AllStates)

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

  // There is no Close button, and the close request is *cancelled*
  // rather than ignored — letting the browser close it would leave
  // `isVisible` true and the element shut, which is the desync the
  // component exists to prevent.
  await expect(
    canvas.queryByRole("button", { name: "Close" }),
  ).toBeNull()

  requestClose(dialog)

  // `find*` is async, which is what gives React's update from that
  // dispatch a chance to flush. If the request *had* got through,
  // this query would fail rather than the assertion below passing by
  // being too quick.
  const keepButton = await canvas.findByRole("button", {
    name: "Keep the titles",
  })

  await expect(dialog).toHaveAttribute("open")

  // The differential half. Without it, "still open" would also be
  // satisfied by a dialog nothing can close at all — a green
  // assertion about a component that does not work.
  await userEvent.click(keepButton)

  await waitFor(() => {
    expect(canvas.queryByRole("dialog")).toBeNull()
  })
})

test("a long body scrolls inside the clamp", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  await userEvent.click(
    canvas.getByRole("button", { name: "Long body" }),
  )

  const log = expectAgentDrivable(canvas, {
    name: "MakeMKV log",
    role: "dialog",
  })

  // The body scrolls, the header and footer do not, and the dialog
  // stops at `85dvh` rather than running off the screen.
  await expect(
    log.getBoundingClientRect().height,
  ).toBeLessThan(globalThis.innerHeight)

  await expect(
    canvas.getByText(/title 24/),
  ).toBeInTheDocument()

  // The case that would trip `scrollable-region-focusable` if the
  // body scrolled with nothing inside it to focus.
  await expectNoAxeViolations(canvasElement)
})

test("the scrim is the token, not Chromium's default backdrop", async () => {
  const { canvas } = await mountStory(Responsive)

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

  // `::backdrop` inheriting custom properties from its originating
  // element is the half that could silently not work.
  //
  // Compared against the token's *resolved* value rather than
  // against "not transparent", which M4 learned the hard way:
  // Chromium's own `::backdrop` is `rgba(0, 0, 0, 0.1)`, so the
  // loose version of this assertion stayed green against a token
  // build where `bg-scrim` generated no CSS at all.
  //
  // The probe is how the two become comparable — the same `var()`
  // put through `background-color` comes back in the identical
  // serialisation the backdrop uses.
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
})

/**
 * `showModal()` supplies the focus trap and the focus restore; what
 * this asserts is that the state layer never disagrees with the
 * element — Escape routes through `onCancel` → `hide()` → the
 * effect → `close()`, rather than the browser closing the dialog
 * behind the app's back.
 */
test("focus is trapped inside, and restored to the trigger on close", async () => {
  const { canvas } = await mountStory(Interactive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Stop the rip",
    role: "button",
  })

  await userEvent.click(trigger)

  const dialog = expectAgentDrivable(canvas, {
    name: "Stop the rip?",
    role: "dialog",
  })

  // The trap, from the platform: focus is inside the dialog, and the
  // trigger behind it is `inert` and unreachable.
  await expect(dialog).toContainElement(
    document.activeElement as HTMLElement,
  )

  requestClose(dialog)

  await waitFor(() => {
    expect(canvas.queryByRole("dialog")).toBeNull()
  })

  // Focus restored to what opened it — also the platform's, and the
  // thing hand-rolled modals in the fleet lose.
  await expect(document.activeElement).toBe(trigger)
})
