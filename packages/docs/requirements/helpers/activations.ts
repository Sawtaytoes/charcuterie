import { expect } from "storybook/test"

import type { RequirementsWorld } from "../support/RequirementsWorld.ts"

/**
 * An action handler for ONE named control. A fixture passes it as
 * that control's `onClick`, so a count can only ever belong to the
 * control it names. A single World-wide counter would let one button
 * take credit for another's click.
 */
export const trackActivations = (
  world: RequirementsWorld,
  name: string,
) => {
  world.activations.set(name, 0)

  return () => {
    world.activations.set(
      name,
      (world.activations.get(name) ?? 0) + 1,
    )
  }
}

export const expectActivations = (
  world: RequirementsWorld,
  name: string,
  count: number,
) => {
  const activations = world.activations.get(name)

  if (activations === undefined) {
    throw new Error(
      `Nothing tracks activations of "${name}". The scenario's Given must install trackActivations(world, "${name}") as that control's handler.`,
    )
  }

  expect(activations, `activations of "${name}"`).toBe(
    count,
  )
}
