import { composeStories } from "@storybook/react"
import { expect, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Field.stories.tsx"

const { AllStates, AllVariants, Default, Group, Nested } =
  composeStories(stories)

test("the label names the control it points at", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  // The whole point of the component in one query: the control is
  // findable by the *label's* text, which is only true if `htmlFor`
  // and the control's `id` agree. mux-magic's `FieldLabel` does
  // render a `htmlFor` — 8 of its 16 call sites just never render
  // that id on anything, so the pair agrees in one file and not in
  // the other, and this query gets nothing.
  const control = expectAgentDrivable(canvas, {
    name: "Output directory",
    role: "textbox",
  })

  await expect(control).toHaveAttribute("id")

  await expectNoAxeViolations(canvasElement)
})

test("a description is announced with the control", async () => {
  const { canvas } = await mountStory(Default)

  const control = expectAgentDrivable(canvas, {
    name: "Output directory",
    role: "textbox",
  })

  const describedBy = control.getAttribute(
    "aria-describedby",
  )

  await expect(describedBy).not.toBeNull()

  await expect(
    document.getElementById(describedBy ?? ""),
  ).toHaveTextContent("Where finished rips are moved.")
})

test("the slot takes a Select as readily as an input", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllVariants)

  // A native `<select>` reports `role="combobox"`, and it is named
  // by the same cloned `id`. The slot does not know what it is
  // holding, which is the contract.
  expectAgentDrivable(canvas, {
    name: "Rip profile",
    role: "combobox",
  })

  await expectNoAxeViolations(canvasElement)
})

test("`required` is spelled twice, on purpose", async () => {
  const { canvas } = await mountStory(AllVariants)

  const control = expectAgentDrivable(canvas, {
    name: "Disc label",
    role: "textbox",
  })

  // `required` is the constraint the browser validates;
  // `aria-required` is the one it announces on a control the browser
  // does not validate. They are not redundant, and a component that
  // sets only the first is silent on a composite widget.
  await expect(control).toBeRequired()

  await expect(control).toHaveAttribute(
    "aria-required",
    "true",
  )
})

test("an error is the only source of invalidity", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  // Valid: nothing claims otherwise.
  await expect(
    expectAgentDrivable(canvas, {
      name: "Bay name",
      role: "textbox",
    }),
  ).not.toHaveAttribute("aria-invalid")

  const invalid = expectAgentDrivable(canvas, {
    name: "Scratch path",
    role: "textbox",
  })

  await expect(invalid).toHaveAttribute(
    "aria-invalid",
    "true",
  )

  await expect(
    document.getElementById(
      invalid.getAttribute("aria-describedby") ?? "",
    ),
  ).toHaveTextContent("That path is not writable.")

  await expectNoAxeViolations(canvasElement)
})

/**
 * The nesting defect, and the reason `SlotProps` exists.
 *
 * `Field` clones onto its one child. With a `Tooltip` in between, the
 * child is the **`Tooltip` element**, so `id`, `aria-describedby`,
 * `aria-invalid` and `required` were handed to a component that
 * declares none of them. `cloneElement` does not care, TypeScript
 * never sees it, and the render is pixel-identical — the only
 * symptom is a `<label htmlFor>` pointing at an id that is nowhere in
 * the document, which is exactly the unnamed textbox this component
 * exists to prevent.
 *
 * The query below is the proof: finding the control **by the label's
 * text** is only possible if the `id` reached the `<input>` at the
 * bottom of the chain.
 */
test("a slot forwards what an outer slot gave it", async () => {
  const { canvas, canvasElement } = await mountStory(Nested)

  const control = expectAgentDrivable(canvas, {
    name: "Rename pattern",
    role: "textbox",
  })

  await expect(control).toBeRequired()

  await expect(control).toHaveAttribute(
    "aria-required",
    "true",
  )

  await expect(
    document.getElementById(
      control.getAttribute("aria-describedby") ?? "",
    ),
  ).toHaveTextContent("Applied to every title.")

  await expectNoAxeViolations(canvasElement)
})

/**
 * The same drop in reverse — and the half that nearly shipped
 * untested.
 *
 * The first draft of the test above closed with an `aria-invalid`
 * assertion on the inner control of the *other* cell and called that
 * the reverse case. It is not: `Field` writes `aria-invalid` itself,
 * from its own `error` prop, so that assertion holds whether or not a
 * single thing arrived from the `Tooltip` above it. Reverting
 * `Field`'s half of the fix left the whole file green.
 *
 * What a `Tooltip` hands down is not one attribute, it is a working
 * component: `getReferenceProps()`'s hover, focus and dismiss
 * handlers, `refs.setReference`, and an `aria-describedby` naming the
 * tip. All of it lands on the `Field` **element**, and `Field` has to
 * pass every bit of it through to the control at the bottom or the
 * tip is a floating node with no trigger, no anchor and nobody
 * pointed at it — mux-magic's `FieldTooltip` defect 1, reproduced by
 * a library that shipped the fix for it.
 *
 * So the assertion is the tip *opening from the inner control's own
 * focus* and then being named by it, which needs the handlers, the
 * ref and the attribute to have all three arrived.
 */
test("a slot forwards what an outer slot gave it, in the other order", async () => {
  const { body, canvas } = await mountStory(Nested)

  const control = expectAgentDrivable(canvas, {
    name: "Archive path",
    role: "textbox",
  })

  // Focus on the control, not on the `Field` — `Field` renders a
  // `<div>`, which cannot take focus, so a tip that opens here can
  // only have been wired to the `<input>`.
  control.focus()

  // The tip portals to the body now; the `aria-describedby` link still
  // resolves across the boundary, asserted below.
  await waitFor(() => {
    expect(body.getByRole("tooltip")).toHaveTextContent(
      "Where finished rips are moved.",
    )
  })

  const [tipId, errorId] = (
    control.getAttribute("aria-describedby") ?? ""
  ).split(" ")

  // Outer first, which here is the tip: the merge order is
  // structural — whoever wrapped whom — and the author of the nesting
  // is the one who chose it.
  await expect(
    document.getElementById(tipId ?? ""),
  ).toHaveTextContent("Where finished rips are moved.")

  await expect(
    document.getElementById(errorId ?? ""),
  ).toHaveTextContent("Not writable.")
})

/**
 * `aria-describedby` is the one slot prop that is a **list**, so the
 * merge is not last-write-wins. A `Field` names its description and
 * its error; a `Tooltip` names its tip. A plain spread keeps one and
 * loses the other — the same silent drop by a shorter route.
 *
 * Outer first: the field's own explanation before the supplementary
 * tip.
 */
test("a tip is described alongside the field's own text, not instead of it", async () => {
  const { body, canvas } = await mountStory(Nested)

  const control = expectAgentDrivable(canvas, {
    name: "Rename pattern",
    role: "textbox",
  })

  control.focus()

  // `useFocus` is what opens it — the line mux-magic's hand-rolled
  // tip is missing, and the reason this is testable without a
  // pointer at all.
  await waitFor(() => {
    expect(body.getByRole("tooltip")).toHaveTextContent(
      "A JavaScript regular expression.",
    )
  })

  const [descriptionId, tipId] = (
    control.getAttribute("aria-describedby") ?? ""
  ).split(" ")

  await expect(
    document.getElementById(descriptionId ?? ""),
  ).toHaveTextContent("Applied to every title.")

  await expect(
    document.getElementById(tipId ?? ""),
  ).toHaveTextContent("A JavaScript regular expression.")
})

/**
 * Order inside `aria-describedby` is behaviour, not formatting. A
 * screen reader reads the list in sequence, and "absolute paths only
 * — that path is not writable" is a different sentence from its
 * reverse. Nothing but the order of one array enforces it.
 */
test("description is described before error", async () => {
  const { canvas } = await mountStory(AllStates)

  const control = expectAgentDrivable(canvas, {
    name: "Archive path",
    role: "textbox",
  })

  const [descriptionId, errorId] = (
    control.getAttribute("aria-describedby") ?? ""
  ).split(" ")

  await expect(
    document.getElementById(descriptionId ?? ""),
  ).toHaveTextContent("Absolute paths only.")

  await expect(
    document.getElementById(errorId ?? ""),
  ).toHaveTextContent("That path is not writable.")
})

/**
 * `Field` cannot go here and the failure is quiet: an `id` names one
 * element and a `<label htmlFor>` points at one, so a label over three
 * inputs names one of them and leaves the other two anonymous. Six of
 * mux-magic's sixteen field components are in exactly that state.
 *
 * `<fieldset>` + `<legend>` is the platform's answer, and it is the
 * one place in this library where the element is right — the content
 * really is a form-control grouping.
 */
test("a group is named by its legend, and its controls keep their own names", async () => {
  const { canvas, canvasElement } = await mountStory(Group)

  const group = expectAgentDrivable(canvas, {
    // "Rename pattern", not "Rename pattern *" — the asterisk is
    // `aria-hidden`, so it is decoration and stays out of the name.
    name: "Rename pattern",
    role: "group",
  })

  // Every control inside is still individually findable. A group
  // that swallows its members' names is the same defect one level up.
  for (const name of ["Pattern", "Flags", "Sample"]) {
    expectAgentDrivable(canvas, { name, role: "textbox" })
  }

  await expect(
    document.getElementById(
      group.getAttribute("aria-describedby") ?? "",
    ),
  ).toHaveTextContent("Applied to every title in the disc.")

  await expectNoAxeViolations(canvasElement)
})

/**
 * `aria-invalid` has no group form — it belongs on the control that
 * is actually invalid, and a `FieldGroup` does not know which one
 * that is. So the error is *described*, not *asserted*, and the
 * alternative — cloning `aria-invalid` onto every child — would mark
 * the valid ones invalid.
 */
test("a group describes its error rather than asserting invalidity", async () => {
  const { canvas } = await mountStory(Group)

  const group = expectAgentDrivable(canvas, {
    name: "Chapter split",
    role: "group",
  })

  await expect(group).not.toHaveAttribute("aria-invalid")

  await expect(
    document.getElementById(
      group.getAttribute("aria-describedby") ?? "",
    ),
  ).toHaveTextContent(
    "A pattern needs at least one capture group.",
  )
})
