/**
 * What the runs become in the DOM — the half `inlineMarkdown.test.ts`
 * deliberately does not assert.
 *
 * The load-bearing test here is the nesting one. Every other
 * assertion in this file would still pass if the component wrapped
 * itself in an anchor, the page would look exactly right, and half
 * of each title would quietly stop opening the task.
 *
 * Subjects are the composed **stories**, per this package's
 * story/test split — so what is asserted is what a reader sees.
 */

import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./MarkdownLine.stories.tsx"

const {
  AllMarks,
  AsALink,
  Default,
  FileNames,
  RefusedUrl,
  Routed,
  TitleAsALink,
} = composeStories(stories)

test("a code span is a `code` element, and the backticks are gone", async () => {
  const { canvasElement } = await mountStory(Default)

  await expect(
    [...canvasElement.querySelectorAll("code")].map(
      (element) => element.textContent,
    ),
  ).toEqual(["Downloads/MOVIES", String.raw`G:\Movies`])

  await expect(canvasElement.textContent).toBe(
    String.raw`Ingest 53 movies from Downloads/MOVIES into G:\Movies`,
  )
})

test("each mark renders its own element", async () => {
  const { canvasElement } = await mountStory(AllMarks)

  await expect(
    canvasElement.querySelector("strong")?.textContent,
  ).toBe("Urgent:")

  await expect(
    canvasElement.querySelector("em")?.textContent,
  ).toBe("Halloween")

  await expect(
    canvasElement.querySelector("s")?.textContent,
  ).toBe("Buy a second spool")
})

/**
 * The rule that keeps a file name a file name. Asserted on the DOM
 * rather than only on the runs because this is the one a reader
 * reports — *"why is half my path in italics"* — and the story is
 * what they would be looking at.
 */
test("an underscore inside a word marks nothing", async () => {
  const { canvasElement } = await mountStory(FileNames)

  await expect(canvasElement.querySelector("em")).toBe(null)
  await expect(canvasElement.querySelector("strong")).toBe(
    null,
  )

  await expect(canvasElement.textContent).toContain(
    "ingest_the_files.sh",
  )
})

test("a line with no href has nothing to click", async () => {
  const { canvasElement } = await mountStory(Default)

  await expect(canvasElement.querySelector("a")).toBe(null)
})

/**
 * `<a><a/></a>` is not something React refuses and not something the
 * browser reports. The HTML parser closes the outer anchor at the
 * inner one's start tag, so the text *after* the inner link stops
 * being part of the card's link — it looks correct and half of it
 * does not work.
 */
test("a link inside the line is a SIBLING anchor, never a nested one", async () => {
  const { canvas, canvasElement } =
    await mountStory(AsALink)

  await expect(canvasElement.querySelector("a a")).toBe(
    null,
  )

  await expect(
    canvas
      .getAllByRole("link")
      .map((link: HTMLElement) =>
        link.getAttribute("href"),
      ),
  ).toEqual([
    "/tasks/7",
    "/tasks/7",
    "https://example.invalid/pulls/53",
    "/tasks/7",
    "https://example.invalid/pulls/53",
  ])
})

/**
 * Each anchor is named by the words it covers, and the names are
 * therefore DISTINCT.
 *
 * Naming all three after the whole line was tried first and is
 * worse: two links with one name are ambiguous to anything driving
 * the page by name, and `expectAgentDrivable` refuses it outright.
 * What is announced now matches what is on screen, which is also
 * WCAG 2.5.3.
 */
test("split anchors are named by their own words", async () => {
  const { canvas } = await mountStory(Routed)

  const link = expectAgentDrivable(canvas, {
    name: "Ship",
    role: "link",
  })

  await expect(link).toHaveAttribute("href", "/tasks/7")

  await expect(
    expectAgentDrivable(canvas, {
      name: "tonight",
      role: "link",
    }),
  ).toHaveAttribute("href", "/tasks/7")
})

test("Tab reaches every anchor in the line", async () => {
  const { canvas } = await mountStory(Routed)

  const links = canvas.getAllByRole("link")

  await userEvent.tab()

  await expect(links[0]).toHaveFocus()

  await userEvent.tab()

  await expect(links[1]).toHaveFocus()
})

/**
 * The injected router gets the in-app destination and never gets the
 * off-origin one, which would push a route the SPA does not have
 * onto its history stack.
 */
test("the router is handed the in-app destination only", async () => {
  const { canvas } = await mountStory(Routed)

  const [task, pullRequest] = canvas.getAllByRole("link")

  await expect(task).toHaveAttribute("data-router", "soft")
  await expect(pullRequest).not.toHaveAttribute(
    "data-router",
  )
  await expect(pullRequest).toHaveAttribute(
    "target",
    "_blank",
  )
  await expect(pullRequest).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  )
})

/**
 * The guard itself lives in `safeUrls.ts` and is tested there. What
 * matters here is the *response* to a refusal: no anchor at all,
 * rather than a dead one.
 */
test("a refused scheme renders its source as text", async () => {
  const { canvasElement } = await mountStory(RefusedUrl)

  await expect(canvasElement.querySelector("a")).toBe(null)

  await expect(canvasElement.textContent).toBe(
    "[click me](javascript:alert(1))",
  )
})

/**
 * THE SPACES AROUND A MARK SURVIVE INTO THE ACCESSIBLE NAME.
 *
 * The name computation trims each **element** child's contribution
 * before joining them, so a line whose every run was wrapped in a
 * `<span>` announced as `Ingest 53 movies fromDownloads/MOVIESinto`
 * — painted correctly, announced as one run-on word, and invisible
 * to any assertion that reads `textContent`.
 *
 * Found through `Board`'s move handle, which is named after the
 * card's title. The fix is that an unmarked run is a text node
 * rather than a wrapped one; this is the guard that keeps it.
 */
test("the accessible name keeps the spaces around a mark", async () => {
  const { canvas } = await mountStory(TitleAsALink)

  await expect(
    canvas.getByRole("link", {
      name: "Ingest 53 movies from Downloads/MOVIES tonight",
    }),
  ).toBeInTheDocument()
})
