import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./HtmlView.stories.tsx"

const {
  Playground,
  AllVariants,
  AllStates,
  Interactive,
  Responsive,
} = composeStories(stories)

test("the named document renders paragraphs, lists and safe links without an editing surface", async () => {
  const { canvas, canvasElement } =
    await mountStory(Playground)
  expectAgentDrivable(canvas, {
    role: "document",
    name: "Saved notes",
  })
  await expect(
    canvas.getByRole("link", { name: "Read the recipe" }),
  ).toHaveAttribute(
    "href",
    "https://example.invalid/recipe",
  )
  await expect(
    canvas.queryByRole("textbox"),
  ).not.toBeInTheDocument()
  await expect(
    canvasElement.querySelectorAll("li"),
  ).toHaveLength(4)
})

test("hostile HTML has visible ordinary content and no executable DOM, source props or unsafe URL", async () => {
  const { canvas } = await mountStory(AllStates)
  const document = canvas.getByRole("document", {
    name: "Filtered document",
  })
  await expect(document).toHaveTextContent("Visible notes")
  await expect(
    document.querySelector(
      "script,style,iframe,svg,math,[onclick],[onerror],[srcset]",
    ),
  ).toBeNull()
  await expect(
    document.querySelector("a[href],img"),
  ).toBeNull()
  await expect(document).not.toHaveTextContent(
    "Foreign content",
  )
})

test("images retain their description and relative links retain ordinary navigation", async () => {
  const { canvas } = await mountStory(AllVariants)
  expectAgentDrivable(canvas, {
    role: "img",
    name: "Fixture illustration",
  })
  await expect(
    canvas.getByRole("link", { name: "the instructions" }),
  ).toHaveAttribute("href", "./instructions")
})

test("a controlled reader reflects the next saved revision", async () => {
  const { canvas } = await mountStory(Interactive)
  await userEvent.click(
    canvas.getByRole("button", {
      name: "Show next revision",
    }),
  )
  await expect(
    canvas.getByRole("document", {
      name: "Current revision",
    }),
  ).toHaveTextContent("Updated saved notes.")
})

test("long document paths stay inside each container", async () => {
  const { canvas } = await mountStory(Responsive)
  for (const document of canvas.getAllByRole("document"))
    await expect(document.scrollWidth).toBeLessThanOrEqual(
      document.clientWidth + 1,
    )
})
