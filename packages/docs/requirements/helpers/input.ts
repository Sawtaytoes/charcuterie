import { userEvent } from "storybook/test"

import type { RequirementsWorld } from "../support/RequirementsWorld.ts"
import { byRole, type Role, scopeOf } from "./queries.ts"

/**
 * The element a pointer at the center of `element` would land on.
 * `userEvent.click` dispatches straight to the element it is given,
 * so it would "click" a button that a scrim or another panel covers.
 * A person cannot, so a click step refuses to.
 */
export const expectNotCovered = (element: Element) => {
  const { height, left, top, width } =
    element.getBoundingClientRect()
  const hit = document.elementFromPoint(
    left + width / 2,
    top + height / 2,
  )

  if (hit === null || !element.contains(hit)) {
    throw new Error(
      `Something covers this control, so a person cannot click it. The pointer at its center lands on ${
        hit === null
          ? "nothing"
          : `<${hit.tagName.toLowerCase()}${hit.className ? ` class="${String(hit.className)}"` : ""}>`
      }.`,
    )
  }
}

/** A click on the named control, which must not be covered. */
export const click = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  const element = byRole(world, role, name)

  expectNotCovered(element)
  await userEvent.click(element)
}

/**
 * A click on the page itself, outside every panel: what a person does
 * to dismiss a dialog by its backdrop.
 */
export const clickOutside = async (
  world: RequirementsWorld,
) => {
  scopeOf(world)
  await userEvent.click(document.body)
}

/**
 * The keys a scenario names, in the words a person uses. `Tab` moves
 * focus the way the browser does; every other key goes to whatever
 * has focus.
 */
const keyboardInput: Record<string, string> = {
  Enter: "{Enter}",
  Escape: "{Escape}",
  Space: " ",
}

export const press = async (
  _world: RequirementsWorld,
  key: string,
) => {
  if (key === "Tab") {
    await userEvent.tab()

    return
  }

  const input = keyboardInput[key]

  if (!input) {
    throw new Error(
      `"${key}" is not a key the requirement helpers know. Add it to keyboardInput in helpers/input.ts.`,
    )
  }

  await userEvent.keyboard(input)
}

/** `{` and `[` start a key name in user-event; doubled, each is itself. */
const literally = (text: string) =>
  text.replace(/[{[]/g, (bracket) => bracket + bracket)

/** Text typed into whatever has focus. */
export const typeText = async (
  _world: RequirementsWorld,
  text: string,
) => {
  await userEvent.keyboard(literally(text))
}

/** Select everything in the named field, and type over it. */
export const replaceText = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
  text: string,
) => {
  const element = byRole(world, role, name)

  await userEvent.clear(element)
  await userEvent.type(element, literally(text))
}

/**
 * Keyboard focus moved to the named control without a pointer, so no
 * hover handler runs. This is what a screen reader's "next field"
 * does.
 */
export const moveFocus = (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  byRole(world, role, name).focus()
}
