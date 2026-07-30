/**
 * Agent-drivability as a red/green property, not a hope.
 *
 * A stated goal of this library is that **Playwright MCP and AI
 * agents can drive the fleet's apps**, and that reduces to one
 * mechanical requirement: `getByRole(role, { name })` finds exactly
 * one thing. The fleet fails it comprehensively today —
 * plex-channels' icon buttons are bare glyphs (`↶`, `↷`, `▶`),
 * mux-magic's status pills are `<div>`s with no role, xander has
 * zero `aria-*` attributes — and every one of those failures is
 * invisible in a browser and invisible to axe.
 *
 * So every component's story calls this, and the assertion is the
 * same one Playwright will make.
 *
 * Deliberately dependency-free — no `expect`, no jest-dom, no
 * testing-library import. This ships in `@charcuterie/ui/testing`
 * for consumers to use on *their* components, and a published
 * package should not drag a test framework into an app's dependency
 * graph to do it. Plain `Error`s with actionable messages work in a
 * story `play`, in Vitest, in Playwright, and in a scratch script.
 */

/**
 * The subset of a testing-library query object this needs —
 * structural, so Storybook's `canvas`, a `within(element)` result,
 * and `screen` all satisfy it without an import.
 */
export type AgentQueries = {
  queryAllByRole: (
    role: string,
    options?: { name?: RegExp | string },
  ) => HTMLElement[]
}

export type AgentTarget = {
  name?: RegExp | string
  role: string
}

const describeTarget = ({ name, role }: AgentTarget) =>
  name === undefined
    ? `role "${role}"`
    : `role "${role}" named ${
        typeof name === "string"
          ? `"${name}"`
          : String(name)
      }`

/**
 * The composite widgets whose members are *supposed* to carry
 * `tabindex="-1"`.
 *
 * Found by M4. `Tabs` is the first component here to use the
 * roving-tabindex pattern, and this helper rejected it outright:
 * "has a negative tabindex, so it can be clicked but never reached
 * with Tab". That rule is right for a standalone button and wrong
 * for a tab — a roving group's whole design is that exactly one
 * member is in the tab order and the arrow keys reach the rest, so
 * a tab list where every tab had `tabindex="0"` would be the bug.
 *
 * So the check is not skipped for these; it is **replaced by the
 * roving rule itself**, which is a stronger assertion than the one
 * it stands in for.
 */
const COMPOSITE_ROLES = new Set([
  "grid",
  "listbox",
  "menu",
  "menubar",
  "radiogroup",
  "tablist",
  "toolbar",
  "tree",
  "treegrid",
])

const COMPOSITE_MEMBER_ROLES = new Set([
  "gridcell",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "tab",
  "treeitem",
])

const getCompositeGroup = (element: Element) => {
  if (
    !COMPOSITE_MEMBER_ROLES.has(
      element.getAttribute("role") ?? "",
    )
  ) {
    return null
  }

  let current = element.parentElement

  while (current) {
    if (
      COMPOSITE_ROLES.has(
        current.getAttribute("role") ?? "",
      )
    ) {
      return current
    }

    current = current.parentElement
  }

  return null
}

const getIsHiddenFromAgents = (element: Element) => {
  let current: Element | null = element

  while (current) {
    if (
      current.getAttribute("aria-hidden") === "true" ||
      current.hasAttribute("inert")
    ) {
      return true
    }

    current = current.parentElement
  }

  return false
}

/**
 * Asserts the control an agent would reach for is reachable, unique,
 * and keyboard-operable. Returns it, so a caller can go on to assert
 * something specific about it.
 */
export const expectAgentDrivable = (
  canvas: AgentQueries,
  target: AgentTarget,
): HTMLElement => {
  const matches = canvas.queryAllByRole(
    target.role,
    target.name === undefined
      ? undefined
      : { name: target.name },
  )

  if (matches.length === 0) {
    throw new Error(
      `Not agent-drivable: nothing matches ${describeTarget(
        target,
      )}. An agent cannot click what it cannot name — give the control an accessible name (visible text, \`aria-label\`, or a \`VisuallyHidden\` label) rather than a \`data-testid\`.`,
    )
  }

  // Ambiguity is a failure, not a warning. Two "Start" buttons on a
  // page mean an agent picks one at random, which is worse than not
  // finding either — and the fix is a `Card` heading turning each
  // one into its own `region`.
  if (matches.length > 1) {
    throw new Error(
      `Not agent-drivable: ${
        matches.length
      } elements match ${describeTarget(
        target,
      )}. Scope them — a labelled region per group — or make the names distinct.`,
    )
  }

  const [element] = matches

  if (!element) {
    throw new Error(
      `Not agent-drivable: ${describeTarget(
        target,
      )} matched an empty element.`,
    )
  }

  if (getIsHiddenFromAgents(element)) {
    throw new Error(
      `Not agent-drivable: ${describeTarget(
        target,
      )} is inside an \`aria-hidden\` or \`inert\` subtree, so a real screen reader and a real agent both skip it.`,
    )
  }

  if (element.querySelector("[data-testid]")) {
    throw new Error(
      `\`data-testid\` found inside ${describeTarget(
        target,
      )}. This library has none by rule: a testid is a name only the test suite can see, which is exactly the gap that leaves an app untestable by an agent.`,
    )
  }

  const isNativelyInteractive = [
    "a",
    "button",
    "input",
    "select",
    "textarea",
  ].includes(element.tagName.toLowerCase())

  const isDisabled =
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true"

  if (
    isNativelyInteractive &&
    !isDisabled &&
    element.tabIndex < 0
  ) {
    const group = getCompositeGroup(element)

    if (!group) {
      throw new Error(
        `Not agent-drivable: ${describeTarget(
          target,
        )} has a negative tabindex, so it can be clicked but never reached with Tab.`,
      )
    }

    // A roving group, so the question changes: not "is this
    // element in the tab order" — it must not be — but "is the
    // *group* reachable, exactly once". Zero tab stops strands the
    // whole widget; several put every member back in the tab
    // order, which is the pattern not being implemented at all.
    const tabStops = Array.from(
      group.querySelectorAll("[role]"),
    ).filter(
      (member) =>
        COMPOSITE_MEMBER_ROLES.has(
          member.getAttribute("role") ?? "",
        ) &&
        !member.hasAttribute("disabled") &&
        member.getAttribute("aria-disabled") !== "true" &&
        (member as HTMLElement).tabIndex >= 0,
    )

    if (tabStops.length !== 1) {
      throw new Error(
        `Not agent-drivable: ${describeTarget(
          target,
        )} is inside a \`${group.getAttribute(
          "role",
        )}\` with ${
          tabStops.length
        } tab stops. A roving-tabindex group needs exactly one — Tab enters and leaves it once, and the arrow keys move within it.`,
      )
    }
  }

  return element
}

/**
 * The other half of the contract, for decoration.
 *
 * A `Skeleton` that assistive technology can see is a screen reader
 * reading three empty bars, and an agent finding a "loading" element
 * it cannot act on. Asserting the *absence* of a role is how that
 * stays true — axe will not tell you, because there is nothing
 * invalid about it.
 */
export const expectHiddenFromAgents = (
  element: Element,
): void => {
  if (!getIsHiddenFromAgents(element)) {
    throw new Error(
      'Expected this element to be hidden from assistive technology (`aria-hidden="true"` or `inert`). Decoration that is announced is noise: the load has to be announced by the region that owns it, not by its placeholder.',
    )
  }
}
