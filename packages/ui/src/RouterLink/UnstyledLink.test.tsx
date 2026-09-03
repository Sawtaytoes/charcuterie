import { composeStories } from "@storybook/react"
import { expect } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./UnstyledLink.stories.tsx"

const { Default, Routed } = composeStories(stories)

test("keeps the caller's paint and works without a router", async () => {
  const { canvas } = await mountStory(Default)
  const link = expectAgentDrivable(canvas, {
    name: "Jobs",
    role: "link",
  })

  await expect(link).toHaveAttribute("href", "/jobs")
  await expect(link).toHaveAttribute(
    "class",
    "text-sm text-intent-accent-content hover:underline",
  )
  await expect(link).not.toHaveAttribute("data-router")
})

test("routes only destinations the injected router can serve", async () => {
  const { canvas } = await mountStory(Routed)

  await expect(
    canvas.getByRole("link", { name: "Routed jobs" }),
  ).toHaveAttribute("data-router", "soft")

  await expect(
    canvas.getByRole("link", { name: "External jobs" }),
  ).not.toHaveAttribute("data-router")

  await expect(
    canvas.getByRole("link", { name: "Jobs fragment" }),
  ).not.toHaveAttribute("data-router")
})
