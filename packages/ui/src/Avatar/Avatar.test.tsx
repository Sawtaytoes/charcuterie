import { composeStories } from "@storybook/react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { expect, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import { waitForImagesToFinish } from "../waitForImages.testHelpers.ts"
import * as stories from "./Avatar.stories.tsx"
import { Avatar } from "./Avatar.tsx"

const { AllStates, AllVariants, Playground, InAList } =
  composeStories(stories)

/**
 * The whole contract in one test: the name reaches assistive
 * technology and a pointer, and reaches the page as text **nowhere
 * at all**. The component exists to delete a printed "Owner" from
 * every card on a board, so a name that leaks back into the DOM as
 * text is the one regression that matters.
 */
test("the name is readable by an agent and never printed", async () => {
  const { canvas } = await mountStory(Playground)

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
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const broken = expectAgentDrivable(canvas, {
    name: "Kit Sandoval",
    role: "img",
  })

  // Wait for the browser's answer about each photo, not for a clock:
  // the 404 comes back from the dev server whenever it gets to it,
  // and on a shared CI runner that was later than `waitFor`'s 1 s.
  // What is left after it is the component's own re-render.
  await waitForImagesToFinish(canvasElement)

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
 * The same promise for a server render, where `onError` alone cannot
 * keep it. The browser loads a server-rendered photo while it parses
 * the HTML, so a 404 can land before `hydrateRoot` attaches the
 * listener, and React does not set `src` again to repeat it. Without
 * the check `useImageFailure` makes when React attaches its ref, the
 * broken-image glyph stays for good.
 */
test("a photo that failed before hydration still falls back to the initials", async () => {
  const avatar = (
    <Avatar
      imageUrl="/charcuterie-missing-portrait.png"
      name="Kit Sandoval"
    />
  )

  const host = document.createElement("div")

  document.body.append(host)

  host.innerHTML = renderToString(avatar)

  // The photo has failed, and nothing was listening yet.
  await waitForImagesToFinish(host)

  await expect(host.querySelector("img")).not.toBeNull()

  const root = hydrateRoot(host, avatar)

  try {
    await waitFor(async () => {
      await expect(host.querySelector("img")).toBeNull()
    })

    await expect(host).toHaveTextContent("KS")
  } finally {
    root.unmount()

    host.remove()
  }
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
