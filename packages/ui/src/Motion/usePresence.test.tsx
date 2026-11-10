import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { afterEach, beforeEach, test } from "vitest"

import * as accordionStories from "../Accordion/Accordion.stories.tsx"
import * as menuStories from "../Menu/Menu.stories.tsx"
import * as modalStories from "../Modal/Modal.stories.tsx"
import { mountStory } from "../mountStory.testHelpers.ts"
import { getAnimationLengthMs } from "./usePresence.ts"

const { Playground: ModalPlayground } =
  composeStories(modalStories)

const { Playground: MenuPlayground } =
  composeStories(menuStories)

const { Playground: AccordionPlayground } = composeStories(
  accordionStories,
)

/**
 * The suite freezes motion for every test (`FREEZE_MOTION_CSS`), which
 * is what keeps every other overlay test synchronous. These tests are
 * about the motion itself, so they lift the freeze for their own
 * duration and put it back after.
 */
const FREEZE_ID = "charcuterie-freeze-motion"

let frozenStyle: HTMLElement | null = null

beforeEach(() => {
  frozenStyle = document.getElementById(FREEZE_ID)

  frozenStyle?.remove()
})

afterEach(() => {
  if (frozenStyle !== null) {
    document.head.append(frozenStyle)
  }
})

const SLOW_EXIT = "1500ms"

const MOTION_TIMEOUT = { timeout: 5_000 }

test("the animation length is the longest delay plus duration, and zero with no animation", () => {
  const element = document.createElement("div")

  document.body.append(element)

  expect(getAnimationLengthMs(element)).toBe(0)

  element.style.animation =
    "charcuterie-fade-out 120ms linear 30ms, charcuterie-overlay-out 0.2s linear"

  expect(getAnimationLengthMs(element)).toBe(200)

  // A zero duration is no animation, whatever its name — that is the
  // frozen suites' rendering, and it must unmount at once.
  element.style.animation = "charcuterie-fade-out 0s linear"

  expect(getAnimationLengthMs(element)).toBe(0)
})

test("a closing modal stays in the page, closed to everything but the eye, until its exit ends", async () => {
  const { body, canvas } = await mountStory(ModalPlayground)

  const trigger = canvas.getByRole("button", {
    name: "Open the base modal",
  })

  await userEvent.click(trigger)

  const modal = body.getByRole("dialog")

  expect(modal).toHaveClass("charcuterie-overlay-enter")

  // Long enough that a loaded host cannot finish the exit between two
  // lines of this test. The inline longhand beats the class's.
  modal.style.animationDuration = SLOW_EXIT

  await userEvent.keyboard("{Escape}")

  // Already gone to a role query, the keyboard, and the pointer…
  expect(body.queryByRole("dialog")).toBeNull()
  expect(modal).toHaveAttribute("inert")
  expect(modal).toHaveClass("charcuterie-overlay-exit")

  // …and focus is back on the trigger without waiting for the motion.
  await waitFor(() => {
    expect(trigger).toHaveFocus()
  })

  // But still painted, until the exit animation finishes.
  expect(modal.isConnected).toBe(true)

  await waitFor(() => {
    expect(modal.isConnected).toBe(false)
  }, MOTION_TIMEOUT)
})

test("a modal re-opened during its exit stays open", async () => {
  const { body, canvas } = await mountStory(ModalPlayground)

  const trigger = canvas.getByRole("button", {
    name: "Open the base modal",
  })

  await userEvent.click(trigger)

  const modal = body.getByRole("dialog")

  modal.style.animationDuration = SLOW_EXIT

  await userEvent.keyboard("{Escape}")

  expect(modal).toHaveClass("charcuterie-overlay-exit")

  await userEvent.click(trigger)

  // The same element, back to its enter class, and still here well
  // after the abandoned exit would have removed it.
  await waitFor(() => {
    expect(body.getByRole("dialog")).toBe(modal)
  })

  expect(modal).toHaveClass("charcuterie-overlay-enter")

  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, 400)
  })

  expect(modal.isConnected).toBe(true)

  // Closed again, and gone, so its focus manager has let go of the
  // page before the next test mounts into it.
  modal.style.animationDuration = ""

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(modal.isConnected).toBe(false)
  }, MOTION_TIMEOUT)
})

test("an anchored menu grows out of its trigger and leaves with motion", async () => {
  const { body, canvas } = await mountStory(MenuPlayground)

  await userEvent.click(canvas.getAllByRole("button")[0])

  const menu = await waitFor(() => body.getByRole("menu"))

  expect(menu).toHaveClass("charcuterie-overlay-enter")
  expect(menu.style.transformOrigin).not.toBe("")

  menu.style.animationDuration = SLOW_EXIT

  await userEvent.keyboard("{Escape}")

  expect(body.queryByRole("menu")).toBeNull()
  expect(menu).toHaveClass("charcuterie-overlay-exit")

  await waitFor(() => {
    expect(menu.isConnected).toBe(false)
  }, MOTION_TIMEOUT)
})

test("an accordion section stays shown while it collapses, then hides", async () => {
  const { canvas } = await mountStory(AccordionPlayground)

  const [firstHeader] = canvas.getAllByRole("button", {
    expanded: false,
  })

  await userEvent.click(firstHeader)

  const panel = document.getElementById(
    firstHeader.getAttribute("aria-controls") ?? "",
  )

  expect(panel).not.toBeNull()
  expect(panel).not.toHaveAttribute("hidden")

  panel?.style.setProperty("animation-duration", SLOW_EXIT)

  await userEvent.click(firstHeader)

  // `interpolate-size` is Chromium's, which is what this suite runs.
  expect(panel).toHaveClass("charcuterie-disclosure-exit")
  expect(panel).not.toHaveAttribute("hidden")
  expect(panel).toHaveAttribute("inert")

  await waitFor(() => {
    expect(panel).toHaveAttribute("hidden")
  }, MOTION_TIMEOUT)
})

test("an accordion section drops its open class when it has opened", async () => {
  const { canvas } = await mountStory(AccordionPlayground)

  const [firstHeader] = canvas.getAllByRole("button", {
    expanded: false,
  })

  await userEvent.click(firstHeader)

  const panel = document.getElementById(
    firstHeader.getAttribute("aria-controls") ?? "",
  ) as HTMLElement

  expect(panel).toHaveClass("charcuterie-disclosure-enter")

  // Off once it has opened, so showing an ancestor again does not
  // replay it, and its `overflow: clip` no longer clips the content.
  await waitFor(() => {
    expect(panel).not.toHaveClass(
      "charcuterie-disclosure-enter",
    )
  }, MOTION_TIMEOUT)

  expect(panel).not.toHaveAttribute("hidden")
})
