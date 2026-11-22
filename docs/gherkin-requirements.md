# Gherkin requirements in Charcuterie

A `.feature` file states what a person needs a component to do, in words a person reads.
QuickPickle turns each scenario into a Vitest test that runs in Chromium through
Playwright, the same browser `ui-dom` uses. The feature file is the requirement; the
step code is how it is checked. **Change the requirement first, then the code.** Never
edit a scenario so that changed code passes.

Two records govern this:
[locked IDs and the static check](decisions/2026-11-22-requirements-are-locked-by-id-and-checked-before-the-browser.md)
and [one window unless `@responsive`](decisions/2026-11-22-requirement-scenarios-run-in-one-window-unless-tagged-responsive.md).

## Commands

```sh
pnpm requirements:check                  # lint features and steps, verify the lock (seconds, no browser)
pnpm requirements:which button.feature:41  # what runs for this line, and every file it reaches
pnpm requirements:which REQ-UI-003       # the same, for each step of one requirement
pnpm requirements:index                  # every step traced; add --json for tools
pnpm requirements:lock                   # rewrite the lock after an intended change
pnpm requirements:diff --base origin/master  # which requirements this branch changes
pnpm --filter @charcuterie/docs test:requirements  # run the scenarios
```

The root `pnpm vitest run` includes both requirement projects, so CI runs the scenarios
with the rest of the suite. CI's `lint` job runs `requirements:check` and writes the
`requirements:diff` list to the job summary.

## Layout

```
packages/docs/requirements/
  button.feature              one feature per component
  requirements.config.json    ID prefix, allowed tags, globs
  requirements.lock.json      generated; never edit by hand
  index.ts                    setup: sets the World, loads every steps/*.steps.ts
  support/
    RequirementsWorld.ts      per-scenario STATE only: canvas, page, activations
    steps.ts                  Given/When/Then wrappers; the only way to register a step
    parameterTypes.ts         {role}
  helpers/                    plain functions that take the World; one concern per file
    queries.ts  input.ts  states.ts  activations.ts  stories.ts
    helpers.test.ts           each helper against the cases it must reject
  steps/
    controls.steps.ts         generic steps for any control, by role and name
    button.steps.ts           Button's fixtures: the Givens that open its stories
```

Put a new action or assertion in `helpers/` and test it in `helpers.test.ts`, including a
case it must reject. Put a component's fixtures in `steps/<component>.steps.ts`. Reuse a
step from `controls.steps.ts` before you write a new one. The checker fails on a helper or
step that no scenario reaches, so the World cannot collect unused code.

## Writing a scenario

```gherkin
Feature: Button
  A button starts one action. …

  Rule: A button responds the same way to a mouse and a keyboard

    @REQ-UI-006
    Scenario: A mouse user activates a button
      Given the Button playground is open
      When I click the button named "Start rip"
      Then the button named "Start rip" has been activated 1 time
```

- **One behavior per scenario**, named after what it proves. Group scenarios under a
  `Rule` that states the business rule in one sentence.
- **Given sets up, When acts, Then checks.** The checker fails a step whose keyword does
  not match its definition's.
- **Use the words a person sees or hears**: roles and accessible names, not class names,
  props, or test IDs. Find controls by role and name; `{role}` covers the common ARIA roles.
- **Check the exact result.** "The status named "Loading…" is visible," not "a status is
  visible." "The button named X has been activated 1 time" counts only X's own handler.
- **Keep a sequence when the sequence is the requirement.** "Enter, then Space" on one
  mounted button also proves the second activation works; two fresh outline rows do not.
- **One `Examples` table per outline, with no tags on it.** QuickPickle 1.11 runs only the
  first table and ignores Examples tags.
- **Start with Given, When, or Then, and never write `*`.** A leading `And` or a `*` step
  has no reliable type, so the keyword check cannot run.
- **Keep `@` out of names.** Tags are part of the test title, and the window projects
  select scenarios by them.
- **Write each pattern as one string literal Cucumber expression.** Do not use a regular
  expression, a computed pattern, or a priority. These rules let the checker trace every
  step.
- **Document each step definition** with a one-line JSDoc comment. The trace prints it.

## Tags

| Tag | Meaning |
| --- | --- |
| `@REQ-UI-<n>` | Required on every Scenario, exactly once. Take the next number above every active and retired ID; `REQ-UI-7` and `REQ-UI-007` are the same ID. Never reused, even after retirement. Do not place it on a Feature, Rule, or Examples table. |
| `@responsive` | The scenario depends on window size. It runs in all four windows instead of `wide`. |
| `@todo` | Written before the code exists. Reported as **pending**; it proves nothing until the tag is removed. Never add it to a requirement that already passes; that switches the requirement off, which is a requirement change for the owner. |

A tag on a Feature or Rule applies to every scenario under it, as QuickPickle runs them,
and the lock records each scenario's tags, inherited ones included.

The checker rejects every other tag. That includes `@skip`, `@wip`, `@fails`, `@failing`,
`@should-fail`, `@soft`, `@softfail`, `@concurrent`, and `@sequential`. Each one can make a
requirement stop proving anything while the suite stays green. `@fails` is the most
dangerous, because it reports a failure as a pass.

Scenarios in one file run one after another. Each feature file is its own test file, and
Vitest can run separate test files in parallel. `@concurrent` stays banned within a file. Every scenario shares one document,
one keyboard focus, and the same body cleanup, so concurrent scenarios would interfere.

## The lock

`requirements.lock.json` records each requirement's steps, including their data tables and
doc strings, its tags, and every code unit those steps reach:

- the step definitions, the helpers and World members they call, and each module's imports
  and top-level statements;
- the fixtures they import from outside this directory, one export at a time, such as
  the `Playground` story and `expectAgentDrivable`;
- the runtime every scenario passes through, hashed as whole files: `index.ts`,
  `support/` (the World, the step wrapper, and the parameter types), the requirements
  config, the Vitest requirement configs, and `vitest.ui.setup.ts`.

If you change any of them, the lock becomes stale and `requirements:check` fails, naming
each requirement and the code that changed. This catches a weakened assertion even when no
English changed.

**If you did not mean to change a requirement, revert the edit. Do not relock.** When the
change is intended:

1. Run `pnpm requirements:lock`. It prints the requirements that changed and why. For
   example: `REQ-UI-002 changed, code changed: helpers/states.ts › expectDisabled`.
2. Copy that list into the pull request description. The reviewer checks each listed ID
   against the requirement it names. CI writes the same list to the job summary.
3. To remove a requirement, delete its scenario and run
   `pnpm requirements:lock --retire REQ-UI-005 --reason "<why>"`. Its ID can never be
   reused. On a pull request, CI compares the lock with the base commit and fails if a
   requirement or a retirement entry disappears, or if a retired ID comes back.

Comments and formatting do not change the lock. The components under test do not change
it either: `subjects` in `requirements.config.json` names them, and the lock neither hashes
nor follows them. A story change does change it, for the requirements that use that story.

The lock is a tripwire, not a proof. It reads code by name without running it, and each
review of it has found new ways around it. Reading the lock diff and the job summary in
review is still the final check. A top-level statement that runs code, such as an
initializer that calls a function or assigns a value, joins its module's `‹module›` unit,
so editing it marks every requirement that loads the module. A lazy or conditional
`import.meta.glob` is rejected. A lock in the wrong shape fails, and CI finds the base
commit's lock through the base commit's own config.

What the lock does not see: npm package versions (the pnpm lockfile covers those), the root
`vitest.config.ts` and the CI workflow (code review covers those), and code reached only
through dynamic property access. The walker matches names, not bindings, so it can also
list a same-named function that a step does not really call; that errs toward reporting a
change.

## Reading a failure

```
FAIL |requirements-wide| requirements/button.feature > … (@REQ-UI-002)
Error: the button named "Start rip" is disabled (#41)
expect(element).toBeDisabled()
…
Step definition: Then("the {role} named {string} is disabled")
Trace: pnpm requirements:which requirements/button.feature:41
 ❯ expectDisabled requirements/helpers/states.ts:41:42
 ❯ requirements/steps/controls.steps.ts:60:10
```

The first line names the requirement. The `Error:` line names the step and its feature
line. A step timeout comes from QuickPickle, outside the wrapper, so it has no
`Step definition:` line; run `pnpm requirements:which` on its feature line. The stack names the helper that failed. Run the `Trace:` command to list every file
that step reaches; open those files and no others. If the code is right and the
requirement is wrong, change the scenario. That is a requirement change: ask the owner,
and report it in the pull request.

## When not to use Gherkin

Gherkin is for behavior a person can observe: an action, then a result found by role and
name. Keep pure functions, token math, lint rules, and source-graph tests as plain Vitest
tests. Keep visual regression in reg-suit. Keep axe sweeps in the Storybook suite; every
mounted story is already audited. Unit tests of the requirement helpers stay plain
Vitest. A test that runs the same helper it tests cannot catch that helper's bug.

## Button coverage

The Button suite replaced `Button.test.tsx`
([decision](decisions/2026-10-14-button-behavior-tests-are-gherkin-scenarios.md)).

| Requirement | Scenario | Checks |
| --- | --- | --- |
| `@REQ-UI-004` | A button can be identified by its role and name | The full `expectAgentDrivable` check: unique role and name, accessible subtree, no descendant test IDs, keyboard reachable. |
| `@REQ-UI-001` | A keyboard user activates a button with Enter and then Space | The full `expectAgentDrivable` check; Tab focuses it; focus alone starts nothing; Enter starts the action once, and Space then starts it a second time on the same button. |
| `@REQ-UI-006` | A mouse user activates a button | One click starts the action once. |
| `@REQ-UI-002` | A disabled button ignores clicks, and Tab does not focus it | A click starts nothing; the control is natively disabled; Tab does not focus it. |
| `@REQ-UI-003` | A busy button announces its state | The agent-drivability check; disabled; `aria-busy="true"`; a visible status named "Loading…". |
| `@REQ-UI-005` | The states board includes a busy button | The `AllStates` story's loading button has `aria-busy="true"`. |

Shared source and style rules, contrast checks, Storybook accessibility audits, and visual
regression still cover Button through their own suites.

If Chromium is missing in a local container, install the browser version this repo needs
into a writable cache, and set `PLAYWRIGHT_BROWSERS_PATH` for the run. Do not change the
pinned Playwright version to match an image cache.
