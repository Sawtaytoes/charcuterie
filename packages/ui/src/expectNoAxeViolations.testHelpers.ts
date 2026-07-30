import axe from "axe-core"

/**
 * Run axe against a subtree, now.
 *
 * The a11y addon audits a story **once**, in an `afterEach` that
 * fires when `run()` resolves — i.e. immediately after the first
 * paint. That was enough while the assertions lived in `play`,
 * because the addon's hook ran after the play had finished driving.
 * With the tests split out, `run()` returns before a test has
 * clicked anything, so the states that most need auditing — an open
 * dialog, a shown popover, a selected tab panel — would never be
 * seen by axe at all.
 *
 * So a driven state audits itself explicitly. The rule set is left
 * at axe's default, matching the addon, except that `region` is
 * disabled for the same reason the addon disables it: a component
 * mounted on its own is not a page and owes nobody a landmark.
 */
export const expectNoAxeViolations = async (
  element: Element,
): Promise<void> => {
  const results = await axe.run(element, {
    rules: { region: { enabled: false } },
  })

  if (results.violations.length === 0) {
    return
  }

  throw new Error(
    `Expected no accessibility violations, found ${results.violations.length}:\n\n${results.violations
      .map(
        (violation) =>
          `  ${violation.id} (${violation.impact}) — ${violation.help}\n${violation.nodes
            .map((node) => `    ${node.html}`)
            .join("\n")}`,
      )
      .join("\n\n")}`,
  )
}
