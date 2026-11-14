import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { afterEach, beforeEach, test } from "vitest"

import * as accordionStories from "../Accordion/Accordion.stories.tsx"
import * as menuStories from "../Menu/Menu.stories.tsx"
import * as modalStories from "../Modal/Modal.stories.tsx"
import {
  finishMotion,
  HELD_MOTION,
} from "../motion.testHelpers.ts"
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
 *
 * And they **hold** it: every duration token is an hour on `<body>`,
 * which the canvas and the portalled overlays both inherit from, so
 * no enter or exit can end between two lines of a test however long
 * a click takes (see `HELD_MOTION`). A test that needs one over ends
 * it with `finishMotion`.
 */
const FREEZE_ID = "charcuterie-freeze-motion"

const DURATION_TOKENS = [
  "--duration-fast",
  "--duration-normal",
  "--duration-slow",
]

let frozenStyle: HTMLElement | null = null

beforeEach(() => {
  frozenStyle = document.getElementById(FREEZE_ID)

  frozenStyle?.remove()

  for (const token of DURATION_TOKENS) {
    document.body.style.setProperty(token, HELD_MOTION)
  }
})

afterEach(() => {
  for (const token of DURATION_TOKENS) {
    document.body.style.removeProperty(token)
  }

  if (frozenStyle !== null) {
    document.head.append(frozenStyle)
  }
})

/**
 * Two animation frames: whatever the last event scheduled, React has
 * committed. A barrier tied to the browser's own frames, as in
 * `mountStory`, rather than a millisecond count.
 */
const settleFrames = () =>
  new Promise<void>((resolve) => {
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(() => {
        resolve()
      })
    })
  })

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

  finishMotion(modal)

  await waitFor(() => {
    expect(modal.isConnected).toBe(false)
  })
})

test("a modal re-opened during its exit stays open", async () => {
  const { body, canvas } = await mountStory(ModalPlayground)

  const trigger = canvas.getByRole("button", {
    name: "Open the base modal",
  })

  await userEvent.click(trigger)

  const modal = body.getByRole("dialog")

  await userEvent.keyboard("{Escape}")

  expect(modal).toHaveClass("charcuterie-overlay-exit")

  await userEvent.click(trigger)

  // The same element, back to its enter class, and still here well
  // after the abandoned exit would have removed it.
  await waitFor(() => {
    expect(body.getByRole("dialog")).toBe(modal)
  })

  expect(modal).toHaveClass("charcuterie-overlay-enter")

  // The re-open's own enter ends, which is the `animationend` an
  // abandoned exit listener would mistake for its own. The listener
  // here is added after the hook's, so it runs after any handler the
  // hook still has; two frames then let React commit what it did.
  const enterEnded = new Promise((resolve) => {
    modal.addEventListener("animationend", resolve, {
      once: true,
    })
  })

  finishMotion(modal)

  await enterEnded

  await settleFrames()

  expect(modal.isConnected).toBe(true)

  // Closed again, and gone, so its focus manager has let go of the
  // page before the next test mounts into it.
  await userEvent.keyboard("{Escape}")

  finishMotion(modal)

  await waitFor(() => {
    expect(modal.isConnected).toBe(false)
  })
})

test("an anchored menu grows out of its trigger and leaves with motion", async () => {
  const { body, canvas } = await mountStory(MenuPlayground)

  await userEvent.click(canvas.getAllByRole("button")[0])

  const menu = await waitFor(() => body.getByRole("menu"))

  expect(menu).toHaveClass("charcuterie-overlay-enter")
  expect(menu.style.transformOrigin).not.toBe("")

  await userEvent.keyboard("{Escape}")

  expect(body.queryByRole("menu")).toBeNull()
  expect(menu).toHaveClass("charcuterie-overlay-exit")

  finishMotion(menu)

  await waitFor(() => {
    expect(menu.isConnected).toBe(false)
  })
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

  await userEvent.click(firstHeader)

  // `interpolate-size` is Chromium's, which is what this suite runs.
  expect(panel).toHaveClass("charcuterie-disclosure-exit")
  expect(panel).not.toHaveAttribute("hidden")
  expect(panel).toHaveAttribute("inert")

  finishMotion(panel as HTMLElement)

  await waitFor(() => {
    expect(panel).toHaveAttribute("hidden")
  })
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
  finishMotion(panel)

  await waitFor(() => {
    expect(panel).not.toHaveClass(
      "charcuterie-disclosure-enter",
    )
  })

  expect(panel).not.toHaveAttribute("hidden")
})
