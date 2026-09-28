import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Breadcrumbs.stories.tsx"

const {
  AllStates,
  AllVariants,
  Interactive,
  Playground,
  Responsive,
  Routed,
} = composeStories(stories)

/**
 * The APG breadcrumb pattern: a named `<nav>` landmark around an
 * ordered list, one `listitem` per rung.
 */
test("is a named navigation landmark around an ordered list", async () => {
  const { canvas, canvasElement } =
    await mountStory(Playground)

  const nav = expectAgentDrivable(canvas, {
    name: "Breadcrumb",
    role: "navigation",
  })

  const list = nav.querySelector("ol")

  await expect(list).not.toBeNull()
  await expect(
    canvas.getAllByRole("listitem"),
  ).toHaveLength(4)

  await expectNoAxeViolations(canvasElement)
})

test("every rung but the last is a link; the last is the current page", async () => {
  const { canvas } = await mountStory(Playground)

  const links = canvas.getAllByRole("link")

  await expect(
    links.map((link: HTMLElement) => link.textContent),
  ).toEqual(["Library", "Handbook", "runbooks"])
  await expect(links[1]).toHaveAttribute(
    "href",
    "/handbook",
  )

  const current = canvas.getByText(
    "restoring-a-snapshot.md",
  )

  await expect(current.tagName).toBe("SPAN")
  await expect(current).toHaveAttribute(
    "aria-current",
    "page",
  )
  // Exactly one current rung.
  await expect(
    canvas
      .getByRole("navigation")
      .querySelectorAll("[aria-current]"),
  ).toHaveLength(1)
})

/**
 * The Whereabouts shape: the trail sits above a heading that already
 * names the page, so every rung links and nothing claims to be current.
 */
test("a trail of links only has no current rung", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllVariants)

  const nav: HTMLElement = canvas.getByRole("navigation", {
    name: "Full place trail",
  })

  await expect(nav.querySelectorAll("a")).toHaveLength(3)
  await expect(
    nav.querySelector("[aria-current]"),
  ).toBeNull()

  await expectNoAxeViolations(canvasElement)
})

test("the separator is decorative", async () => {
  const { canvas } = await mountStory(AllVariants)

  const nav: HTMLElement = canvas.getByRole("navigation", {
    name: "Slash trail",
  })

  // Three separators between four rungs, all hidden, none before the
  // first rung.
  const separators = nav.querySelectorAll(
    '[aria-hidden="true"]',
  )

  await expect(separators).toHaveLength(3)
  await expect(
    nav.querySelector("li")?.querySelector("[aria-hidden]"),
  ).toBeNull()
  // The slash never reaches a rung's name.
  await expect(
    nav.querySelector('a[href="/handbook"]'),
  ).toHaveAccessibleName("Handbook")
})

/**
 * A link rung and a button rung are the same thing to a reader, so
 * they are painted the same: same colour, same weight.
 */
test("a button rung is painted as a link rung", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const link = canvas.getAllByRole("link", {
    name: "Places",
  })[0]

  const button = canvas.getAllByRole("button", {
    name: "Places",
  })[0]

  if (link === undefined || button === undefined) {
    throw new Error("Both rungs must render.")
  }

  await expect(getComputedStyle(button).color).toBe(
    getComputedStyle(link).color,
  )
  await expect(getComputedStyle(button).fontWeight).toBe(
    getComputedStyle(link).fontWeight,
  )
  await expect(
    getComputedStyle(button).backgroundColor,
  ).toBe("rgba(0, 0, 0, 0)")

  await expectNoAxeViolations(canvasElement)
})

/**
 * Wraps, never truncates: at the narrowest panel every rung's full
 * text is still in the layout, and no rung is wider than the trail.
 */
test("a long trail wraps inside a narrow container and hides nothing", async () => {
  const { canvas, canvasElement } =
    await mountStory(Responsive)

  const nav: HTMLElement = canvas.getByRole("navigation", {
    name: "Trail at 15rem",
  })

  const navWidth = nav.getBoundingClientRect().width

  for (const item of Array.from(
    nav.querySelectorAll("li"),
  )) {
    await expect(
      item.getBoundingClientRect().width,
    ).toBeLessThanOrEqual(navWidth + 0.5)
  }

  const fileName = canvas.getAllByText(
    /a-very-long-file-name/,
  )[0]

  if (fileName === undefined) {
    throw new Error("The file rung must render.")
  }

  await expect(
    getComputedStyle(fileName).textOverflow,
  ).not.toBe("ellipsis")
  await expect(fileName.scrollWidth).toBeLessThanOrEqual(
    fileName.clientWidth + 1,
  )
  // More than one line: the list wrapped.
  await expect(
    nav.querySelector("ol")?.getBoundingClientRect().height,
  ).toBeGreaterThan(30)

  await expectNoAxeViolations(canvasElement)
})

test("an in-app href goes through the injected router", async () => {
  const { canvas } = await mountStory(Routed)

  await expect(
    canvas.getByRole("link", { name: "Places" }),
  ).toHaveAttribute("data-router", "soft")
})

/**
 * Tab walks the rungs in order and skips the current folder, which is
 * text. Enter climbs to a rung; Space does the same on the next one.
 */
test("the keyboard walks and climbs the trail", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  await expect(
    canvas
      .getAllByRole("button")
      .map((button: HTMLElement) => button.textContent),
  ).toEqual(["G:", "Photos", "2026"])

  await userEvent.tab()
  await expect(
    canvas.getByRole("button", { name: "G:" }),
  ).toHaveFocus()

  await userEvent.tab()
  await userEvent.tab()
  await expect(
    canvas.getByRole("button", { name: "2026" }),
  ).toHaveFocus()

  await userEvent.keyboard("{Enter}")

  await expect(
    canvas.getByText("2026").closest("[aria-current]"),
  ).toHaveAttribute("aria-current", "page")
  await expect(
    canvas.queryByText("Garden", { selector: "li *" }),
  ).toBeNull()

  // The pressed rung became text and left the tab order, so Tab
  // starts again from the top.
  await userEvent.tab()
  await userEvent.tab()
  await expect(
    canvas.getByRole("button", { name: "Photos" }),
  ).toHaveFocus()

  await userEvent.keyboard(" ")

  await expect(canvas.getByText("Photos")).toHaveAttribute(
    "aria-current",
    "page",
  )

  await expectNoAxeViolations(canvasElement)
})
