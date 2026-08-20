import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import {
  expectAgentDrivable,
  expectHiddenFromAgents,
} from "../testing/index.ts"
import * as stories from "./Dialog.stories.tsx"

const {
  AllStates,
  AllVariants,
  Default,
  InitialFocus,
  Interactive,
  NoBody,
  Responsive,
  Stacked,
} = composeStories(stories)

test("a dialog with no body renders from heading and footer alone", async () => {
  const { body, canvas } = await mountStory(NoBody)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Delete the file",
      role: "button",
    }),
  )

  // `children` is optional: the question is the accessible name and
  // the answers are the footer, with nothing in between.
  const dialog = expectAgentDrivable(body, {
    name: "Delete this file? This cannot be undone.",
    role: "dialog",
  })

  await expect(
    expectAgentDrivable(body, {
      name: "Delete",
      role: "button",
    }),
  ).toBeInTheDocument()

  await expectNoAxeViolations(dialog)
})

test("the dialog is reachable from a body-scoped query", async () => {
  const { body, canvas } = await mountStory(Default)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Show the read error",
      role: "button",
    }),
  )

  // Portalled now, so the panel is found through `body`; the trigger
  // stays in the canvas.
  const dialog = expectAgentDrivable(body, {
    name: "Read error on title 4",
    role: "dialog",
  })

  await expectNoAxeViolations(dialog)
})

test("size is a real width, not a class that happens to be there", async () => {
  const { body, canvas } = await mountStory(AllVariants)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open lg",
      role: "button",
    }),
  )

  const dialog = expectAgentDrivable(body, {
    name: "Read error — lg",
    role: "dialog",
  })

  await expect(
    dialog.getBoundingClientRect().width,
  ).toBeGreaterThan(400)
})

test("a non-dismissable dialog ignores Escape rather than closing", async () => {
  const { body, canvas } = await mountStory(AllStates)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Not dismissable",
      role: "button",
    }),
  )

  const _dialog = expectAgentDrivable(body, {
    name: "This erases eight completed titles",
    role: "dialog",
  })

  // There is no Close button, and Escape is disabled at the dismiss
  // layer (`isDismissable={false}` → `useDismiss` escapeKey off), so
  // the browser cannot close a dialog the app still owns.
  await expect(
    body.queryByRole("button", { name: "Close" }),
  ).toBeNull()

  await userEvent.keyboard("{Escape}")

  const keepButton = await body.findByRole("button", {
    name: "Keep the titles",
  })

  await expect(body.getByRole("dialog")).toBeInTheDocument()

  // The differential half. Without it, "still open" would also be
  // satisfied by a dialog nothing can close at all.
  await userEvent.click(keepButton)

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })
})

test("a long body scrolls inside the clamp", async () => {
  const { body, canvas } = await mountStory(AllStates)

  await userEvent.click(
    canvas.getByRole("button", { name: "Long body" }),
  )

  const log = expectAgentDrivable(body, {
    name: "MakeMKV log",
    role: "dialog",
  })

  // The body scrolls, the header and footer do not, and the dialog
  // stops at `85dvh` rather than running off the screen.
  await expect(
    log.getBoundingClientRect().height,
  ).toBeLessThan(globalThis.innerHeight)

  await expect(
    body.getByText(/title 24/),
  ).toBeInTheDocument()

  await expectNoAxeViolations(log)
})

test("the scrim is the token, rendered as the shared backdrop", async () => {
  const { body, canvas } = await mountStory(Responsive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open full-bleed",
      role: "button",
    }),
  )

  const dialog = expectAgentDrivable(body, {
    name: "MakeMKV log — full",
    role: "dialog",
  })

  await expect(
    dialog.getBoundingClientRect().height,
  ).toBeGreaterThan(globalThis.innerHeight * 0.95)

  // The shared backdrop node renders while a modal is open, and its
  // background really resolves the variant token — not "not
  // transparent", which M4 learned stayed green against a token build
  // where `bg-scrim` generated no CSS at all.
  const scrim = document.body.querySelector(".bg-scrim")

  await expect(scrim).not.toBeNull()

  const probe = document.createElement("div")

  probe.style.backgroundColor = "var(--color-scrim)"

  document.body.append(probe)

  const expectedScrim =
    globalThis.getComputedStyle(probe).backgroundColor

  probe.remove()

  await expect(expectedScrim).not.toBe("rgba(0, 0, 0, 0)")

  await expect(
    globalThis.getComputedStyle(scrim as Element)
      .backgroundColor,
  ).toBe(expectedScrim)
})

/**
 * The keyboard contract, driven — and Escape is pressable for real
 * now, unlike the old native `<dialog>`. `useDismiss` listens for a
 * keydown rather than relying on a UA default action, so
 * `userEvent.keyboard("{Escape}")` is a real close request.
 */
test("focus is trapped inside, and Escape restores it to the trigger", async () => {
  const { body, canvas } = await mountStory(Interactive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Stop the rip",
    role: "button",
  })

  await userEvent.click(trigger)

  const dialog = expectAgentDrivable(body, {
    name: "Stop the rip?",
    role: "dialog",
  })

  await waitFor(() => {
    expect(dialog.contains(document.activeElement)).toBe(
      true,
    )
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })

  // Focus restored to what opened it — `FloatingFocusManager`'s
  // `returnFocus`, the thing hand-rolled modals in the fleet lose.
  await expect(document.activeElement).toBe(trigger)
})

/**
 * Stacking: one scrim behind two dialogs, the lower one `inert`, and
 * a top-first dismissal on both an outside press and Escape.
 */
test("stacked dialogs share one scrim and dismiss top-first", async () => {
  const { body, canvas } = await mountStory(Stacked)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open the first dialog",
      role: "button",
    }),
  )

  // Captured while it is still the only dialog: once the second opens,
  // the first goes `inert` and a role query no longer sees it.
  const first = expectAgentDrivable(body, {
    name: "First dialog",
    role: "dialog",
  })

  await userEvent.click(
    expectAgentDrivable(body, {
      name: "Open a second over it",
      role: "button",
    }),
  )

  const second = expectAgentDrivable(body, {
    name: "Second dialog",
    role: "dialog",
  })

  // One scrim for both — the whole point of the provider.
  await expect(
    document.body.querySelectorAll(".bg-scrim"),
  ).toHaveLength(1)

  // The lower dialog is hidden from assistive tech while the top is
  // open, and focus is trapped in the top.
  expectHiddenFromAgents(first)

  await waitFor(() => {
    expect(second.contains(document.activeElement)).toBe(
      true,
    )
  })

  // The top dialog's own controls are actually **hittable** — the
  // scrim sits a layer below the panels, so it does not intercept a
  // real click. `userEvent` fires on the element directly and would
  // miss this; `elementFromPoint` is the check that a covering scrim
  // fails.
  const closeButton = expectAgentDrivable(body, {
    name: "Close this one",
    role: "button",
  })

  const buttonRect = closeButton.getBoundingClientRect()

  const atPoint = document.elementFromPoint(
    buttonRect.left + buttonRect.width / 2,
    buttonRect.top + buttonRect.height / 2,
  )

  await expect(
    atPoint !== null && closeButton.contains(atPoint),
  ).toBe(true)

  // An outside press closes the top only.
  await userEvent.click(document.body)

  await waitFor(() => {
    expect(
      body.queryByRole("dialog", {
        name: "Second dialog",
      }),
    ).toBeNull()
  })

  // The first is live again — no longer inert, and the scrim stays.
  await expect(
    document.body.querySelectorAll(".bg-scrim"),
  ).toHaveLength(1)

  const firstAgain = expectAgentDrivable(body, {
    name: "First dialog",
    role: "dialog",
  })

  // Escape closes the last one, and the scrim goes with it.
  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })

  await expect(firstAgain).not.toBeInTheDocument()

  await expect(
    document.body.querySelector(".bg-scrim"),
  ).toBeNull()
})

test("initialFocus puts the caret in the field, not on Close", async () => {
  // Without it the focus manager takes the first tabbable element,
  // which is the Close button — so a dialog wrapping a form eats
  // whatever is typed first. The consumer cannot fix that from
  // outside: focusing in its own effect races the manager and
  // loses, which reads as the app ignoring you.
  const { body, canvas } = await mountStory(InitialFocus)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Add a title",
      role: "button",
    }),
  )

  const field = expectAgentDrivable(body, {
    name: "Title",
    role: "textbox",
  })

  await waitFor(async () => {
    await expect(field).toHaveFocus()
  })

  await userEvent.keyboard("Sharpen the chisels")

  await expect(field).toHaveValue("Sharpen the chisels")
})
