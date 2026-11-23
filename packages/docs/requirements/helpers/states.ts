import { computeAccessibleName } from "dom-accessibility-api"
import { expect, waitFor } from "storybook/test"

import {
  expectAgentDrivable,
  expectHiddenFromAgents,
} from "../../../ui/src/testing/index.ts"
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

/**
 * Waits for focus, because a dialog's focus manager moves it a frame
 * after the dialog opens.
 */
export const expectFocused = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  await waitFor(() =>
    expect(byRole(world, role, name)).toHaveFocus(),
  )
}

/** Checked once, now: waiting could only make a negative pass sooner. */
export const expectNotFocused = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  await expect(byRole(world, role, name)).not.toHaveFocus()
}

/** Focus is on the named element or on something inside it. */
export const expectFocusInside = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  await waitFor(() => {
    const container = byRole(world, role, name)

    expect(
      container.contains(document.activeElement),
      `focus is inside the ${role} named "${name}" (it is on <${document.activeElement?.tagName.toLowerCase() ?? "nothing"}>)`,
    ).toBe(true)
  })
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
  await waitFor(() =>
    expect(byRole(world, role, name)).toBeVisible(),
  )
}

/**
 * Every element with this role, or this role and name, in the
 * document, hidden ones included. A closing panel is `inert` and
 * `aria-hidden` while it animates out, so a query of the accessibility
 * tree alone would call a panel that never leaves "gone".
 */
const inDocument = (
  world: RequirementsWorld,
  role: Role,
  name?: string,
) =>
  scopeOf(world)
    .queryAllByRole(role, { hidden: true })
    .filter(
      // Testing Library names a hidden element "", so the name is
      // computed here with hidden content included.
      (element) =>
        name === undefined ||
        computeAccessibleName(element, { hidden: true }) ===
          name,
    )

const describeMatches = (role: Role, name?: string) =>
  name === undefined
    ? `every ${role} in the document`
    : `every ${role} named "${name}" in the document`

/**
 * Nothing in the document has this role and name, now. Checked once:
 * a wait would let an element that appears and then leaves pass.
 */
export const expectAbsent = (
  world: RequirementsWorld,
  role: Role,
  name?: string,
) => {
  expect(
    inDocument(world, role, name),
    describeMatches(role, name),
  ).toHaveLength(0)
}

/**
 * The panel has left the document. Waits, because a closing panel
 * leaves after its exit; one that never leaves fails at the wait's
 * timeout.
 */
export const expectClosed = async (
  world: RequirementsWorld,
  role: Role,
  name?: string,
) => {
  await waitFor(() =>
    expect(
      inDocument(world, role, name),
      describeMatches(role, name),
    ).toHaveLength(0),
  )
}

/**
 * Present, but hidden from assistive technology (`inert` or
 * `aria-hidden`), as the lower of two stacked dialogs is.
 */
export const expectHiddenFromAssistiveTechnology = (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  const scope = scopeOf(world)
  const matches = scope.queryAllByRole(role, {
    hidden: true,
    name,
  })

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one ${role} named "${name}" on the page, hidden or not; found ${matches.length}.`,
    )
  }

  expectHiddenFromAgents(matches[0] as Element)
}

/** The value a person sees in the field. */
export const expectValue = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
  value: string,
) => {
  await expect(byRole(world, role, name)).toHaveValue(value)
}

/**
 * Required both ways: `required`, which the browser validates, and
 * `aria-required`, which a screen reader announces on a control the
 * browser does not validate.
 */
export const expectRequired = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  const element = byRole(world, role, name)

  // Not `toBeRequired()`: it also accepts `aria-required` alone, so it
  // could not tell the browser's half missing.
  await expect(element).toHaveAttribute("required")
  await expect(element).toHaveAttribute(
    "aria-required",
    "true",
  )
}

/**
 * `aria-invalid="true"`, which only an error sets. Not the browser's
 * own validity: an empty required field is "invalid" to the browser
 * before anyone has typed in it.
 */
export const expectMarkedInvalid = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  await expect(byRole(world, role, name)).toHaveAttribute(
    "aria-invalid",
    "true",
  )
}

export const expectNotMarkedInvalid = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
) => {
  await expect(
    byRole(world, role, name),
  ).not.toHaveAttribute("aria-invalid")
}

/**
 * The whole accessible description, exactly, in order: what a screen
 * reader reads after the name. The order is part of it, because
 * "help, then error" and "error, then help" are different sentences.
 */
export const expectDescription = async (
  world: RequirementsWorld,
  role: Role,
  name: string,
  description: string,
) => {
  await expect(
    byRole(world, role, name),
  ).toHaveAccessibleDescription(description)
}
