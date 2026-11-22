import { expect } from "storybook/test"

import { expectAgentDrivable } from "../../../ui/src/testing/index.ts"
import type { RequirementsWorld } from "../support/RequirementsWorld.ts"
import { byRole, type Role, scopeOf } from "./queries.ts"

/**
 * The library's agent-drivability contract, which is more than the
 * step's words say: exactly one element has this role and name, it
 * is in the accessibility tree, no descendant carries a test ID, and
 * the keyboard can reach it. See `expectAgentDrivable`.
 */
export const expectAccessible = (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => expectAgentDrivable(scopeOf(world), { role, name })

export const expectFocused = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  await expect(byRole(world, role, name)).toHaveFocus()
}

export const expectNotFocused = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  await expect(byRole(world, role, name)).not.toHaveFocus()
}

/** Natively disabled: a click does nothing and Tab skips it. */
export const expectDisabled = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  await expect(byRole(world, role, name)).toBeDisabled()
}

export const expectBusy = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  await expect(byRole(world, role, name)).toHaveAttribute(
    "aria-busy",
    "true",
  )
}

/**
 * A visible element with this exact role and accessible name. For a
 * live region this is what a screen reader announces, so an empty or
 * differently named status fails here rather than passing as
 * "some status exists".
 */
export const expectVisible = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  await expect(byRole(world, role, name)).toBeVisible()
}
