import { expectActivations } from "../helpers/activations.ts"
import { click, press } from "../helpers/input.ts"
import type { Role } from "../helpers/queries.ts"
import {
  expectAccessible,
  expectBusy,
  expectDisabled,
  expectFocused,
  expectNotFocused,
  expectVisible,
} from "../helpers/states.ts"
import { Then, When } from "../support/steps.ts"

/**
 * Steps that work for any control, found by role and accessible
 * name. Component fixtures (the Givens) live in `<component>.steps.ts`.
 */

/** A real pointer click on the named control. */
When(
  "I click the {role} named {string}",
  async (world, role: Role, name: string) => {
    await click(world, role, name)
  },
)

/** One key press: Tab moves focus; Enter, Space, and Escape go to the focused control. */
When("I press {word}", async (world, key: string) => {
  await press(world, key)
})

/** The full agent-drivability check: unique role and name, in the accessibility tree, no test IDs, reachable by keyboard. */
Then(
  "the {role} named {string} is accessible by role and name",
  (world, role: Role, name: string) => {
    expectAccessible(world, role, name)
  },
)

/** The named control has keyboard focus. */
Then(
  "the {role} named {string} has focus",
  async (world, role: Role, name: string) => {
    await expectFocused(world, role, name)
  },
)

/** The named control does not have keyboard focus. */
Then(
  "the {role} named {string} does not have focus",
  async (world, role: Role, name: string) => {
    await expectNotFocused(world, role, name)
  },
)

/** Natively disabled. */
Then(
  "the {role} named {string} is disabled",
  async (world, role: Role, name: string) => {
    await expectDisabled(world, role, name)
  },
)

/** Has aria-busy="true". */
Then(
  "the {role} named {string} is busy",
  async (world, role: Role, name: string) => {
    await expectBusy(world, role, name)
  },
)

/** A visible element with exactly this role and accessible name. */
Then(
  "the {role} named {string} is visible",
  async (world, role: Role, name: string) => {
    await expectVisible(world, role, name)
  },
)

/** The named control's own handler ran exactly this many times. */
Then(
  "the {role} named {string} has been activated {int} time(s)",
  (world, _role: Role, name: string, count: number) => {
    expectActivations(world, name, count)
  },
)

/** The named control's own handler has not run. */
Then(
  "the {role} named {string} has not been activated",
  (world, _role: Role, name: string) => {
    expectActivations(world, name, 0)
  },
)
