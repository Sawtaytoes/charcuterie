import type { AgentTarget } from "../../../ui/src/testing/index.ts"
import type {
  Canvas,
  RequirementsWorld,
} from "../support/RequirementsWorld.ts"

export type Role = AgentTarget["role"]

/**
 * The whole page, as a person sees it. A dialog, a tooltip, or a
 * listbox portals out of the story's canvas to `document.body`, so a
 * query scoped to the canvas would not find the panel a person is
 * looking at. Throws a plain instruction rather than a null
 * dereference when a scenario forgot its Given.
 */
export const scopeOf = (
  world: RequirementsWorld,
): Canvas => {
  if (!world.page) {
    throw new Error(
      'No story is open. Start the scenario with a Given that opens one, such as "Given the Button playground is open".',
    )
  }

  return world.page
}

/**
 * The one query every step uses: role and accessible name, exactly
 * what a person, a screen reader, and an agent use to find a control.
 */
export const byRole = (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => scopeOf(world).getByRole(role, { name })
