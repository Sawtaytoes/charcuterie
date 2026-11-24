import { expectActivations } from "../helpers/activations.ts"
import {
  auditElement,
  auditStory,
} from "../helpers/audits.ts"
import {
  click,
  clickOutside,
  expectNotCovered,
  moveFocus,
  press,
  replaceText,
  typeText,
} from "../helpers/input.ts"
import { byRole, type Role } from "../helpers/queries.ts"
import {
  expectAbsent,
  expectAccessible,
  expectBusy,
  expectClosed,
  expectDescription,
  expectDisabled,
  expectFocused,
  expectFocusInside,
  expectHiddenFromAssistiveTechnology,
  expectMarkedInvalid,
  expectNotFocused,
  expectNotMarkedInvalid,
  expectRequired,
  expectValue,
  expectVisible,
} from "../helpers/states.ts"
import { Then, When } from "../support/steps.ts"

/**
 * Steps that work for any control, found by role and accessible
 * name. Component fixtures (the Givens) live in `<component>.steps.ts`.
 */

/** A click on the named control; fails if something covers it. */
When(
  "I click the {role} named {string}",
  async (world, role: Role, name: string) => {
    await click(world, role, name)
  },
)

/** A click on the page outside every panel, as on a dialog's backdrop. */
When("I click outside the dialog", async (world) => {
  await clickOutside(world)
})

/** One key press: Tab moves focus; Enter, Space, and Escape go to the focused control. */
When("I press {word}", async (world, key: string) => {
  await press(world, key)
})

/** Text typed into whatever has focus. */
When("I type {string}", async (world, text: string) => {
  await typeText(world, text)
})

/** Clear the named field, then type into it. */
When(
  "I replace the text in the {role} named {string} with {string}",
  async (world, role: Role, name: string, text: string) => {
    await replaceText(world, role, name, text)
  },
)

/** Keyboard focus moves to the named control, with no pointer. */
When(
  "I move focus to the {role} named {string}",
  (world, role: Role, name: string) => {
    moveFocus(world, role, name)
  },
)

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

/** Keyboard focus is on something inside the named element. */
Then(
  "focus is inside the {role} named {string}",
  async (world, role: Role, name: string) => {
    await expectFocusInside(world, role, name)
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

/**
 * Nothing in the accessibility tree has this role and name, and no hidden
 * element the scenario saw by this name is left; checked once, without
 * waiting.
 */
Then(
  "there is no {role} named {string}",
  (world, role: Role, name: string) => {
    expectAbsent(world, role, name)
  },
)

/** The named panel has left the document, after its exit. */
Then(
  "the {role} named {string} has closed",
  async (world, role: Role, name: string) => {
    await expectClosed(world, role, name)
  },
)

/** No panel with this role is left in the document, after their exits. */
Then(
  "every {role} has closed",
  async (world, role: Role) => {
    await expectClosed(world, role)
  },
)

/** On the page, but inert or aria-hidden. */
Then(
  "the {role} named {string} is hidden from assistive technology",
  (world, role: Role, name: string) => {
    expectHiddenFromAssistiveTechnology(world, role, name)
  },
)

/** A pointer at the control's center lands on the control. */
Then(
  "the {role} named {string} is not covered",
  (world, role: Role, name: string) => {
    expectNotCovered(byRole(world, role, name))
  },
)

/** The field shows exactly this value. */
Then(
  "the {role} named {string} has the value {string}",
  async (
    world,
    role: Role,
    name: string,
    value: string,
  ) => {
    await expectValue(world, role, name, value)
  },
)

/** Both `required` and `aria-required="true"`. */
Then(
  "the {role} named {string} is required",
  async (world, role: Role, name: string) => {
    await expectRequired(world, role, name)
  },
)

/** Has aria-invalid="true". */
Then(
  "the {role} named {string} is marked invalid",
  async (world, role: Role, name: string) => {
    await expectMarkedInvalid(world, role, name)
  },
)

/** Has no aria-invalid at all. */
Then(
  "the {role} named {string} is not marked invalid",
  async (world, role: Role, name: string) => {
    await expectNotMarkedInvalid(world, role, name)
  },
)

/** The whole accessible description, exactly and in order. */
Then(
  "the {role} named {string} is described as {string}",
  async (
    world,
    role: Role,
    name: string,
    description: string,
  ) => {
    await expectDescription(world, role, name, description)
  },
)

/** axe finds no violations in the named element, as it is now. */
Then(
  "the {role} named {string} passes an accessibility audit",
  async (world, role: Role, name: string) => {
    await auditElement(world, role, name)
  },
)

/** axe finds no violations in the story's canvas, as it is now. */
Then(
  "the story passes an accessibility audit",
  async (world) => {
    await auditStory(world)
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
