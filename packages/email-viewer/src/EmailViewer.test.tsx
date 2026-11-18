import { mountStory } from "@charcuterie/ui/src/mountStory.testHelpers.ts"
import { expectAgentDrivable } from "@charcuterie/ui/testing"
import { composeStories } from "@storybook/react"
import { expect } from "storybook/test"
import { test } from "vitest"

import * as stories from "./EmailViewer.stories.tsx"

const {
  Attachments,
  Conversation,
  Newsletter,
  Placeholder,
  PlainText,
  ScaledToFit,
  WarnedMail,
} = composeStories(stories)

const frameIn = (root: HTMLElement): HTMLIFrameElement => {
  const frame = root.querySelector("iframe")
  if (!frame) throw new Error("no message frame")
  return frame
}

const waitFor = async (
  isDone: () => boolean,
  what: string,
): Promise<void> => {
  const deadline = Date.now() + 5000
  while (!isDone()) {
    if (Date.now() > deadline)
      throw new Error(`timed out: ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

test("the frame has no same-origin access and its policy denies everything by default", async () => {
  const { canvasElement } = await mountStory(Newsletter)
  const frame = frameIn(canvasElement)
  const sandbox = frame.getAttribute("sandbox") ?? ""

  await expect(sandbox).not.toContain("allow-same-origin")
  await expect(sandbox).not.toContain("allow-forms")
  await expect(frame.getAttribute("referrerpolicy")).toBe(
    "no-referrer",
  )
  const srcDoc = frame.getAttribute("srcdoc") ?? ""
  await expect(srcDoc).toContain("default-src 'none'")
  // Email-authored script cannot run: only the one hashed observer may.
  await expect(srcDoc).toMatch(/script-src 'sha256-[^']+'/)
})

test("parked remote images stay parked until the parent loads them", async () => {
  const { canvasElement } = await mountStory(Newsletter)
  const srcDoc =
    frameIn(canvasElement).getAttribute("srcdoc") ?? ""

  await expect(srcDoc).toContain(`img-src data:">`)
  await expect(srcDoc).not.toContain("img-src data: https:")
  await expect(srcDoc).toContain(
    'data-ms-src="https://images.example.invalid',
  )
  // `data-ms-src` holds the address; a real `src` attribute must not.
  await expect(srcDoc).not.toMatch(
    /\ssrc="https:\/\/images\.example\.invalid/,
  )
})

test("the frame reserves exactly the masthead's height", async () => {
  const { canvasElement } = await mountStory(PlainText)
  const masthead = canvasElement.querySelector<HTMLElement>(
    "header[data-ms-reader-masthead]",
  )
  if (!masthead) throw new Error("no masthead")
  // The border box, rounded up: the same number the frame reserves.
  const expected = Math.ceil(
    masthead.getBoundingClientRect().height,
  )

  await waitFor(
    () =>
      (
        frameIn(canvasElement).getAttribute("srcdoc") ?? ""
      ).includes(`height:${expected}px!important`),
    "the spacer to match the masthead",
  )
})

test("the frame fills its container, not the window", async () => {
  const { canvasElement } = await mountStory(ScaledToFit)
  const frame = frameIn(canvasElement)
  const pane = frame.parentElement?.parentElement
  if (!pane) throw new Error("no pane")

  await expect(
    Math.round(frame.getBoundingClientRect().width),
  ).toBe(Math.round(pane.clientWidth))
  // 22rem cannot hold a 600px newsletter, so it is scaled rather than
  // left to scroll sideways.
  await waitFor(
    () =>
      /body \{ zoom: 0\.\d+;/.test(
        frameIn(canvasElement).getAttribute("srcdoc") ?? "",
      ),
    "the newsletter to scale to the pane",
  )
})

test("a conversation renders as one document with the thread observer", async () => {
  const { canvasElement } = await mountStory(Conversation)
  const srcDoc =
    frameIn(canvasElement).getAttribute("srcdoc") ?? ""

  await expect(srcDoc).toContain('class="ms-thread"')
  await expect(srcDoc).toContain(
    "mail-sifter-thread-active",
  )
})

test("with no document, the placeholder shows and no frame exists", async () => {
  const { canvas, canvasElement } =
    await mountStory(Placeholder)

  await expect(
    canvasElement.querySelector("iframe"),
  ).toBeNull()
  await expect(
    canvas.getByText("Fetching the message"),
  ).toBeVisible()
})

test("warned mail offers Load images above the pane", async () => {
  const { canvas } = await mountStory(WarnedMail)

  expectAgentDrivable(canvas, {
    name: "Load images",
    role: "button",
  })
  await expect(
    canvas.getByText(/1 image parked/),
  ).toBeVisible()
})

test("the attachment list gains columns from its container", async () => {
  const { canvas } = await mountStory(Attachments)
  const [narrow, wide] = canvas.getAllByRole("list", {
    name: "Attachments",
  })
  if (!narrow || !wide)
    throw new Error("two lists expected")

  const columnsOf = (list: HTMLElement): number =>
    getComputedStyle(list).gridTemplateColumns.split(" ")
      .length

  await expect(columnsOf(narrow)).toBe(1)
  await expect(columnsOf(wide)).toBe(2)
  // Without a download handler the rows are not buttons.
  await expect(
    narrow.querySelectorAll("button"),
  ).toHaveLength(0)
  await expect(
    wide.querySelectorAll("button"),
  ).toHaveLength(3)
})
