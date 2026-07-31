import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Accordion.stories.tsx"

const { AllStates, AllVariants, Default } =
  composeStories(stories)

test("a trigger says what it controls and whether it is open", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const disc = expectAgentDrivable(canvas, {
    name: "Disc",
    role: "button",
  })

  await expect(disc).toHaveAttribute(
    "aria-expanded",
    "true",
  )

  // The panel is queried by id rather than by role, because it is
  // deliberately **not** a landmark — the APG's own caveat about
  // "landmark region proliferation", which a board of four
  // accordions turned into a failing `landmark-unique` immediately.
  const panel = document.getElementById(
    disc.getAttribute("aria-controls") ?? "",
  )

  await expect(panel).not.toBeNull()

  // The link still reaches in both directions — the button's
  // `aria-controls` at the panel, the panel's `aria-labelledby` back
  // at the button. Both ids come from one `useUniqueId`, and this is
  // the relationship a screen reader actually follows; the landmark
  // only ever added a second route to the same node.
  await expect(panel).toHaveAttribute(
    "aria-labelledby",
    disc.id,
  )

  await expect(panel).toHaveTextContent("Blade Runner")

  await expectNoAxeViolations(canvasElement)
})

/**
 * The first-paint hole `Tabs` found, in the other kind. Members
 * register from an effect, so on the very first paint the intent
 * still lives in `pendingKey` — an accordion reading only
 * `visibleKey` renders every section collapsed and corrects itself a
 * frame later.
 */
test("the initially expanded section is expanded on the first paint", async () => {
  const { canvas } = await mountStory(Default)

  const expanded = canvas
    .queryAllByRole("button")
    .filter(
      (one: HTMLElement) =>
        one.getAttribute("aria-expanded") === "true",
    )

  await expect(expanded).toHaveLength(1)

  await expect(expanded[0]).toHaveTextContent("Disc")
})

test("exclusive means opening one closes the other", async () => {
  const { canvas } = await mountStory(Default)

  const log = expectAgentDrivable(canvas, {
    name: "Log",
    role: "button",
  })

  await userEvent.click(log)

  await waitFor(() => {
    expect(log).toHaveAttribute("aria-expanded", "true")
  })

  await expect(
    expectAgentDrivable(canvas, {
      name: "Disc",
      role: "button",
    }),
  ).toHaveAttribute("aria-expanded", "false")
})

test("multiple keeps both open", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllVariants)

  // Two sections start expanded in the `multiple` cell, which the
  // exclusive kind cannot represent at all.
  const expanded = canvas
    .queryAllByRole("button")
    .filter(
      (one: HTMLElement) =>
        one.getAttribute("aria-expanded") === "true",
    )
    .map((one: HTMLElement) => one.textContent)

  await expect(expanded).toEqual([
    "Disc",
    "Disc",
    "Flags",
    "Steps",
  ])

  await expectNoAxeViolations(canvasElement)
})

test("the heading level is the caller's, not the component's", async () => {
  const { canvas } = await mountStory(AllVariants)

  const level2 = expectAgentDrivable(canvas, {
    name: "Steps",
    role: "heading",
  })

  // An accordion inside a `Card` that already has an `<h2>` needs
  // `3`, and getting it wrong is a document-outline break no gate
  // here can see — it depends entirely on the page.
  await expect(level2.tagName).toBe("H2")
})

/**
 * Registration is membership. A disabled section never registers, so
 * nothing can expand it — including this story, which passes its key
 * in `expandedKeys` on purpose.
 */
test("a disabled section cannot be expanded, even by the caller", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const verdict = expectAgentDrivable(canvas, {
    name: "Verdict",
    role: "button",
  })

  await expect(verdict).toBeDisabled()

  await expect(verdict).toHaveAttribute(
    "aria-expanded",
    "false",
  )

  await userEvent.click(verdict, { pointerEventsCheck: 0 })

  await expect(verdict).toHaveAttribute(
    "aria-expanded",
    "false",
  )

  await expectNoAxeViolations(canvasElement)
})
