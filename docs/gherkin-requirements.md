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
  dialog.feature
  field.feature
  requirements.config.json    ID prefix, allowed tags, globs
  requirements.lock.json      generated; never edit by hand
  index.ts                    setup: sets the World, loads every steps/*.steps.ts
  support/
    RequirementsWorld.ts      per-scenario STATE only: page, storyRoot, activations
    steps.ts                  Given/When/Then wrappers; the only way to register a step
    parameterTypes.ts         {role}
  helpers/                    plain functions that take the World; one concern per file
    queries.ts  input.ts  states.ts  activations.ts  audits.ts  stories.ts
    helpers.test.ts           each helper against the cases it must reject
  steps/
    controls.steps.ts         generic steps for any control, by role and name
    button.steps.ts           Button's fixtures: the Givens that open its stories
    dialog.steps.ts           `the Dialog story "<name>" is open`
    field.steps.ts            `the Field story "<name>" is open`
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
- **Open a story by the name Storybook shows**, such as
  `Given the Dialog story "All States" is open`. A component needs its own fixture step
  only when a scenario installs a handler, as Button's activation counts do.
- **Queries search the whole page.** A dialog, a tooltip, or a listbox portals out of the
  story's canvas, so every step finds controls in `document.body`.
- **A click must land.** The click step fails when a scrim or another panel covers the
  control's center, because a person could not click it there.
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

Scenarios run exactly as plain `*.test.tsx` tests do. Each feature file is one Vitest test
file. Vitest runs separate files in parallel, and the tests inside one file one after
another. Neither project turns on `test.concurrent`. `@concurrent` is banned for the same
reason the plain tests never use `test.concurrent`: every test in a browser file shares
one document, one keyboard focus, and the same body cleanup. More features run in
parallel the same way more test files do.

## The lock

`requirements.lock.json` records each requirement's steps, including their data tables and
doc strings; the prose under its Feature, Rule, and Scenario (rewrapping is not a change);
its tags; and every code unit those steps reach:

- the step definitions, the helpers and World members they call, and each module's imports
  and top-level statements;
- the fixtures they import from outside this directory, one export at a time, such as
  the `Playground` story and `expectAgentDrivable`;
- the runtime every scenario passes through, hashed as whole files: `index.ts`,
  `support/` (the World, the step wrapper, and the parameter types), the requirements
  config, the Vitest requirement configs, `vitest.ui.setup.ts`, and the
  `package.json` of the `storybook-config` and `vitest-config` packages they import (only
  the fields that choose which code runs, so a release's version bump is not a change); plus whatever those
  runtime files import by relative path, such as `.storybook/preview.tsx`;
- the top-level code of every step file, and of every module a step file or runtime file
  imports, directly or not, because `index.ts` loads them all for every scenario. Workspace
  packages listed in `packages` are followed by name through their `exports`. A step file
  must define at least one step; setup code goes in `support/`.

If you change any of them, the lock becomes stale and `requirements:check` fails, naming
each requirement and the code that changed. This catches a weakened assertion even when no
English changed.

**If you did not mean to change a requirement, revert the edit. Do not relock.** When the
change is intended:

1. Run `pnpm requirements:lock`. It prints the requirements that changed and why, as a
   Markdown list. For example, `- **REQ-UI-002** changed: <scenario>`, followed by
   `- code changed: helpers/states.ts › expectDisabled`.
2. Copy that list into the pull request description. The lock's `digests` map has one
   line per requirement ID. Each line hashes the whole entry: the spec, tags, status, and
   code. So the lock's own diff also names each changed requirement. The reviewer checks each listed ID
   against the requirement it names. CI writes the same list to the job summary.
3. To remove a requirement, delete its scenario and run
   `pnpm requirements:lock --retire REQ-UI-005 --reason "<why>"`. Its ID can never be
   reused. On a pull request, CI compares the lock with the base commit and fails if a
   requirement or a retirement entry disappears, or if a retired ID comes back.

Comments and formatting do not change the lock, in TypeScript, JSON, or CSS. The
components under test do not change it either: `subjects` in `requirements.config.json`
names them, and the lock neither hashes nor follows them. A story change does change it,
for the requirements that use that story. Two known false positives remain. Storybook
requires `storySort` inline in `.storybook/preview.tsx`, and the test runner imports that
file, so reordering the sidebar marks every requirement. And a new, removed, or reordered
import or re-export line in any module the scenarios load marks every requirement, because
that module's top-level code runs for all of them. A type annotation inside a function
also counts as code, so changing it marks the requirements that reach that function. A
top-level value that spreads, reads a property, or does arithmetic counts as code too, even
in a story no scenario uses, so adding one to a story file marks every requirement that
loads that file.
Relock for any of these and say so in the pull request.

The lock is a tripwire, not a proof. It reads code by name without running it, and each
review of it has found new ways around it. Reading the lock diff and the job summary in
review is still the final check. A top-level statement that may run code joins its module's `‹module›` unit. That
includes an initializer that calls a function, assigns a value, reads a property (a
getter), or builds a template with a value (`toString`). It also includes a class whose `extends`
clause calls or reads something, a decorator, a computed member name, a static initializer,
and a top-level `using` declaration. Only
literals, names, functions, and object and array literals built from them stay out.
Editing it marks every requirement that reaches that module, and every requirement when
the module is a step file. A barrel's own top-level code counts when a name passes through it, and renamed,
default, and namespace re-exports are followed to the code behind them. A dynamic
`import()` must use a string literal. It is followed like a namespace import, and the
top-level code of every module its target imports counts, as for a static import. Only the
setup file may call `import.meta.glob`, in any module the lock reaches. A
side-effect import (`import "./patch.ts"`) is followed, and so is `import {} from` or an
import of inline types only, which load the module the same way. A `@jsx` pragma comment
is rejected, because it changes which module compiles the file's JSX. The check matches
the text anywhere in the file, so do not write `@jsx` in a comment either. A relative
import must name one file: if `./queries` could load both `queries.js` and `queries.ts`,
the check fails, because Vite tries `.js` first. Root-absolute (`/…`) and `#` subpath
imports are rejected, and so is a directory import whose directory has a `package.json`. A
named re-export wins over `export *` wherever it is written, an `export declare` counts as
nothing, a JSON file supplies its top-level keys to `export *` and is hashed whole, two `export *` lines that supply one name from different declarations fail the check, because JavaScript then exports neither, and a name that passes through more than eight re-exports fails the check. A `package.json` that is valid JSON but not an object, such as `null`, fails the check too. A step
definition's code must be an inline function. Any relative import in a module the
lock reaches must resolve, or the check fails. A lazy or conditional
`import.meta.glob` is rejected. A lock in the wrong shape fails, and CI finds the base
commit's lock through the base commit's own config.

What the lock does not see: npm package versions (the pnpm lockfile covers those);
workspace packages not listed in `packages`, imported by name; the
root `vitest.config.ts`, `package.json` scripts, and the CI workflow (code review covers
those); a Vitest setup file named only by a string path, unless it is listed in `runtime`;
`tsconfig.json` files; files a CSS `@import` loads; the order of scenarios in a feature
file; a move of the whole
requirements directory, which also changes `--root` in `package.json`; and code reached
only through dynamic property access, `eval`, or an aliased step function. The walker matches names, not bindings, so it can also
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

## Dialog coverage

Behavior moved from `Dialog.test.tsx` to `dialog.feature`
([decision](decisions/2026-11-23-dialog-and-field-behavior-tests-are-gherkin-scenarios.md)).
`Dialog.test.tsx` keeps layout and paint: the size widths, the phone fit, the scroll clamp,
the scrim token, and the one shared scrim for stacked dialogs.

| Requirement | Scenario | Replaces |
| --- | --- | --- |
| `@REQ-UI-007` | An open dialog can be identified by its role and name | the dialog is reachable from a body-scoped query |
| `@REQ-UI-008` | A dialog with no body is its question and its answers | a dialog with no body renders from heading and footer alone |
| `@REQ-UI-009` | Escape closes a dialog and returns focus to the button that opened it | focus is trapped inside, and Escape restores it to the trigger |
| `@REQ-UI-010` | A dialog that holds a form puts the caret in its field | initialFocus puts the caret in the field, not on Close |
| `@REQ-UI-011` | A non-dismissable dialog ignores Escape and closes from its own answer | a non-dismissable dialog ignores Escape rather than closing |
| `@REQ-UI-012` | A second dialog covers the first, and they close top-first | stacked dialogs share one scrim and dismiss top-first, except the scrim count |
| `@REQ-UI-013` to `@REQ-UI-015` | Escape, a click elsewhere, and a choice inside a dialog's picker | a picker cancels its selection without closing the enclosing draft |

## Field coverage

Behavior moved from `Field.test.tsx` to `field.feature`. `Field.test.tsx` keeps the wiring a
consumer relies on: an adopted `id`, the overlay trigger's `id`, the derivable label `id`,
and where rest props land.

| Requirement | Scenario | Replaces |
| --- | --- | --- |
| `@REQ-UI-016` | A text field is named by its label and described by its help text | the label names the control; a description is announced |
| `@REQ-UI-017` | A picker in a field is named by its label and its value | the slot takes a Picker as readily as an input |
| `@REQ-UI-018` | A required text field is required both ways | `required` is spelled twice. The old test used `toBeRequired()`, which also passes on `aria-required` alone. |
| `@REQ-UI-019` | A field with an error is invalid and announces the error | an error is the only source of invalidity |
| `@REQ-UI-020` | The help text is read before the error | description is described before error |
| `@REQ-UI-021` | A caller's own description is read first, then the help text, then the error | a caller's aria-describedby composes with the description and the error |
| `@REQ-UI-022` to `@REQ-UI-024` | A field and a tooltip nested in both orders | the two slot-forwarding tests and the tip described alongside |
| `@REQ-UI-025`, `@REQ-UI-026` | A group is named by its legend; it describes its error | the two group tests |
| `@REQ-UI-027` | A disabled group disables every control inside it | the disabled half of the fieldset rest-prop test |

A description step compares the whole accessible description, in order, so one step
replaces the old tests' split on `aria-describedby` and their substring matches.

Shared source and style rules, contrast checks, Storybook accessibility audits, and visual
regression still cover Button through their own suites.

If Chromium is missing in a local container, install the browser version this repo needs
into a writable cache, and set `PLAYWRIGHT_BROWSERS_PATH` for the run. Do not change the
pinned Playwright version to match an image cache.
