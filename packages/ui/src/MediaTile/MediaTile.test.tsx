import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./MediaTile.stories.tsx"

const { Default, Interactive, InteractiveButton } =
  composeStories(stories)

test("an unlinked tile's poster carries the name", async () => {
  const { canvas } = await mountStory(Default)

  expectAgentDrivable(canvas, {
    name: "Blade Runner (1982) poster",
    role: "img",
  })
})

/**
 * The linked tile's contract: the accessible name is exactly the
 * title — not the title plus the subtitle plus the alt text — and
 * Tab reaches it. `getByRole("link", { name: "Blade Runner" })` is
 * what an agent will actually write.
 */
test("a linked tile is one link named for its title", async () => {
  const { canvas } = await mountStory(Interactive)

  const link = expectAgentDrivable(canvas, {
    name: "Blade Runner",
    role: "link",
  })

  await userEvent.tab()

  await expect(link).toHaveFocus()

  // The image inside a linked tile is `alt=""` on purpose: two names
  // for one link is a screen reader reading it twice.
  await expect(canvas.queryAllByRole("img")).toHaveLength(0)
})

test("a clickable tile is one button with a pointer cursor", async () => {
  const { canvas } = await mountStory(InteractiveButton)

  const button = expectAgentDrivable(canvas, {
    name: "Change cover for Blade Runner",
    role: "button",
  })

  await expect(button).toHaveStyle({ cursor: "pointer" })

  await userEvent.tab()

  await expect(button).toHaveFocus()
})
