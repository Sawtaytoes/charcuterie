import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Checkbox.stories.tsx"

const {
  AllStates,
  Default,
  Interactive,
  WithDescriptions,
  WithValues,
} = composeStories(stories)

test("it is a checkbox a screen reader can name", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const checkbox = expectAgentDrivable(canvas, {
    name: "Delete originals after import",
    role: "checkbox",
  })

  await expect(checkbox).not.toBeChecked()

  await expectNoAxeViolations(canvasElement)
})

test("a press toggles it, and the label is part of the target", async () => {
  const { canvas } = await mountStory(Interactive)

  const checkbox = expectAgentDrivable(canvas, {
    name: "Delete originals after import",
    role: "checkbox",
  })

  // The label wraps the control, so a click on the text is a click
  // on the box — which is the association `<label htmlFor>` gets
  // wrong half the time in the fleet and this cannot.
  await userEvent.click(checkbox)

  await waitFor(() => {
    expect(checkbox).toBeChecked()
  })

  await userEvent.click(checkbox)

  await waitFor(() => {
    expect(checkbox).not.toBeChecked()
  })
})

test("a disabled box cannot be toggled", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const disabled = expectAgentDrivable(canvas, {
    name: "Disabled",
    role: "checkbox",
  })

  await expect(disabled).toBeDisabled()

  await expect(disabled).not.toBeChecked()

  await userEvent.click(disabled)

  await expect(disabled).not.toBeChecked()

  await expectNoAxeViolations(canvasElement)
})

test("isChecked decides the first render", async () => {
  const { canvas } = await mountStory(AllStates)

  await expect(
    expectAgentDrivable(canvas, {
      name: "Checked",
      role: "checkbox",
    }),
  ).toBeChecked()
})

test("a read-only box is announced and cannot be toggled", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const readOnly = expectAgentDrivable(canvas, {
    name: "Read-only",
    role: "checkbox",
  })

  // Full contrast, not `disabled` — a read-only value stays readable,
  // and it is focusable so a screen reader reaches it. The state is
  // carried by `aria-readonly`, not by removing it from the tree.
  await expect(readOnly).toHaveAttribute(
    "aria-readonly",
    "true",
  )

  await expect(readOnly).not.toBeDisabled()

  await expect(readOnly).not.toBeChecked()

  await userEvent.click(readOnly)

  // The pointer block held — the box did not flip.
  await expect(readOnly).not.toBeChecked()

  await expectNoAxeViolations(canvasElement)
})

test("value names the member, and a group reads back the ticked ones", async () => {
  const { canvas, canvasElement } =
    await mountStory(WithValues)

  // The prop is the `<input>`'s `value` and nothing else — it must not
  // touch the checked state, which `isChecked` still owns alone.
  await expect(
    expectAgentDrivable(canvas, {
      name: "Anime",
      role: "checkbox",
    }),
  ).toHaveAttribute("value", "11")

  await expect(
    expectAgentDrivable(canvas, {
      name: "Movies",
      role: "checkbox",
    }),
  ).not.toBeChecked()

  // The read this prop exists for. Without a `value` every box here
  // answers the UA default `"on"` and the result is four copies of one
  // meaningless string, which is why a group could not use this
  // component at all before.
  const chosen = [
    ...canvasElement.querySelectorAll<HTMLInputElement>(
      "input[type=checkbox]",
    ),
  ]
    .filter((input) => input.checked)
    .map((input) => input.value)

  await expect(chosen).toEqual(["11", "15"])

  await expectNoAxeViolations(canvasElement)
})

test("a box with no value stays out of the way", async () => {
  const { canvas } = await mountStory(Default)

  // `value` is optional and a lone boolean should omit it. React drops
  // an `undefined` attribute entirely rather than writing an empty
  // string, so the DOM looks exactly as it did before the prop existed.
  await expect(
    expectAgentDrivable(canvas, {
      name: "Delete originals after import",
      role: "checkbox",
    }),
  ).not.toHaveAttribute("value")
})

/**
 * The description is *announced*, which is the only claim worth
 * asserting — a hint that renders and is not bound to the control is
 * decoration, and that is what an app-styled paragraph beside a
 * checkbox already was.
 *
 * The second half is the trap: the hint must be **outside** the
 * `<label>`. A `<label>`'s text content is the control's accessible
 * name, so a hint inside it would be read once inside the name and
 * once again as the description, and the name assertion below is what
 * catches that — it fails on "Delete originals after import The source
 * files are removed…".
 */
test("a description is announced with the box, and stays out of its name", async () => {
  const { canvas, canvasElement } = await mountStory(
    WithDescriptions,
  )

  const checkbox = expectAgentDrivable(canvas, {
    name: "Delete originals after import",
    role: "checkbox",
  })

  await expect(
    document.getElementById(
      checkbox.getAttribute("aria-describedby") ?? "",
    ),
  ).toHaveTextContent(
    "The source files are removed once every title has been written.",
  )

  // The hint is a sibling of the `<label>`, not a descendant of it.
  await expect(checkbox.closest("label")?.textContent).toBe(
    "Delete originals after import",
  )

  await expectNoAxeViolations(canvasElement)
})

/**
 * A group of described boxes inside a `FieldGroup` — the shape the
 * downstream editor wanted and could not write, because one hint out
 * of three had to be the app's own paragraph.
 *
 * Each box names its own hint and the group names the group's, so
 * three `aria-describedby` values point at three different nodes and
 * none of them collide.
 */
test("each box owns its own description, and the group owns the group's", async () => {
  const { canvas, canvasElement } = await mountStory(
    WithDescriptions,
  )

  const group = expectAgentDrivable(canvas, {
    name: "After a rip",
    role: "group",
  })

  await expect(
    document.getElementById(
      group.getAttribute("aria-describedby") ?? "",
    ),
  ).toHaveTextContent(
    "A group's own help sits under all of it.",
  )

  const describedIds = [
    "Keep chapter markers",
    "Verify the checksum",
  ].map((name) =>
    expectAgentDrivable(canvas, {
      name,
      role: "checkbox",
    }).getAttribute("aria-describedby"),
  )

  await expect(new Set(describedIds).size).toBe(2)

  await expect(
    document.getElementById(describedIds[0] ?? ""),
  ).toHaveTextContent(
    "Written beside the video, not into it.",
  )

  await expectNoAxeViolations(canvasElement)
})

test("a box with no description writes no aria-describedby", async () => {
  const { canvas } = await mountStory(Default)

  // The slot is opt-in. React drops an `undefined` attribute rather
  // than writing an empty string, so a box without a hint points at
  // nothing — an `aria-describedby` naming an id that is not in the
  // document is the defect `Field` was built to prevent, and it would
  // arrive here the moment the id were written unconditionally.
  await expect(
    expectAgentDrivable(canvas, {
      name: "Delete originals after import",
      role: "checkbox",
    }),
  ).not.toHaveAttribute("aria-describedby")
})
