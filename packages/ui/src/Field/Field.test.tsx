import { composeStories } from "@storybook/react"
import { expect } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Field.stories.tsx"

/**
 * The wiring a consumer relies on: ids, `htmlFor`, and where rest
 * props land. What a person hears, the name, description, required,
 * and invalid state, is `REQ-UI-016` to `REQ-UI-027` in
 * `packages/docs/requirements/field.feature`.
 */
const {
  AdoptsChildId,
  AdoptsOverlayTriggerId,
  Playground,
  ForwardsRestProps,
} = composeStories(stories)

test("a control's own id is adopted, not overwritten", async () => {
  const { canvas, canvasElement } =
    await mountStory(AdoptsChildId)

  // The child was written `<input id="rename-pattern" />`. The Field
  // must keep that id — overwriting it with a minted `-control` id is
  // what broke the outside-in references the id exists for — and the
  // `<label htmlFor>` must agree, so the control is still findable by
  // its label's text.
  const control = expectAgentDrivable(canvas, {
    name: "Rename pattern",
    role: "textbox",
  })

  await expect(control).toHaveAttribute(
    "id",
    "rename-pattern",
  )

  await expectNoAxeViolations(canvasElement)
})

test("an overlay trigger keeps the id the label points at", async () => {
  const { canvas, canvasElement } = await mountStory(
    AdoptsOverlayTriggerId,
  )

  // The regression this exists for: `useAnchoredOverlay` minted its own
  // trigger id and cloned it over the Field's, so the `<label htmlFor>`
  // named an element that was not in the document. Nothing threw and
  // nothing looked wrong — the only way to see it was to go looking for
  // the id.
  const label = canvasElement.querySelector("label")

  await expect(label).not.toBeNull()

  const htmlFor = label?.getAttribute("for")

  await expect(htmlFor).toBeTruthy()

  // The assertion that fails on the old behaviour: the id the label
  // names must actually exist, and must BE the trigger.
  const target = canvasElement.ownerDocument.getElementById(
    htmlFor as string,
  )

  await expect(target).not.toBeNull()
  await expect(target?.tagName).toBe("BUTTON")

  // And the round trip callers actually rely on: findable by the
  // label's own text.
  expectAgentDrivable(canvas, {
    name: /^Language: /,
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

/**
 * Pins a string coupling that lives in two files.
 *
 * `htmlFor` names every **labelable** element — `<input>`,
 * `<textarea>`, `<select>`, `<button>` — and names a
 * `div[role="textbox"]` not at all. So a `contenteditable` control
 * inside a `Field` points `aria-labelledby` at this id instead, and
 * `MarkdownEditorCodeMirror` builds it as `` `${id}-label` ``.
 *
 * Renaming the format here would leave that control with no
 * accessible name — silently, because the markup still looks right
 * and the label still renders. Only axe would notice, and only in
 * the other component's suite.
 */
test("the label carries a derivable id for non-labelable controls", async () => {
  const { canvas } = await mountStory(Playground)

  const control = expectAgentDrivable(canvas, {
    name: "Output directory",
    role: "textbox",
  })

  const controlId = control.getAttribute("id")

  await expect(controlId).not.toBeNull()

  const label = document.getElementById(
    `${controlId}-label`,
  )

  await expect(label).not.toBeNull()

  await expect(label).toHaveAttribute("for", controlId)
})

/**
 * The gap this closes, stated as the two things that were impossible.
 *
 * `FieldProps` and `FieldGroupProps` were closed types, so the only
 * prop that reached an element was `className` — which is the escape
 * hatch the "configured by props, not a borrowed class" rule exists to
 * close. A component that accepts only `className` forces the very
 * thing the rule forbids, and queuepilot paid for it twice: a
 * `FieldGroup` that had to give up the `id` its screenshot suite
 * drives by, and a box beside it that stayed a hand-rolled
 * `<fieldset>` because it needed `hidden`.
 *
 * `Field` clones its child, so its props are the **control's**. The
 * assertion is which element they landed on, because that is the half
 * that could have gone silently wrong: routing them to the wrapper
 * would have moved every consumer's `id` off the control the
 * `<label htmlFor>` points at.
 */
test("a rest prop reaches the control, not the box around it", async () => {
  const { canvas, canvasElement } = await mountStory(
    ForwardsRestProps,
  )

  const control = expectAgentDrivable(canvas, {
    name: "Scratch path",
    role: "textbox",
  })

  await expect(control).toHaveAttribute(
    "name",
    "scratchPath",
  )

  await expect(control).toHaveAttribute(
    "placeholder",
    "/mnt/scratch",
  )

  // …and the `<div>` did not take them. `Field`'s own `className` is
  // the one prop that stays on the box, so the two destinations have
  // to be distinguishable in the DOM rather than merely documented.
  await expect(
    canvasElement.querySelector("[name='scratchPath']"),
  ).toBe(control)

  await expectNoAxeViolations(canvasElement)
})

/**
 * The other reading of the same rule. `FieldGroup` renders its
 * children as-is, so the only element it owns is the `<fieldset>` and
 * a prop has nowhere else to go — including `disabled`, which on this
 * element is not decoration: the platform disables every control
 * inside it.
 *
 * This is the case queuepilot's `#dyn-lineup` needed and could not
 * have: an `id` on the group's own element.
 */
test("a rest prop reaches the fieldset", async () => {
  const { canvas } = await mountStory(ForwardsRestProps)

  const group = expectAgentDrivable(canvas, {
    name: "Playback",
    role: "group",
  })

  await expect(group).toHaveAttribute(
    "id",
    "playback-lineup",
  )

  await expect(group.tagName).toBe("FIELDSET")

  // The description and the disabled controls inside are
  // `REQ-UI-027` in `packages/docs/requirements/field.feature`.
})
