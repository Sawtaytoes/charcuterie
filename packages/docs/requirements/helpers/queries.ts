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
) => {
  const element = scopeOf(world).getByRole(role, { name })

  remember(world, role, name, element)

  return element
}

const seenKey = (role: Role, name: string) =>
  JSON.stringify([role, name])

/**
 * Records an element a step found, for a later "has closed". An
 * element is remembered under the name it had when last found, so a
 * control whose name changed is no longer matched by its old one.
 */
export const remember = (
  world: RequirementsWorld,
  role: Role,
  name: string,
  element: Element,
) => {
  const key = seenKey(role, name)

  for (const [otherKey, elements] of world.seen) {
    if (otherKey !== key) {
      elements.delete(element)
    }
  }

  const elements = world.seen.get(key) ?? new Set()

  elements.add(element)
  world.seen.set(key, elements)
}

/** Whether a step found an element by this role and name. */
export const wasSeen = (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => (world.seen.get(seenKey(role, name))?.size ?? 0) > 0

/**
 * The elements a step found by this role and name that are still in
 * the document but hidden from the accessibility tree. One that is
 * not hidden is matched by its current name instead, so it does not
 * answer to a name it no longer has.
 */
export const stillInDocument = (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  const accessible = new Set<Element>(
    scopeOf(world).queryAllByRole(role),
  )

  return [
    ...(world.seen.get(seenKey(role, name)) ?? []),
  ].filter(
    (element) =>
      element.isConnected && !accessible.has(element),
  )
}
