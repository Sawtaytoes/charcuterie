import { userEvent } from "storybook/test"

import type { RequirementsWorld } from "../support/RequirementsWorld.ts"
import { byRole, type Role } from "./queries.ts"

/** A real pointer click, by coordinates, as a mouse user makes it. */
export const click = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  await userEvent.click(byRole(world, role, name))
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
