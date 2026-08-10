import { composeStories } from "@storybook/react"
import { expect, within } from "storybook/test"
import { afterAll, test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import {
  DESKTOP,
  PHONE,
  setViewport,
} from "../viewport.testHelpers.ts"
import * as stories from "./Rail.stories.tsx"

const { AllVariants, Default, Interactive, Responsive } =
  composeStories(stories)

afterAll(async () => {
  await setViewport(DESKTOP)
})

test("landmark decides the element, and both are named", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllVariants)

  const navigation = expectAgentDrivable(canvas, {
    name: "Sections",
    role: "navigation",
  })

  await expect(navigation.tagName).toBe("NAV")

  const complementary = expectAgentDrivable(canvas, {
    name: "Job detail",
    role: "complementary",
  })

  await expect(complementary.tagName).toBe("ASIDE")

  await expectNoAxeViolations(canvasElement)
})

/**
 * The collapse is a restyle, not a second render.
 *
 * Twelve links at 390px and twelve links at 1440px — the number
 * that would be twenty-four in the `hidden`/`lg:hidden`
 * implementation mux-magic and mail-sifter both ship, at every
 * viewport, where an agent cannot tell the visible copy from the
 * hidden one.
 */
test("the same links exist once at both widths", async () => {
  await setViewport(PHONE)

  const phone = await mountStory(Responsive)

  const phoneRail = expectAgentDrivable(phone.canvas, {
    name: "Sections",
    role: "navigation",
  })

  await expect(
    within(phoneRail).getAllByRole("link"),
  ).toHaveLength(12)

  // A strip, not a column: the flex axis is what actually
  // changed. Asserting the axis rather than a height is the
  // lesson from `Alert`'s container-query test, where comparing
  // heights passed with the responsive rule deleted.
  await expect(
    globalThis.getComputedStyle(phoneRail).flexDirection,
  ).toBe("row")

  await setViewport(DESKTOP)

  const desktop = await mountStory(Responsive)

  const desktopRail = expectAgentDrivable(desktop.canvas, {
    name: "Sections",
    role: "navigation",
  })

  await expect(
    within(desktopRail).getAllByRole("link"),
  ).toHaveLength(12)

  await expect(
    globalThis.getComputedStyle(desktopRail).flexDirection,
  ).toBe("column")
})

/**
 * Twelve sections on a phone is the case that makes a naive rail
 * widen the page. The strip owns its overflow instead.
 */
test("a rail too long for a phone scrolls itself, not the page", async () => {
  await setViewport(PHONE)

  const { canvas, canvasElement } =
    await mountStory(Responsive)

  const rail = expectAgentDrivable(canvas, {
    name: "Sections",
    role: "navigation",
  })

  // The fixture really does overflow — otherwise the assertion
  // below is true for the wrong reason.
  await expect(rail.scrollWidth).toBeGreaterThan(
    rail.clientWidth,
  )

  const { documentElement } = document

  await expect(
    documentElement.scrollWidth,
  ).toBeLessThanOrEqual(documentElement.clientWidth)

  // A scrolling region has to be reachable without a mouse. It is
  // here because it is a landmark full of links, which is what
  // axe's `scrollable-region-focusable` accepts — a rail of plain
  // text would not be, and that is the honest limit of the
  // pattern.
  await expectNoAxeViolations(canvasElement)
})

test("the rail scopes its own links away from the header's", async () => {
  await setViewport(DESKTOP)

  const { canvas, canvasElement } =
    await mountStory(Interactive)

  const rail = expectAgentDrivable(canvas, {
    name: "Sections",
    role: "navigation",
  })

  expectAgentDrivable(within(rail), {
    name: "Settings",
    role: "link",
  })

  await expectNoAxeViolations(canvasElement)
})

test("a single start rail is clean under axe", async () => {
  const { canvasElement } = await mountStory(Default)

  await expectNoAxeViolations(canvasElement)
})
