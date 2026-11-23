import { expectNoAxeViolations } from "../../../ui/src/expectNoAxeViolations.testHelpers.ts"
import type { RequirementsWorld } from "../support/RequirementsWorld.ts"
import { byRole, type Role } from "./queries.ts"

/**
 * axe, run now, on the named element. Every story is already audited
 * once when it mounts; this audits a state a step reached, such as an
 * open dialog.
 */
export const auditElement = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  await expectNoAxeViolations(byRole(world, role, name))
}

/** axe, run now, on the story's canvas. */
export const auditStory = async (
  world: RequirementsWorld,
) => {
  if (!world.storyRoot) {
    throw new Error(
      'No story is open. Start the scenario with a Given that opens one, such as "Given the Button playground is open".',
    )
  }

  await expectNoAxeViolations(world.storyRoot)
}
