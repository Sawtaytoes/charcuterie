import {
  composeStories,
  composeStory,
} from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import meta, * as stories from "./TextLink.stories.tsx"

const {
  AllAppearances,
  AllStates,
  BackLink,
  Default,
  External,
  Routed,
} = composeStories(stories)

/**
 * Nothing here **clicks** a link. A real `<a href>` in a real browser
 * navigates, and navigating the test page away is not a failure mode
 * worth reproducing — so the contract asserted is the one that
 * matters: the element, its `href`, and its place in the tab order.
 * That the browser then navigates is the browser's job, and getting
 * it for free is the entire argument for rendering an anchor.
 */
test("is drivable by role and name", async () => {
  const { canvas } = await mountStory(Default)

  const link = expectAgentDrivable(canvas, {
    name: "the rip queue",
    role: "link",
  })

  await expect(link).toHaveAttribute("href", "/library")
})

test("Tab reaches it", async () => {
  const { canvas } = await mountStory(Default)

  const link = canvas.getByRole("link", {
    name: "the rip queue",
  })

  await userEvent.tab()

  await expect(link).toHaveFocus()
})

/**
 * The whole difference between the two appearances, measured rather
 * than eyeballed: an inline link is `display: inline` so it wraps
 * with the prose around it, and it carries a permanent underline
 * because colour alone cannot mark a link inside a paragraph
 * (WCAG 1.4.1). A standalone one is a flex box with a gap for its
 * icon, and underlines only on hover.
 */
test("inline flows with prose; standalone is its own box", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllAppearances)

  const inline = canvas.getByRole("link", {
    name: "the rip queue",
  })

  const standalone = canvas.getByRole("link", {
    name: "Back to all discs",
  })

  await expect(getComputedStyle(inline).display).toBe(
    "inline",
  )

  await expect(
    getComputedStyle(inline).textDecorationLine,
  ).toBe("underline")

  // `display` is asserted as *containing* flex rather than equalling
  // `inline-flex`: this cell is itself a flex container, and CSS
  // blockifies a flex item's outer display, so `inline-flex` computes
  // to `flex` here and would compute to `inline-flex` one story over.
  // `align-items` is the property that survives blockification and is
  // the one doing the work — it is what puts a back-arrow on the
  // text's centre line.
  await expect(
    getComputedStyle(standalone).display,
  ).toContain("flex")

  await expect(
    getComputedStyle(standalone).alignItems,
  ).toBe("center")

  await expect(
    getComputedStyle(standalone).textDecorationLine,
  ).toBe("none")

  await expectNoAxeViolations(canvasElement)
})

test("a back-link is one anchor, not an icon beside a link", async () => {
  const { canvas } = await mountStory(BackLink)

  // The `←` is *inside* the anchor, so the arrow is part of the tap
  // target rather than a decoration sitting next to it — which is
  // what makes the hand-rolled version in seven repos a 40px target
  // instead of a 12px one.
  const link = expectAgentDrivable(canvas, {
    name: "Back to all discs",
    role: "link",
  })

  await expect(link.querySelector("svg")).not.toBeNull()
  await expect(link).toHaveAttribute("href", "/discs")
})

/**
 * `target="_blank"` without `rel="noopener"` hands the destination a
 * live `window.opener` into the app, and a new tab with no warning is
 * a WCAG 3.2.5 surprise. Both are the component's job, not the
 * caller's.
 */
test("an external link opens safely and says so", async () => {
  const { canvas, canvasElement } =
    await mountStory(External)

  const link = expectAgentDrivable(canvas, {
    name: /the MakeMKV forum thread/,
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
 * A disabled link is not a platform concept, so the component builds
 * one out of the two things that are: **no `href`** — which is what
 * takes an anchor out of the tab order and makes it inert — and
 * `aria-disabled`, which is what keeps it announced as a link rather
 * than disappearing into a `<span>`.
 *
 * The alternative every hand-rolled version ships is a focusable
 * `<a href>` with a click handler that returns early: reachable,
 * pressable, and silently does nothing.
 */
test("a disabled link has no href, is skipped by Tab, and still names itself", async () => {
  const { canvas, canvasElement } = await mountStory(
    composeStory(
      {
        args: {
          children: "the rip queue",
          isDisabled: true,
        },
      },
      meta,
    ),
  )

  const link = canvas.getByRole("link", {
    name: "the rip queue",
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
 * The seam, and the two destinations it hands back to the platform.
 */
test("an injected router takes in-app paths and nothing else", async () => {
  const { canvas } = await mountStory(Routed)

  await expect(
    canvas.getByRole("link", {
      name: "Routed to /library",
    }),
  ).toHaveAttribute("data-router", "soft")

  await expect(
    canvas.getByRole("link", {
      name: /External to makemkv\.com/,
    }),
  ).not.toHaveAttribute("data-router")

  await expect(
    canvas.getByRole("link", {
      name: "Fragment to #credits",
    }),
  ).not.toHaveAttribute("data-router")
})

test("with no provider it is still a real anchor", async () => {
  const { canvas } = await mountStory(Default)

  const link = canvas.getByRole("link", {
    name: "the rip queue",
  })

  // The default seam is `AnchorLink`, so an app with no router
  // installed gets a working link rather than a runtime error or a
  // dead `<span>`.
  await expect(link.tagName).toBe("A")
  await expect(link).not.toHaveAttribute("data-router")
})

test("the states board is axe-clean in every state it forces", async () => {
  const { canvasElement } = await mountStory(AllStates)

  await expectNoAxeViolations(canvasElement)
})
