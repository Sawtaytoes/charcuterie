import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import * as stories from "./FileDropZone.stories.tsx"

const { AllStates, AllVariants, Default, Interactive } =
  composeStories(stories)

/**
 * There is **no keyboard gesture for drag-and-drop**, and WCAG 2.5.7
 * (AA since 2.2) requires a single-pointer alternative for any
 * dragging movement. The honest one has existed since 1995: a real
 * `<input type="file">`.
 *
 * So the zone is a `<label>` around an input, and the drop handlers
 * are an enhancement on a control that already works without them.
 * The fleet's one drag target — gallery-downloader's page — has no
 * keyboard path at all.
 */
/**
 * **The one component in this library that cannot use
 * `expectAgentDrivable`, and the reason is worth the space.**
 *
 * `<input type="file">` — the accessible, keyboard-operable answer,
 * the whole point of the design above — has **no ARIA role**.
 * HTML-AAM defines none, so testing-library's role computation
 * matches it to nothing and `getByRole("button")` returns zero
 * elements.
 *
 * Browsers disagree with the specification and with each other:
 * Chrome exposes it as a button in its accessibility tree, and
 * **Playwright's own role engine maps it to `button`** — so
 * `page.getByRole("button", { name })` finds it in a real agent run
 * while `canvas.getByRole` cannot find it here.
 *
 * That is a genuine hole in this library's central claim, and it is
 * a hole in the platform rather than in the component: the *most*
 * accessible file control is the one the role model has no name for.
 * `getByLabelText` is the honest query — and it is also what
 * `page.getByLabel(…).setInputFiles(…)` does, which is how an agent
 * drives this in practice.
 */
test("the zone is a real file input, reachable and named", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const input = canvas.getByLabelText(
    "Drop a disc image here",
  )

  await expect(input.tagName).toBe("INPUT")

  await expect(input).toHaveAttribute("type", "file")

  // Reachable with Tab. `sr-only` is the clip-rect technique, which
  // keeps an element focusable — `display: none` would not.
  await expect(input.tabIndex).toBeGreaterThanOrEqual(0)

  await expectNoAxeViolations(canvasElement)
})

test("`accept` and `multiple` reach the input", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllVariants)

  await expect(
    canvas.getByLabelText("Drop subtitle files"),
  ).toHaveAttribute("multiple")

  await expect(
    canvas.getByLabelText("Drop a subtitle track"),
  ).toHaveAttribute("accept", ".srt,.ass")

  await expectNoAxeViolations(canvasElement)
})

test("a disabled zone disables its input", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  await expect(
    canvas.getByLabelText("Drop a disabled image"),
  ).toBeDisabled()

  await expectNoAxeViolations(canvasElement)
})

test("choosing a file through the picker reports it", async () => {
  const { canvas } = await mountStory(Interactive)

  const input = canvas.getByLabelText(
    "Drop files or a link",
  ) as HTMLInputElement

  await userEvent.upload(
    input,
    new File(["disc"], "blade-runner.iso", {
      type: "application/octet-stream",
    }),
  )

  await waitFor(() => {
    expect(
      canvas.getByText("blade-runner.iso"),
    ).toBeInTheDocument()
  })
})

/**
 * A file input keeps its value, so picking the *same* file twice is
 * not a change and the handler never runs — which reads as "it
 * ignored me" and is the oldest bug in this control. The input is
 * cleared after every pick.
 */
test("the same file can be chosen twice", async () => {
  const { canvas } = await mountStory(Interactive)

  const input = canvas.getByLabelText(
    "Drop files or a link",
  ) as HTMLInputElement

  const file = new File(["disc"], "alien.iso", {
    type: "application/octet-stream",
  })

  await userEvent.upload(input, file)

  await waitFor(() => {
    expect(
      canvas.getByText("alien.iso"),
    ).toBeInTheDocument()
  })

  await expect(input.value).toBe("")

  await userEvent.upload(input, file)

  await waitFor(() => {
    expect(
      canvas.getByText("alien.iso"),
    ).toBeInTheDocument()
  })
})

/**
 * Dragging a link gives `text/plain` and an **empty** `files` list.
 * A zone that only reads `.files` silently ignores the single most
 * common thing a user drags into a downloader.
 */
test("a dropped link reports as text", async () => {
  const { canvas } = await mountStory(Interactive)

  const zone = canvas
    .getByLabelText("Drop files or a link")
    .closest("label")

  const dataTransfer = new DataTransfer()

  dataTransfer.setData(
    "text",
    "https://example.test/gallery/42",
  )

  // `dragover` first, and its default action is to **reject** the
  // drop — without `preventDefault` the `drop` below never fires at
  // all. Nothing errors; the zone just looks broken.
  zone?.dispatchEvent(
    new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }),
  )

  zone?.dispatchEvent(
    new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }),
  )

  await waitFor(() => {
    expect(
      canvas.getByText("https://example.test/gallery/42"),
    ).toBeInTheDocument()
  })
})

/**
 * `dragenter` and `dragleave` fire once per **element** the pointer
 * crosses, not once per zone — so a plain boolean turns the
 * highlight off halfway across and it strobes.
 * gallery-downloader's page keeps a `dragDepth` counter, which is
 * the correct fix and is reproduced here.
 */
test("the highlight survives crossing a child element", async () => {
  const { canvas } = await mountStory(Default)

  const zone = canvas
    .getByLabelText("Drop a disc image here")
    .closest("label") as HTMLLabelElement

  const [child] = Array.from(zone.querySelectorAll("span"))

  const dispatch = (type: string, target: Element) => {
    target.dispatchEvent(
      new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      }),
    )
  }

  dispatch("dragenter", zone)

  const activeClass = zone.className

  // Entering a child fires `dragenter` again *and* `dragleave` on
  // the zone. Depth goes 1 → 2 → 1, so the highlight stays on.
  dispatch("dragenter", child ?? zone)

  dispatch("dragleave", zone)

  await expect(zone.className).toBe(activeClass)
})
