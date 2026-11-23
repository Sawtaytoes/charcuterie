import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { inject, test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Dialog.stories.tsx"

/**
 * Layout and paint only. The Dialog's behavior, what a person can do
 * and hear, is `REQ-UI-007` to `REQ-UI-015` in
 * `packages/docs/requirements/dialog.feature`.
 */
const { AllStates, AllVariants, Responsive, Stacked } =
  composeStories(stories)

const isNarrow = inject("viewport") === "narrow"

const openLargeDialog = async () => {
  const { body, canvas } = await mountStory(AllVariants)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open lg",
      role: "button",
    }),
  )

  return expectAgentDrivable(body, {
    name: "Read error — lg",
    role: "dialog",
  })
}

test.skipIf(isNarrow)(
  "size is a real width, not a class that happens to be there",
  async () => {
    const dialog = await openLargeDialog()

    await expect(
      dialog.getBoundingClientRect().width,
    ).toBeGreaterThan(400)
  },
)

/*
 * On the phone every size is `w-full` against a 384px window, so `lg`
 * is no wider than `sm` and the test above has nothing to measure.
 * What the Narrow View owes instead is that the largest dialog still
 * fits: a dialog wider than the window is one whose close button is
 * off the screen.
 */
test.runIf(isNarrow)(
  "a large dialog still fits inside a phone's window",
  async () => {
    const { left, right } = (
      await openLargeDialog()
    ).getBoundingClientRect()

    await expect(left).toBeGreaterThanOrEqual(0)
    await expect(right).toBeLessThanOrEqual(
      window.innerWidth,
    )
  },
)

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
 * Stacking draws one scrim behind both dialogs, and the scrim leaves
 * with the last of them. The behavior, which dialog is live and which
 * closes first, is `REQ-UI-012` in `packages/docs/requirements/dialog.feature`;
 * the scrim is paint, so it is checked here.
 */
test("stacked dialogs share one scrim, and it leaves with the last", async () => {
  const { body, canvas } = await mountStory(Stacked)

  await userEvent.click(
    canvas.getByRole("button", {
      name: "Open the first dialog",
    }),
  )

  await userEvent.click(
    body.getByRole("button", {
      name: "Open a second over it",
    }),
  )

  await expect(
    body.getByRole("dialog", { name: "Second dialog" }),
  ).toBeInTheDocument()

  // One scrim for both — the whole point of the provider.
  await expect(
    document.body.querySelectorAll(".bg-scrim"),
  ).toHaveLength(1)

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(
      body.queryByRole("dialog", { name: "Second dialog" }),
    ).toBeNull()
  })

  await expect(
    document.body.querySelectorAll(".bg-scrim"),
  ).toHaveLength(1)

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })

  await expect(
    document.body.querySelector(".bg-scrim"),
  ).toBeNull()
})
