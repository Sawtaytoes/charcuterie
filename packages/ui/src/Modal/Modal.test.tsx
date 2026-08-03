import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Modal.stories.tsx"

const { Alert, Default, Interactive } =
  composeStories(stories)

test("the base modal portals to the body, named by its aria-label", async () => {
  const { body, canvas, canvasElement } =
    await mountStory(Default)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open the base modal",
      role: "button",
    }),
  )

  const modal = expectAgentDrivable(body, {
    name: "Read error on title 4",
    role: "dialog",
  })

  // Portalled out of the canvas — the whole point over the top layer.
  await expect(canvasElement).not.toContainElement(modal)

  await expectNoAxeViolations(modal)
})

test("an alertdialog role is carried through", async () => {
  const { body, canvas } = await mountStory(Alert)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open an alertdialog",
      role: "button",
    }),
  )

  // The one configuration the base surfaces that `Dialog` does not.
  expectAgentDrivable(body, {
    name: "Confirm erase",
    role: "alertdialog",
  })
})

test("Escape and an outside press both close through onClose", async () => {
  const { body, canvas } = await mountStory(Default)

  const trigger = expectAgentDrivable(canvas, {
    name: "Open the base modal",
    role: "button",
  })

  await userEvent.click(trigger)

  expectAgentDrivable(body, {
    name: "Read error on title 4",
    role: "dialog",
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })

  // Reopened, then dismissed by pressing the page behind it.
  await userEvent.click(trigger)

  await waitFor(() => {
    expect(body.getByRole("dialog")).toBeInTheDocument()
  })

  await userEvent.click(document.body)

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })
})

test("focus is trapped inside, and restored to the trigger on close", async () => {
  const { body, canvas } = await mountStory(Interactive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Stop the rip",
    role: "button",
  })

  await userEvent.click(trigger)

  const modal = expectAgentDrivable(body, {
    name: "Stop the rip?",
    role: "dialog",
  })

  await waitFor(() => {
    expect(modal.contains(document.activeElement)).toBe(
      true,
    )
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })

  await expect(document.activeElement).toBe(trigger)
})
