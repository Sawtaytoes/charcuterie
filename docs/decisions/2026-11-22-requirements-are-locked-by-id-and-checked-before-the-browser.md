# Requirements are locked by ID and checked before the browser runs

- **Status:** Accepted
- **Date:** 2026-11-22
- **Type:** Testing convention
- **Supersedes:** [Button behavior tests are Gherkin scenarios](2026-10-14-button-behavior-tests-are-gherkin-scenarios.md), in part: the `world.ts` and `steps.ts` layout. The conversion itself and its coverage stand.
- **Superseded by:** —

## Decision

Gherkin requirements have a ledger, a static checker, and a traced failure message. The
checker replaces third-party Gherkin linters; the fleet does not use `gherkin-lint`.

1. **The lock.** `requirements.lock.json` lists every requirement ID with its steps
   (data tables and doc strings included), its tags (inherited ones included), its
   examples, and the code its steps reach. That code includes the step definitions; the
   helper functions and World members they call; each module's imports and top-level
   statements; each fixture export they import from outside the requirements directory,
   such as a story or `expectAgentDrivable`; and, as whole files, the runtime every
   scenario passes through (the setup file, the World, the step wrapper, the parameter
   types, the requirements config, and the requirement Vitest configs). The components
   under test, listed as `subjects` in the config, are neither hashed nor followed. A
   change to any locked part makes the lock stale until `pnpm requirements:lock` rewrites
   it. The check, the rewrite, and CI's job summary name each changed requirement ID and
   the code that changed. Comments and formatting do not count as changes. On a pull
   request, CI also compares the lock with the base commit and fails if a requirement or a
   retirement entry disappears or a retired ID returns. The lock does not cover package
   versions, the root Vitest config, or the CI workflow.
2. **Lock-down tags.** Each Scenario has exactly one `@REQ-UI-<n>` tag, unique in the
   repo by number, so `REQ-UI-7` and `REQ-UI-007` are the same ID. A removed requirement must be retired with a reason
   (`pnpm requirements:lock --retire <ID> --reason "…"`), and a retired ID is never
   reused. Tags that change how QuickPickle runs a scenario are rejected: `@skip`,
   `@wip`, `@fails`, `@failing`, `@should-fail`, `@soft`, `@softfail`, `@concurrent`,
   and `@sequential`. The only allowed tags are `@todo`, which the check reports as
   pending, and `@responsive`.
3. **`pnpm requirements:check`** runs in the `lint` job without a browser. It reads
   the features with the parser QuickPickle uses and the step code with the TypeScript
   parser. It fails on undefined, ambiguous, or duplicate steps; a step whose keyword
   does not match its definition; a leading `And` or a `*` step; a tag-like word in a name
   or a tag on an `Examples` table; a step file the setup file does not load, or a hook
   imported from QuickPickle outside the runtime files; unused steps and unused helpers; a regular-expression,
   computed, or prioritized pattern; a step imported straight from `quickpickle`;
   missing, duplicate, or misplaced IDs; and a stale lock. It also rejects a second
   `Examples` table, because QuickPickle 1.11 runs only the first
   ([dnotes/quickpickle#62](https://github.com/dnotes/quickpickle/issues/62)).
4. **Traceability.** Steps register through `requirements/support/steps.ts`. A failure
   then ends with `Step definition: Then("…")` and a
   `pnpm requirements:which <file.feature:line>` command. That command prints the
   matched definition and every helper and fixture it reaches, each with its
   `file:line`.
5. **Layout.** The World holds state only. Behavior lives in `requirements/helpers/` as
   plain functions, each tested by `helpers.test.ts` against the cases it must reject.
   Generic steps live in `steps/controls.steps.ts` and component fixtures in
   `steps/<component>.steps.ts`. An activation count belongs to one named control.

The checker is `charcuterie-requirements` in `@charcuterie/ci`, so other repos can run it
from the same checkout as the decision-record linter.

## Context

Four independent reviews of the Button pilot reached the same conclusion. An English
scenario protects nothing by itself: an agent can leave every sentence unchanged and
weaken the code under it. The pilot already showed this. "the button named X has been
activated" counted every click in the World, and "a status message is visible" accepted
any status. QuickPickle also never reports which definition matched a failing step, and
`gherkin-lint` 4.2.4, last released in December 2023, skips scenarios inside `Rule` in 23
of its 31 rules.

## Why

The owner wants requirements an agent cannot quietly change. A lock that covers the code
as well as the words turns a weakened assertion into a named requirement change in the
pull request. Static checks fail in seconds, before a browser starts. A failure that
names its definition, plus a trace that lists the files to open, removes the main cost of
debugging Gherkin.

## Evidence

The owner, T3 Code chat `5309f491-ab8b-4c0d-ba57-064cd046d58d`, 2026-11-22, on the
reviewers' finding that the English spec protects nothing by itself: *"Ah, we gotta add
that then"*, and on the ID check: *"Yeah, this is what I want. Lock-down tags!
Perfect!"* On the linter: *"so write our own linter. that's fine. I'd completely stop
using gherkin-lint in favor of our own solution."* On tracing: *"We'd need something that
could take all the regexes and let's you see which was active for a given line."*

A planted failure (`expectDisabled` changed to `toBeEnabled`) made the lock name
REQ-UI-002 and REQ-UI-003 as changed, with no `.feature` edit. The same failure printed
`Step definition: Then("the {role} named {string} is disabled")` and
`Trace: pnpm requirements:which requirements/button.feature:41`. The checker's own tests
are in `packages/ci/src/requirements/requirements.test.js`.
