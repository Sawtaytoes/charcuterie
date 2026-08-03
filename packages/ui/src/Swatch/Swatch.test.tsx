import { composeStories } from "@storybook/react"
import { expect } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Swatch.stories.tsx"

const { Default, InAList } = composeStories(stories)

test("a colour is findable by the name a screen reader can read", async () => {
  const { canvas } = await mountStory(Default)

  // The whole contract: a `background-color` is nothing to an agent
  // or a screen reader, so the swatch is an `img` with a name.
  const swatch = expectAgentDrivable(canvas, {
    name: "Red",
    role: "img",
  })

  // The name comes from `aria-label`, not the dot, which carries no
  // information of its own.
  await expect(swatch.firstElementChild).toHaveAttribute(
    "aria-hidden",
    "true",
  )
})

test("the name survives with no visible label", async () => {
  // `InAList` renders the dot-only form — `isLabelVisible` defaults
  // false — with a distinct name per row, which is the placement
  // that has to stay drivable: the swatch answers "which one" before
  // any text does.
  const { canvas } = await mountStory(InAList)

  for (const name of [
    "Red sticker",
    "Blue sticker",
    "Green sticker",
    "Yellow sticker",
  ]) {
    expectAgentDrivable(canvas, { name, role: "img" })
  }
})

test("solid rings its fill; the ring is what keeps white visible", async () => {
  const { canvas } = await mountStory(Default)

  const dot = canvas.getByRole("img", {
    name: "Red",
  }).firstElementChild

  // Not decoration: a hairline border on a white swatch disappears
  // against `surface-raised` in one of the two schemes, and the
  // inset ring is what stops that.
  await expect(dot).toHaveClass("ring-inset")
})
