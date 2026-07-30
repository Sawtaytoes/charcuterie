import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./LiveStatusIndicator.stories.tsx"

const { Default, Interactive } = composeStories(stories)

test("it is a named live region with a stable status handle", async () => {
  const { canvas } = await mountStory(Default)

  const indicator = expectAgentDrivable(canvas, {
    name: "Connected",
    role: "status",
  })

  // `data-status` survives translation; the visible wording does
  // not. A Playwright assertion in a consumer app wants the former.
  await expect(indicator).toHaveAttribute(
    "data-status",
    "connected",
  )
})

/**
 * The live region, driven. Each click is a real transition through
 * `connectionTransitions`, so the wording, the colour, and whether
 * the dot moves all follow from one state rather than from four
 * independent booleans.
 */
test("the indicator follows the connection machine", async () => {
  const { canvas } = await mountStory(Interactive)

  const indicator = canvas.getByRole("status")

  await expect(indicator).toHaveAttribute(
    "data-status",
    "connecting",
  )

  await userEvent.click(
    canvas.getByRole("button", { name: "connected" }),
  )

  await expect(canvas.getByText("Connected")).toBeVisible()

  await userEvent.click(
    canvas.getByRole("button", { name: "reconnecting" }),
  )

  await expect(
    canvas.getByText("Reconnecting…"),
  ).toBeVisible()

  // The distinction four repos currently lose: `reconnecting` is
  // warning — you had data and I am getting it back — not the
  // `connecting` blue and not the `disconnected` red.
  await expect(indicator).toHaveClass(
    "text-intent-warning-content",
  )
})
