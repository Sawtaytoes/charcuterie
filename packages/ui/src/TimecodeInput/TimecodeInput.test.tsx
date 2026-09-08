import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./TimecodeInput.stories.tsx"

const { AllStates, Interactive, Responsive } =
  composeStories(stories)

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
    expect(canvas.getByText("00:01:30")).toBeInTheDocument()
  })

  await expect(
    canvas.getByText("Chosen: —"),
  ).toBeInTheDocument()

  await userEvent.keyboard("{Enter}")

  await waitFor(() => {
    expect(
      canvas.getByText("Chosen: 00:01:30"),
    ).toBeInTheDocument()
  })

  // Committed in the one canonical spelling, so a re-read of the
  // field parses to the number that produced it.
  await expect(single).toHaveValue("00:01:30")
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

  await expect(single).toHaveValue("00:01:30")

  await userEvent.clear(single)

  await userEvent.type(single, "7")

  await userEvent.keyboard("{Escape}")

  await expect(single).toHaveValue("00:01:30")
})

test("the arrows step by stepMs, and Shift multiplies that by ten", async () => {
  const { canvas, single } = await mountInteractive()

  await userEvent.click(single)

  await userEvent.keyboard("{ArrowUp}")

  // A step commits, because it is a whole gesture on a value rather
  // than a draft the echo is reporting on.
  await waitFor(() => {
    expect(
      canvas.getByText("Chosen: 00:00:01"),
    ).toBeInTheDocument()
  })

  await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}")

  await expect(single).toHaveValue("00:00:11")

  await userEvent.keyboard("{ArrowDown}")

  await expect(single).toHaveValue("00:00:10")

  // The floor is the start of the media, not a negative position.
  await userEvent.keyboard(
    "{Shift>}{ArrowDown}{ArrowDown}{/Shift}",
  )

  await expect(single).toHaveValue("00:00:00")
})

test("a position past the end of the media says so, then commits clamped", async () => {
  const { canvas, single } = await mountInteractive()

  await userEvent.click(single)

  await userEvent.type(single, "1:00:00")

  await waitFor(() => {
    expect(
      canvas.getByText(/commits as 00:45:12/),
    ).toBeInTheDocument()
  })

  await userEvent.keyboard("{Enter}")

  await expect(single).toHaveValue("00:45:12")
})

test("an inverted section swaps, rather than throwing away the boundary just typed", async () => {
  const { canvas, canvasElement, end } =
    await mountInteractive()

  await userEvent.click(end)

  // The seeded start is 00:05:00, so this end sits before it.
  await userEvent.type(end, "1:00{Enter}")

  await waitFor(() => {
    expect(
      canvas.getByText("Chosen: 00:01:00 to 00:05:00"),
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
    canvas.getByText("Chosen: 00:05:00 to the end"),
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
      canvas.getByText("Chosen: 00:05:00 to 00:10:00"),
    ).toBeInTheDocument()
  })

  await userEvent.clear(start)

  // Tab commits by blurring, which is the other half of "a keystroke
  // never commits".
  await userEvent.tab()

  await waitFor(() => {
    expect(
      canvas.getByText("Chosen: the beginning to 00:10:00"),
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
    canvas.getByText("Chosen: 00:05:00 to the end"),
  ).toBeInTheDocument()

  await expect(
    canvas.getByText("Chosen: the beginning to 00:05:00"),
  ).toBeInTheDocument()

  await expect(
    canvas.getByText("Chosen: 00:05:00 to 00:15:00"),
  ).toBeInTheDocument()

  await expectNoAxeViolations(canvasElement)
})

test("the echo is a reading of the focused field, so it leaves with the focus", async () => {
  const { canvas, single } = await mountInteractive()

  await userEvent.click(single)

  await userEvent.type(single, "90")

  await waitFor(() => {
    expect(canvas.getByText("00:01:30")).toBeInTheDocument()
  })

  // Tab commits and takes the focus away. What is left underneath an
  // idle field would be an unlabelled timecode, which reads as a
  // stray value rather than as a report on the field above it.
  await userEvent.tab()

  await waitFor(() => {
    expect(
      canvas.queryByText("00:01:30"),
    ).not.toBeInTheDocument()
  })

  // The value itself is untouched by any of that: the line is a
  // reading, not the state.
  await expect(single).toHaveValue("00:01:30")

  await expect(
    canvas.getByText("Chosen: 00:01:30"),
  ).toBeInTheDocument()
})

test("an unparsed text keeps its refusal after the focus leaves, because the control is still invalid", async () => {
  const { canvas, canvasElement, single } =
    await mountInteractive()

  await userEvent.click(single)

  await userEvent.type(single, "1:90")

  await userEvent.tab()

  // `aria-invalid` survives the blur, so the sentence that says why
  // has to survive it too. An invalid control with no message is
  // worse than the stray line the test above removes.
  await expect(single).toHaveAttribute(
    "aria-invalid",
    "true",
  )

  await expect(
    canvas.getByText(/A minute has 60 seconds/),
  ).toBeInTheDocument()

  await expect(single).toHaveValue("1:90")

  await expectNoAxeViolations(canvasElement)
})

test("a zero-length refusal is written at the commit, so it survives the blur that wrote it", async () => {
  const { canvas, canvasElement, end } =
    await mountInteractive()

  await userEvent.click(end)

  // The seeded start is 00:05:00, so this end has no length. Blur is
  // the commit here, which is the case that would have hidden the
  // complaint the instant it was made.
  await userEvent.type(end, "5:00")

  await userEvent.tab()

  await waitFor(() => {
    expect(
      canvas.getByText(/A section needs a length/),
    ).toBeInTheDocument()
  })

  await expect(end).toHaveAttribute("aria-invalid", "true")

  await expectNoAxeViolations(canvasElement)
})

/**
 * The container query, asserted rather than assumed — and the
 * accessible name held identical across the two layouts it draws.
 *
 * The window never moves in this test. Each panel of the board is a
 * fixed inline size around `--cq-sm`, which is the only honest way
 * to exercise a query about the component's own box.
 */
test("the Narrow View stacks the two fields, and neither layout changes a control's name", async () => {
  const { canvas, canvasElement } =
    await mountStory(Responsive)

  const narrowStart = expectAgentDrivable(canvas, {
    name: "Section 15rem start",
    role: "textbox",
  })

  const wideStart = expectAgentDrivable(canvas, {
    name: "Section 34rem start",
    role: "textbox",
  })

  expectAgentDrivable(canvas, {
    name: "Section 15rem end",
    role: "textbox",
  })

  expectAgentDrivable(canvas, {
    name: "Section 34rem end",
    role: "textbox",
  })

  const narrowRow = narrowStart.parentElement
    ?.parentElement as HTMLElement

  const wideRow = wideStart.parentElement
    ?.parentElement as HTMLElement

  await expect(
    globalThis.getComputedStyle(narrowRow).flexDirection,
  ).toBe("column")

  await expect(
    globalThis.getComputedStyle(wideRow).flexDirection,
  ).toBe("row")

  const [
    narrowStartCaption,
    narrowJoiner,
    narrowEndCaption,
  ] = Array.from(
    narrowRow.querySelectorAll<HTMLElement>(
      ":scope > * > span, :scope > span",
    ),
  )

  const [wideStartCaption, wideJoiner, wideEndCaption] =
    Array.from(
      wideRow.querySelectorAll<HTMLElement>(
        ":scope > * > span, :scope > span",
      ),
    )

  // Narrow: two captions, no joining word.
  await expect(narrowStartCaption).toHaveTextContent(
    "Start",
  )

  await expect(narrowEndCaption).toHaveTextContent("End")

  await expect(
    globalThis.getComputedStyle(
      narrowStartCaption as HTMLElement,
    ).display,
  ).not.toBe("none")

  await expect(
    globalThis.getComputedStyle(narrowJoiner as HTMLElement)
      .display,
  ).toBe("none")

  // Wide: the joining word, no captions.
  await expect(wideJoiner).toHaveTextContent("to")

  await expect(
    globalThis.getComputedStyle(wideJoiner as HTMLElement)
      .display,
  ).not.toBe("none")

  await expect(
    globalThis.getComputedStyle(
      wideStartCaption as HTMLElement,
    ).display,
  ).toBe("none")

  await expect(
    globalThis.getComputedStyle(
      wideEndCaption as HTMLElement,
    ).display,
  ).toBe("none")

  // Every one of them is for the eye. A real `<label>` would name the
  // start control a second time and fight the `id` a `Field` clones
  // onto it, so nothing here is named "Start" or "End".
  for (const caption of [
    narrowStartCaption,
    narrowJoiner,
    narrowEndCaption,
    wideStartCaption,
    wideJoiner,
    wideEndCaption,
  ]) {
    await expect(caption).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  }

  await expect(
    canvas.queryAllByRole("textbox", {
      name: /^(Start|End)$/,
    }),
  ).toHaveLength(0)

  await expectNoAxeViolations(canvasElement)
})

test("milliseconds are optional to read as well as to type", async () => {
  const { canvas, single } = await mountInteractive()

  await userEvent.click(single)

  // No fraction typed, so no fraction written back. You write 3, not
  // 3.000.
  await userEvent.type(single, "10:00{Enter}")

  await expect(single).toHaveValue("00:10:00")

  await waitFor(() => {
    expect(
      canvas.getByText("Chosen: 00:10:00"),
    ).toBeInTheDocument()
  })

  await userEvent.clear(single)

  // A real fraction still prints in full, padded on the right.
  await userEvent.type(single, "10:00.25{Enter}")

  await expect(single).toHaveValue("00:10:00.250")
})
