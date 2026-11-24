# Dialog and Field behavior tests are Gherkin scenarios

- **Status:** Accepted
- **Date:** 2026-11-23
- **Type:** Testing convention
- **Supersedes:** —
- **Superseded by:** —

## Decision

Dialog and Field are the second and third components whose behavior is written as Gherkin
requirements: `dialog.feature` (`REQ-UI-007` to `REQ-UI-015`) and `field.feature`
(`REQ-UI-016` to `REQ-UI-027`). Their plain test files keep what a person cannot observe by
role and name: layout, paint, ids, and where props land.

1. **Story fixtures by name.** A component opens its stories with one step,
   `Given the <Component> story "<name>" is open`, which takes the name Storybook shows. A
   component writes its own fixture step only when a scenario installs a handler.
2. **Queries search the whole page**, because dialogs, tooltips, and listboxes portal out
   of the story's canvas.
3. **A click must land.** The click helper fails when something covers the control's
   center. `userEvent.click` dispatches to the element directly and would click through a
   scrim.
4. **Positive checks wait; negative checks do not.** "Has focus", "is visible", and
   "has closed" wait for the next frames, because a dialog's focus manager and exit run
   after the event. "Has closed" waits until the panel leaves the document, so a panel
   stuck in its exit, `inert` and `aria-hidden`, still fails. "There is no …" and "does
   not have focus" are checked once, because a wait would let something that appears and
   then leaves pass.
7. **A hidden element is matched by the element the scenario saw, not by a computed
   name.** A hidden element has no accessible name. Two reviews found that every
   reimplementation of the name rules for hidden elements missed real label shapes. So
   the World remembers each element a step finds by role and name, and "has closed",
   "there is no …", and "is hidden from assistive technology" match a hidden element
   only through that memory. A scenario confirms a panel is open before it checks that
   the panel closed or became hidden.
5. **Whole descriptions.** "is described as" compares the full accessible description in
   order. It replaces the old split on `aria-describedby` and its substring matches.
6. **Every control a scenario acts on is checked as agent-drivable** at least once, as the
   old tests did with `expectAgentDrivable`, so a control the keyboard cannot reach
   fails.

## Context

The measured-pilot plan called for two dissimilar components after Button, and then a
comparison with plain tests. The owner asked for both.

## Why

A requirement is easier to review in the feature file than in the test file: the two
features are about 9,500 characters, and the behavior they replace was about 19,800
characters of test code. Each kind of check now lives in one tested helper, so a weak
matcher is found once. The `required` helper's rejection test showed that
`toBeRequired()` passes on `aria-required` alone. The old Field test used it, so a field
that lost its native `required` passed. The scenario now fails on that change.

Six planted defects were run against both suites:

| Defect | Plain tests | Requirements |
| --- | --- | --- |
| Escape closes a non-dismissable dialog | fails | fails |
| A closed dialog does not return focus | fails | fails |
| Field reads the error before the help text | fails | fails |
| Field drops `required` and keeps `aria-required` | **passes** | fails |
| The scrim sits above the dialogs | fails in 1 test | fails in 5 scenarios |
| Field puts `tabIndex={-1}` on its control | fails in 14 tests | fails in 10 scenarios |

## Evidence

The owner, 2026-11-23, on converting the next two components and measuring them: *"Yes,
let's do that work to see."*
