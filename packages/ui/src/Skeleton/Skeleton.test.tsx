import { composeStories } from "@storybook/react"
import { expect } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectHiddenFromAgents } from "../testing/index.ts"
import * as stories from "./Skeleton.stories.tsx"

const { Default, Interactive } = composeStories(stories)

test("a skeleton is hidden from assistive technology", async () => {
  const { canvasElement } = await mountStory(Default)

  const skeleton = canvasElement.querySelector(
    "div[aria-hidden]",
  )

  if (!skeleton) {
    throw new Error("Skeleton did not render")
  }

  // The inverse of every other component's gate: this one asserts
  // the component is *not* reachable. A placeholder standing in for
  // content that does not exist yet must not be read out as three
  // empty bars.
  expectHiddenFromAgents(skeleton)
})

test("it contributes no roles at all", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  await expect(
    canvas.queryAllByRole("status"),
  ).toHaveLength(0)

  await expect(
    canvas.queryAllByRole("progressbar"),
  ).toHaveLength(0)

  // `lineCount` really produces that many bars — the fidelity
  // obligation, since a placeholder that occupies the wrong box
  // reflows the grid when the data lands.
  await expect(
    canvasElement.querySelectorAll(".charcuterie-shimmer"),
  ).toHaveLength(3)
})
