import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./TimecodeInput.stories.tsx"

const { AllStates, Interactive } = composeStories(stories)

const mountInteractive = async () => {
  const mounted = await mountStory(Interactive)

  return {
    ...mounted,
    end: expectAgentDrivable(mounted.canvas, {
      name: "Play section end",
      role: "textbox",
    }),
    single: expectAgentDrivable(mounted.canvas, {
      name: "Start at",
      role: "textbox",
    }),
    start: expectAgentDrivable(mounted.canvas, {
      name: "Play section start",
      role: "textbox",
    }),
  }
}

test("a typed position is echoed in full, and does NOT commit until Enter", async () => {
  const { canvas, single } = await mountInteractive()

  await userEvent.click(single)

  await userEvent.type(single, "90")

  // The whole anti-silent-guess mechanism: `90` is ninety seconds,
  // and the field says so in a live region before anything is
  // stored.
  await waitFor(() => {
    expect(
      canvas.getByText("00:01:30.000"),
    ).toBeInTheDocument()
  })

  await expect(
    canvas.getByText("Chosen: —"),
  ).toBeInTheDocument()

  await userEvent.keyboard("{Enter}")

  await waitFor(() => {
    expect(
      canvas.getByText("Chosen: 00:01:30.000"),
    ).toBeInTheDocument()
  })

  // Committed in the one canonical spelling, so a re-read of the
  // field parses to the number that produced it.
  await expect(single).toHaveValue("00:01:30.000")
})

test("an overflowed field is refused by name, and the typed text survives", async () => {
  const { canvas, canvasElement, single } =
    await mountInteractive()

  await userEvent.click(single)

  await userEvent.type(single, "1:90")

  await waitFor(() => {
    expect(
      canvas.getByText(/A minute has 60 seconds/),
    ).toBeInTheDocument()
  })

  await expect(single).toHaveAttribute(
    "aria-invalid",
    "true",
  )

  await userEvent.keyboard("{Enter}")

  // Nothing committed, and the text was neither cleared nor carried
  // to a position the person did not ask for.
  await expect(
    canvas.getByText("Chosen: —"),
  ).toBeInTheDocument()

  await expect(single).toHaveValue("1:90")

  await expectNoAxeViolations(canvasElement)
})

test("Escape puts the last committed value back", async () => {
  const { single } = await mountInteractive()

  await userEvent.click(single)

  await userEvent.type(single, "90{Enter}")

  await expect(single).toHaveValue("00:01:30.000")

  await userEvent.clear(single)

  await userEvent.type(single, "7")

  await userEvent.keyboard("{Escape}")

  await expect(single).toHaveValue("00:01:30.000")
})

test("the arrows step by stepMs, and Shift multiplies that by ten", async () => {
  const { canvas, single } = await mountInteractive()

  await userEvent.click(single)

  await userEvent.keyboard("{ArrowUp}")

  // A step commits, because it is a whole gesture on a value rather
  // than a draft the echo is reporting on.
  await waitFor(() => {
    expect(
      canvas.getByText("Chosen: 00:00:01.000"),
    ).toBeInTheDocument()
  })

  await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}")

  await expect(single).toHaveValue("00:00:11.000")

  await userEvent.keyboard("{ArrowDown}")

  await expect(single).toHaveValue("00:00:10.000")

  // The floor is the start of the media, not a negative position.
  await userEvent.keyboard(
    "{Shift>}{ArrowDown}{ArrowDown}{/Shift}",
  )

  await expect(single).toHaveValue("00:00:00.000")
})

test("a position past the end of the media says so, then commits clamped", async () => {
  const { canvas, single } = await mountInteractive()

  await userEvent.click(single)

  await userEvent.type(single, "1:00:00")

  await waitFor(() => {
    expect(
      canvas.getByText(/commits as 00:45:12\.000/),
    ).toBeInTheDocument()
  })

  await userEvent.keyboard("{Enter}")

  await expect(single).toHaveValue("00:45:12.000")
})

test("an inverted section swaps, rather than throwing away the boundary just typed", async () => {
  const { canvas, canvasElement, end } =
    await mountInteractive()

  await userEvent.click(end)

  // The seeded start is 00:05:00.000, so this end sits before it.
  await userEvent.type(end, "1:00{Enter}")

  await waitFor(() => {
    expect(
      canvas.getByText(
        "Chosen: 00:01:00.000 to 00:05:00.000",
      ),
    ).toBeInTheDocument()
  })

  await expectNoAxeViolations(canvasElement)
})

test("a zero-length section is refused by name, because it plays nothing", async () => {
  const { canvas, canvasElement, end } =
    await mountInteractive()

  await userEvent.click(end)

  await userEvent.type(end, "5:00{Enter}")

  await waitFor(() => {
    expect(
      canvas.getByText(/A section needs a length/),
    ).toBeInTheDocument()
  })

  await expect(end).toHaveAttribute("aria-invalid", "true")

  // The start is untouched and the end is still open — nothing was
  // committed, and the text is still what was typed.
  await expect(
    canvas.getByText("Chosen: 00:05:00.000 to the end"),
  ).toBeInTheDocument()

  await expect(end).toHaveValue("5:00")

  await expectNoAxeViolations(canvasElement)
})

test("both ends are independently optional, and clearing one leaves the other alone", async () => {
  const { canvas, end, start } = await mountInteractive()

  await userEvent.click(end)

  await userEvent.type(end, "10:00{Enter}")

  await waitFor(() => {
    expect(
      canvas.getByText(
        "Chosen: 00:05:00.000 to 00:10:00.000",
      ),
    ).toBeInTheDocument()
  })

  await userEvent.clear(start)

  // Tab commits by blurring, which is the other half of "a keystroke
  // never commits".
  await userEvent.tab()

  await waitFor(() => {
    expect(
      canvas.getByText(
        "Chosen: the beginning to 00:10:00.000",
      ),
    ).toBeInTheDocument()
  })
})

test("the four states of a section all render as values, not as half-finished input", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  expectAgentDrivable(canvas, {
    name: "From here on start",
    role: "textbox",
  })

  expectAgentDrivable(canvas, {
    name: "Up to here end",
    role: "textbox",
  })

  // "empty" and "no window" are the same reading of the same
  // absence, one in each mode — which is the point: an unset section
  // is not a broken one.
  await expect(
    canvas.getAllByText("Chosen: —"),
  ).toHaveLength(2)

  await expect(
    canvas.getByText("Chosen: 00:05:00.000 to the end"),
  ).toBeInTheDocument()

  await expect(
    canvas.getByText(
      "Chosen: the beginning to 00:05:00.000",
    ),
  ).toBeInTheDocument()

  await expect(
    canvas.getByText(
      "Chosen: 00:05:00.000 to 00:15:00.000",
    ),
  ).toBeInTheDocument()

  await expectNoAxeViolations(canvasElement)
})
