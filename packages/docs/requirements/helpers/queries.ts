import type { AgentTarget } from "../../../ui/src/testing/index.ts"
import type {
  Canvas,
  RequirementsWorld,
} from "../support/RequirementsWorld.ts"

export type Role = AgentTarget["role"]

/**
 * The story's canvas, or the whole page for a panel that portals out
 * of it. Throws a plain instruction rather than a null dereference
 * when a scenario forgot its Given.
 */
export const scopeOf = (
  world: RequirementsWorld,
  isPage = false,
): Canvas => {
  const scope = isPage ? world.page : world.canvas

  if (!scope) {
    throw new Error(
      'No story is open. Start the scenario with a Given that opens one, such as "Given the Button playground is open".',
    )
  }

  return scope
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
