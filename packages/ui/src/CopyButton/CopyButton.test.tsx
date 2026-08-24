import {
  composeStories,
  composeStory,
} from "@storybook/react"
import {
  expect,
  fn,
  userEvent,
  waitFor,
} from "storybook/test"
import { test, vi } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import meta, * as stories from "./CopyButton.stories.tsx"
import { copyText } from "./copyText.ts"

const { Confirmed, Default, Refused } =
  composeStories(stories)

test("is a button an agent can find by role and name", async () => {
  const { canvas } = await mountStory(Default)

  const button = expectAgentDrivable(canvas, {
    name: "Copy",
    role: "button",
  })

  // Never `submit`. A copy control inside a form that reloads the
  // page is a bug every repo in the fleet has shipped once.
  await expect(button).toHaveAttribute("type", "button")
})

test("copies the value and confirms in place", async () => {
  const copy = fn(async () => true)

  const { canvas } = await mountStory(
    composeStory({ args: { copy, value: "335590" } }, meta),
  )

  await userEvent.click(
    canvas.getByRole("button", { name: "Copy" }),
  )

  await expect(copy).toHaveBeenCalledWith("335590")
  // The press and its proof are the same object — no toast, no
  // second place to look.
  await expect(
    canvas.getByRole("button", { name: "Copied" }),
  ).toBeVisible()
})

/**
 * The half the four hand-rolled copies in the fleet do not have.
 *
 * A refused clipboard has to *say so*, because the consumer's next
 * move usually destroys the thing that held the value — mail-sifter
 * marks the mail done on a copy.
 */
test("says so when the clipboard refuses", async () => {
  const onCopy = fn()

  const { canvas } = await mountStory(
    composeStory(
      { args: { copy: () => false, onCopy } },
      meta,
    ),
  )

  await userEvent.click(
    canvas.getByRole("button", { name: "Copy" }),
  )

  await expect(
    canvas.getByRole("button", { name: "Copy failed" }),
  ).toBeVisible()
  await expect(onCopy).toHaveBeenCalledWith(false, "335590")
})

test("tells the caller what happened, both ways", async () => {
  const onCopy = fn()

  const { canvas } = await mountStory(
    composeStory(
      { args: { copy: async () => true, onCopy } },
      meta,
    ),
  )

  await userEvent.click(
    canvas.getByRole("button", { name: "Copy" }),
  )

  await expect(onCopy).toHaveBeenCalledWith(true, "335590")
})

/**
 * A focused button whose own accessible name changes is not
 * reliably announced, so the outcome is written into a live region
 * as well.
 */
test("announces the outcome in a status region", async () => {
  const { canvas } = await mountStory(Confirmed)

  await expect(
    canvas.getByRole("status"),
  ).toHaveTextContent("Copied to the clipboard.")
})

test("the failure says what to do instead", async () => {
  const { canvas } = await mountStory(Refused)

  await expect(
    canvas.getByRole("status"),
  ).toHaveTextContent(
    "The clipboard refused. Select the value and press Control C.",
  )
})

/** The confirmation goes back on its own. */
test("returns to the resting label", async () => {
  const { canvas } = await mountStory(
    composeStory(
      { args: { confirmDuration: 20, copy: () => true } },
      meta,
    ),
  )

  await userEvent.click(
    canvas.getByRole("button", { name: "Copy" }),
  )
  await expect(
    canvas.getByRole("button", { name: "Copied" }),
  ).toBeVisible()

  await waitFor(async () => {
    await expect(
      canvas.getByRole("button", { name: "Copy" }),
    ).toBeVisible()
  })
})

/**
 * A caller's `onClick` runs first and can call it off — the escape
 * hatch for "confirm before this leaves the screen".
 */
test("a prevented click copies nothing", async () => {
  const copy = fn(() => true)

  const { canvas } = await mountStory(
    composeStory(
      {
        args: {
          copy,
          onClick: (event: MouseEvent) => {
            event.preventDefault()
          },
        },
      },
      meta,
    ),
  )

  await userEvent.click(
    canvas.getByRole("button", { name: "Copy" }),
  )

  await expect(copy).not.toHaveBeenCalled()
})

test("has no axe violations", async () => {
  const { canvasElement } = await mountStory(Default)

  await expectNoAxeViolations(canvasElement)
})

/**
 * `copyText`'s own contract, exercised here rather than in a
 * node-side `.ts` file, because it is a DOM routine and the `ui`
 * project has no DOM.
 *
 * The real clipboard is unavailable in this chromium — the document
 * is not focused, so `navigator.clipboard.writeText` rejects — which
 * makes this an honest test of the fallback chain rather than of the
 * happy path.
 */
test("copyText reports failure rather than throwing", async () => {
  const execCommand = vi
    .spyOn(document, "execCommand")
    .mockReturnValue(false)

  await expect(copyText("335590")).resolves.toBe(false)

  execCommand.mockRestore()
})

test("copyText falls back to the selection route", async () => {
  const execCommand = vi
    .spyOn(document, "execCommand")
    .mockReturnValue(true)

  await expect(copyText("335590")).resolves.toBe(true)
  await expect(execCommand).toHaveBeenCalledWith("copy")

  execCommand.mockRestore()
})

/**
 * The textarea is a means, not a side effect. A leaked one is a
 * focusable, screen-reader-visible node holding the copied value,
 * left in the document for good.
 */
test("copyText leaves no textarea behind", async () => {
  const execCommand = vi
    .spyOn(document, "execCommand")
    .mockImplementation(() => {
      throw new Error("refused mid-copy")
    })

  await expect(copyText("335590")).resolves.toBe(false)
  await expect(
    document.querySelectorAll("textarea"),
  ).toHaveLength(0)

  execCommand.mockRestore()
})
