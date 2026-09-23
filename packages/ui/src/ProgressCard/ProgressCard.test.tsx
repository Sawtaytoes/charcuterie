import { composeStories } from "@storybook/react"
import { expect, userEvent, within } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import {
  DESKTOP,
  setViewport,
} from "../viewport.testHelpers.ts"
import * as stories from "./ProgressCard.stories.tsx"

const {
  Playground,
  AllVariants,
  AllStates,
  Responsive,
  Interactive,
} = composeStories(stories)

test("the large value overlays a real named progressbar and the metrics stay outside it", async () => {
  const { canvas } = await mountStory(Playground)
  const card = expectAgentDrivable(canvas, {
    role: "region",
    name: "Archive transfer",
  })
  const bar = within(card).getByRole("progressbar", {
    name: "Transfer progress",
  })
  const percentage = within(card).getByText("82.5%")
  await expect(bar).toHaveAttribute("aria-valuenow", "82.5")
  await expect(bar).not.toContainElement(percentage)
  await expect(
    bar.getBoundingClientRect().height,
  ).toBeGreaterThan(50)
  await expect(
    bar.getBoundingClientRect().top,
  ).toBeLessThan(percentage.getBoundingClientRect().top)
  await expect(
    within(card).getAllByRole("term"),
  ).toHaveLength(3)
})

test("both layouts preserve progress semantics", async () => {
  const { canvas } = await mountStory(AllVariants)
  for (const layout of ["band", "hierarchy"]) {
    const card = expectAgentDrivable(canvas, {
      role: "region",
      name: `Transfer ${layout}`,
    })
    await expect(
      within(card).getByRole("progressbar"),
    ).toHaveAttribute("aria-valuenow", "82.5")
    await expect(
      within(card).getByText("82.5%"),
    ).toBeVisible()
  }
})

test("issues tint the complete card and indeterminate progress has no invented value", async () => {
  const { canvas } = await mountStory(AllStates)
  const warning = expectAgentDrivable(canvas, {
    role: "region",
    name: "Transfer warning",
  })
  await expect(warning).toHaveClass(
    "bg-intent-warning-surface",
  )
  await expect(
    canvas.getByRole("region", { name: "Failed transfer" }),
  ).toHaveClass("bg-intent-danger-surface")
  const preparing = canvas.getByRole("region", {
    name: "Preparing transfer",
  })
  await expect(
    within(preparing).getByRole("progressbar"),
  ).not.toHaveAttribute("aria-valuenow")
  await expect(
    within(preparing).queryByRole("term"),
  ).not.toBeInTheDocument()
})

test("the card fits each container width with a long title, media, and actions", async () => {
  await setViewport(DESKTOP)
  const { canvas } = await mountStory(Responsive)
  for (const width of ["15rem", "24rem", "34rem"]) {
    const card = expectAgentDrivable(canvas, {
      role: "region",
      name: `Transfer at ${width}`,
    })
    await expect(card.scrollWidth).toBeLessThanOrEqual(
      card.clientWidth,
    )
    const metrics = card.querySelector("dl") as HTMLElement
    await expect(
      getComputedStyle(metrics).gridTemplateColumns.split(
        " ",
      ),
    ).toHaveLength(width === "34rem" ? 3 : 1)
  }
})

test("the app action remains keyboard-operable above the progress band", async () => {
  const { canvas } = await mountStory(Interactive)
  const card = expectAgentDrivable(canvas, {
    role: "region",
    name: "Cancelable transfer",
  })
  const cancel = within(card).getByRole("button", {
    name: "Cancel",
  })
  cancel.focus()
  await userEvent.keyboard("{Enter}")
  await expect(
    within(card).getByText("Canceled"),
  ).toBeVisible()
  await expect(cancel).toBeDisabled()
})
