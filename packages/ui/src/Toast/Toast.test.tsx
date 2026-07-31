import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test, expect as vitestExpect } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Toast.stories.tsx"
import { toastTransitions } from "./toastLifecycle.ts"

const { AllStates, AllVariants, Default, Interactive } =
  composeStories(stories)

/**
 * The illegal transitions are the specification, so they are
 * asserted as a property of the table rather than by trying to drive
 * a component into a state it refuses to enter.
 */
test("a toast cannot skip its exit, and `removed` is terminal", () => {
  // Skipping straight to `removed` is the flicker every hand-rolled
  // toast stack has: the node disappears mid-animation.
  vitestExpect(toastTransitions.visible).not.toContain(
    "removed",
  )

  // Terminal, which is what lets the region call `onDismiss`
  // exactly once. `createStatus` throws on an illegal transition, so
  // a second timer firing after the first is a loud failure rather
  // than a duplicate removal.
  vitestExpect(toastTransitions.removed).toEqual([])

  // And the one that looks like an oddity until you know why:
  // pointing at a toast that is already sliding away has to bring
  // it back, or the user is chasing a disappearing message.
  vitestExpect(toastTransitions.exiting).toContain(
    "visible",
  )
})

test("the region names itself, and does not re-read the stack", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Finish a rip",
      role: "button",
    }),
  )

  const region = expectAgentDrivable(canvas, {
    name: "Notifications",
    role: "status",
  })

  // `role="status"` is polite *and atomic by default*, and atomic is
  // wrong here — it re-reads the entire stack every time one
  // arrives. Spelling `false` beside it is what makes a second toast
  // announce only itself.
  await expect(region).toHaveAttribute(
    "aria-atomic",
    "false",
  )

  await expectNoAxeViolations(canvasElement)
})

test("each toast's dismiss button is named for its own toast", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  // A stack of three all offering "Dismiss" gives one query three
  // matches, which `expectAgentDrivable` treats as a failure —
  // correctly, since an agent would be picking one at random. This
  // is why `title` is a string rather than a `ReactNode`.
  expectAgentDrivable(canvas, {
    name: "Dismiss Pinned open",
    role: "button",
  })

  expectAgentDrivable(canvas, {
    name: "Dismiss Timed",
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

test("dismissing runs the exit and then removes, once", async () => {
  const { canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Finish a rip",
      role: "button",
    }),
  )

  const dismiss = await waitFor(() =>
    expectAgentDrivable(canvas, {
      name: "Dismiss Rip 1 finished",
      role: "button",
    }),
  )

  await userEvent.click(dismiss)

  // It leaves through `exiting`, so it is still in the DOM for the
  // exit duration — and then gone. `onDismiss` firing twice would
  // throw inside `createStatus` rather than removing a second toast.
  await waitFor(() => {
    expect(
      canvas.queryAllByRole("button", {
        name: "Dismiss Rip 1 finished",
      }),
    ).toHaveLength(0)
  })
})

test("a pinned toast stays put", async () => {
  const { canvas } = await mountStory(Default)

  const dismiss = expectAgentDrivable(canvas, {
    name: "Dismiss Rip finished",
    role: "button",
  })

  // `duration={0}` is WCAG 2.2.1's answer for a toast carrying an
  // action: a moving deadline the user cannot meet is not a
  // deadline, it is a disappearing message.
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, 300)
  })

  await expect(dismiss).toBeInTheDocument()
})

test("intent is a semantic role, not a colour", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllVariants)

  // Four toasts, four intents, four distinct names — the board is
  // one proposition (every intent renders) rather than four
  // assertions, which is the distinction M4's review settled.
  for (const name of [
    "Dismiss Rip finished",
    "Dismiss Retried title 4",
    "Dismiss Bay 3 offline",
    "Dismiss Order saved",
  ]) {
    expectAgentDrivable(canvas, { name, role: "button" })
  }

  await expectNoAxeViolations(canvasElement)
})
