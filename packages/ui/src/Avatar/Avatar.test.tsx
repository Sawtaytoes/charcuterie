import { composeStories } from "@storybook/react"
import { expect, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Avatar.stories.tsx"

const { AllStates, AllVariants, Default, InAList } =
  composeStories(stories)

/**
 * The whole contract in one test: the name reaches assistive
 * technology and a pointer, and reaches the page as text **nowhere
 * at all**. The component exists to delete a printed "Owner" from
 * every card on a board, so a name that leaks back into the DOM as
 * text is the one regression that matters.
 */
test("the name is readable by an agent and never printed", async () => {
  const { canvas } = await mountStory(Default)

  const avatar = expectAgentDrivable(canvas, {
    name: "Ada Lovelace",
    role: "img",
  })

  await expect(avatar).toHaveAttribute(
    "title",
    "Ada Lovelace",
  )

  // The letters are what is on screen, and they are hidden from the
  // accessibility tree so the chip is announced once.
  await expect(canvas.getByText("AL")).toHaveAttribute(
    "aria-hidden",
    "true",
  )

  await expect(
    canvas.queryByText("Ada Lovelace"),
  ).toBeNull()

  await expectNoAxeViolations(avatar)
})

/**
 * Unassigned draws nothing — not a grey placeholder, not an empty
 * circle, not a whitespace-sized gap that shifts the row.
 *
 * Asserted through the story rather than by rendering the component
 * directly, because the failure this prevents is a *layout* one: a
 * row with no assignee has to look like a row with no assignee.
 */
test("an unassigned avatar renders nothing at all", async () => {
  const { canvas } = await mountStory(AllStates)

  // Nine chips are storied and a tenth is `name={null}`.
  await expect(canvas.getAllByRole("img")).toHaveLength(9)

  await expect(canvas.queryByText("None")).toBeNull()

  // And the same in the list placement: four rows, three chips.
  const list = await mountStory(InAList)

  await expect(
    list.canvas.getAllByRole("listitem"),
  ).toHaveLength(4)

  await expect(
    list.canvas.getAllByRole("img"),
  ).toHaveLength(3)
})

/**
 * A photo is never the only thing. An expired signed URL, a 404, or
 * an app with no photos at all lands on the initials rather than on
 * a broken-image glyph — which is what a hand-rolled avatar shows,
 * because nobody writes the `onError` until they see it.
 */
test("a photo that fails falls back to the initials", async () => {
  const { canvas } = await mountStory(AllStates)

  const broken = expectAgentDrivable(canvas, {
    name: "Kit Sandoval",
    role: "img",
  })

  await waitFor(async () => {
    await expect(broken.querySelector("img")).toBeNull()
  })

  await expect(broken).toHaveTextContent("KS")

  // The photo that *does* load stays a photo, so the fallback is not
  // simply "the image never renders".
  const loaded = expectAgentDrivable(canvas, {
    name: "Tomas Ericsson",
    role: "img",
  })

  await expect(loaded.querySelector("img")).not.toBeNull()

  // The image carries no name of its own — the chip already has one,
  // and a second copy is how an avatar gets announced twice.
  await expect(loaded.querySelector("img")).toHaveAttribute(
    "alt",
    "",
  )
})

/**
 * The colour is a pure function of the key, so the same person is
 * the same colour in every appearance, on every machine, and in a
 * server render. A colour assigned at random on first render is a
 * different colour on the next reload, which is the failure mode
 * `getCategoricalIndex` exists to prevent.
 */
test("one person is one colour, and a chosen index wins", async () => {
  const { canvas } = await mountStory(AllVariants)

  const indexes = new Set(
    canvas
      .getAllByRole("img", { name: "Ada Lovelace" })
      .map(
        (avatar: HTMLElement) =>
          /categorical-(\d+)-/.exec(avatar.className)?.[1],
      ),
  )

  await expect(indexes.size).toBe(1)

  await expect(indexes.has(undefined)).toBe(false)

  // A stored pick is not a hash — it is passed, and it wins.
  const states = await mountStory(AllStates)

  await expect(
    states.canvas.getByRole("img", {
      name: "Wren Okonkwo",
    }),
  ).toHaveClass("bg-categorical-4-surface")
})
