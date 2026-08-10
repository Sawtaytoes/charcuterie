import {
  composeStories,
  composeStory,
} from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import meta, * as stories from "./ButtonLink.stories.tsx"

const {
  AllStates,
  AllVariants,
  BesideAButton,
  Default,
  External,
  Routed,
} = composeStories(stories)

/**
 * The properties a `<button onClick={navigate}>` cannot have, and the
 * reason this component exists rather than a `Button` with an
 * `onClick`.
 *
 * Nothing here clicks: a real anchor in a real browser navigates, and
 * that it does is the browser's job — getting it for free is the
 * whole argument.
 */
test("is a link, not a button", async () => {
  const { canvas } = await mountStory(Default)

  const link = expectAgentDrivable(canvas, {
    name: "Configure",
    role: "link",
  })

  await expect(link.tagName).toBe("A")
  await expect(link).toHaveAttribute(
    "href",
    "/channels/settings",
  )

  // Middle-click, ctrl-click, "open in new tab", "copy link address"
  // and the status bar all come from *this* — an `href` on an `<a>` —
  // and none of them can be added to a `<button>`.
  await expect(
    canvas.queryByRole("button", { name: "Configure" }),
  ).toBeNull()
})

test("Tab reaches it", async () => {
  const { canvas } = await mountStory(Default)

  const link = canvas.getByRole("link", {
    name: "Configure",
  })

  await userEvent.tab()

  await expect(link).toHaveFocus()
})

/**
 * The claim the component is named for, measured.
 *
 * `Button` and `ButtonLink` both assemble their class list through
 * `getControlClassName`, so there is one source — but a shared
 * function still leaves room for a stray utility, a different base
 * string, or a wrapper element that changes the box. Comparing
 * **computed** styles is the version of "paints identically" that a
 * refactor cannot quietly break, and it is measured in the same
 * chromium the boards screenshot in.
 */
const PAINTED_PROPERTIES = [
  "background-color",
  "block-size",
  "border-color",
  "border-radius",
  "border-width",
  "color",
  "display",
  "font-size",
  "font-weight",
  "padding-inline-end",
  "padding-inline-start",
]

const getPaint = (element: Element) => {
  const computed = getComputedStyle(element)

  return Object.fromEntries(
    PAINTED_PROPERTIES.map((property) => [
      property,
      computed.getPropertyValue(property),
    ]),
  )
}

test("paints identically to a Button with the same props", async () => {
  const { canvas } = await mountStory(BesideAButton)

  const link = canvas.getByRole("link", {
    name: "Configure",
  })

  const button = canvas.getByRole("button", {
    name: "Configure",
  })

  await expect(getPaint(link)).toEqual(getPaint(button))
})

test("an external link opens safely and says so", async () => {
  const { canvas, canvasElement } =
    await mountStory(External)

  const link = expectAgentDrivable(canvas, {
    name: /Open MakeMKV docs/,
    role: "link",
  })

  await expect(link).toHaveAttribute("target", "_blank")
  await expect(link).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  )
  await expect(link).toHaveAccessibleName(
    /opens in a new tab/,
  )

  await expectNoAxeViolations(canvasElement)
})

/**
 * `href` is dropped rather than kept-and-ignored: an anchor with no
 * `href` is out of the tab order and inert by the platform's own
 * rules, and `aria-disabled` is what keeps it announced as a link
 * that is currently unavailable.
 */
test("a disabled link has no href, is skipped by Tab, and still names itself", async () => {
  const { canvas, canvasElement } = await mountStory(
    composeStory(
      { args: { children: "Configure", isDisabled: true } },
      meta,
    ),
  )

  const link = canvas.getByRole("link", {
    name: "Configure",
  })

  await expect(link).not.toHaveAttribute("href")
  await expect(link).toHaveAttribute(
    "aria-disabled",
    "true",
  )

  await userEvent.tab()

  await expect(link).not.toHaveFocus()

  await expectNoAxeViolations(canvasElement)
})

/**
 * There is no `isLoading`, and the absence is the design: a
 * navigation has no pending state this component owns.
 */
test("it has no loading state to get wrong", async () => {
  const { canvas } = await mountStory(AllStates)

  await expect(canvas.queryByRole("status")).toBeNull()

  for (const link of canvas.getAllByRole("link", {
    name: "Configure",
  })) {
    await expect(link).not.toHaveAttribute("aria-busy")
  }
})

test("an injected router takes in-app paths and not external ones", async () => {
  const { canvas } = await mountStory(Routed)

  await expect(
    canvas.getByRole("link", {
      name: "Routed to /channels/settings",
    }),
  ).toHaveAttribute("data-router", "soft")

  await expect(
    canvas.getByRole("link", {
      name: /External to makemkv\.com/,
    }),
  ).not.toHaveAttribute("data-router")
})

test("the full variant board is axe-clean", async () => {
  const { canvasElement } = await mountStory(AllVariants)

  await expectNoAxeViolations(canvasElement)
})
