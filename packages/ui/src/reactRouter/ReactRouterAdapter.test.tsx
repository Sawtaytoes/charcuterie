import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { afterEach, test } from "vitest"

import { forgetScrollOffsets } from "../Main/scrollMemory.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import {
  DESKTOP,
  setViewport,
} from "../viewport.testHelpers.ts"
import * as stories from "./ReactRouterAdapter.stories.tsx"

const { Default } = composeStories(stories)

// The offsets are module state, so they outlive a mount. A test
// must not.
afterEach(() => {
  forgetScrollOffsets()
})

/**
 * The wiring, against a real router.
 *
 * `Main.test.tsx` proves the scroll mechanism against a hand-rolled
 * history stack — the right subject for a `ResizeObserver` and a
 * clamped offset. What it cannot prove is that the entry reaches
 * `Main` at all when the value comes from `useLocation()` rather
 * than from a story's own `useState`. That is the seam every app
 * now depends on, and it is the kind that fails quietly: the links
 * still navigate and the list still scrolls.
 */
test("an app renders one component and gets both seams", async () => {
  await setViewport(DESKTOP)

  const { canvas } = await mountStory(Default)

  const main = canvas.getByRole("main")

  // The link seam: react-router's `<Link>` renders an `<a href>`,
  // so this is also what an unwired app looks like — the assertion
  // that separates them is the absence of a page load below.
  const link = expectAgentDrivable(canvas, {
    name: "Open Episode 12",
    role: "link",
  })

  await expect(link).toHaveAttribute(
    "href",
    "/library/Episode 12",
  )

  main.scrollTop = 900

  await waitFor(async () => {
    await expect(main.scrollTop).toBe(900)
  })

  await new Promise((resolve) => {
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(resolve)
    })
  })

  await userEvent.click(link)

  // A soft navigation: the route changed inside the same document.
  // A plain `<a>` would have left the story mounted and unchanged.
  await expect(
    canvas.getByRole("heading", { name: "Episode" }),
  ).toBeVisible()

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Back",
      role: "button",
    }),
  )

  // The scroll seam, from the same one component.
  await waitFor(async () => {
    await expect(canvas.getByRole("main").scrollTop).toBe(
      900,
    )
  })
})
