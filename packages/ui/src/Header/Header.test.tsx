import { composeStories } from "@storybook/react"
import { expect, within } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Header.stories.tsx"

const {
  AllStates,
  AllVariants,
  Interactive,
  NotSticky,
  Responsive,
} = composeStories(stories)

const getHeader = (canvasElement: HTMLElement) => {
  const header = canvasElement.querySelector("header")

  if (!header) {
    throw new Error("The story rendered no <header>.")
  }

  return header
}

/**
 * **The mux-magic bug, as a red/green test.**
 *
 * `PageHeader.tsx:173` sets a z-index and calls itself sticky. It
 * never sets `position: sticky`, so the header scrolls away and
 * the z-index has nothing to stack against — valid CSS, a comment
 * stating the intent, and no way to see it without scrolling a
 * running app.
 *
 * Both halves are asserted together because it is the *pairing*
 * that was wrong, and either half alone passes on the broken
 * implementation.
 */
test("isSticky sets position and z-index together", async () => {
  const { canvasElement } = await mountStory(AllVariants)

  const styles = globalThis.getComputedStyle(
    getHeader(canvasElement),
  )

  await expect(styles.position).toBe("sticky")

  // `--layer-sticky`, not a hand-picked number. The fleet's
  // headers currently sit at z-40, z-50, z-10 and z-[100] with no
  // ordering guarantee between them and anything else.
  await expect(styles.zIndex).toBe("100")

  await expectNoAxeViolations(canvasElement)
})

test("isSticky={false} sets neither", async () => {
  const { canvasElement } = await mountStory(NotSticky)

  const styles = globalThis.getComputedStyle(
    getHeader(canvasElement),
  )

  await expect(styles.position).toBe("static")

  // Not merely "some other number": a `z-index` on a static
  // element is inert, and leaving one behind is how a stacking
  // context outlives the thing that needed it.
  await expect(styles.zIndex).toBe("auto")
})

/**
 * The reason a header is a landmark at all. Two "Settings"
 * buttons on the page, and an agent can still say which one it
 * means.
 */
test("the header is a banner an agent can scope queries to", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  const banner = expectAgentDrivable(canvas, {
    role: "banner",
  })

  // Unscoped, this is ambiguous on purpose — the story renders one
  // in the header and one in the page.
  await expect(
    canvas.getAllByRole("button", { name: "Settings" }),
  ).toHaveLength(2)

  expectAgentDrivable(within(banner), {
    name: "Settings",
    role: "button",
  })

  // And the fleet's scheme control lives in the actions slot,
  // which is the composition `Shell` promises.
  expectAgentDrivable(within(banner), {
    name: /colour scheme/i,
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

test("the heading is the page's h1 by default", async () => {
  const { canvas, canvasElement } =
    await mountStory(Responsive)

  await expect(
    canvas.getByRole("heading", { level: 1 }),
  ).toHaveTextContent("Narrow by contract")

  await expectNoAxeViolations(canvasElement)
})

test("every slot arrangement the fleet ships is clean under axe", async () => {
  const { canvasElement } = await mountStory(AllStates)

  await expectNoAxeViolations(canvasElement)
})
