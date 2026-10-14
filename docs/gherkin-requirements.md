# Gherkin requirements in Charcuterie

Charcuterie is the first app fleet pilot for readable, executable requirements. A `.feature`
file states the behavior a person needs. QuickPickle turns each scenario into a Vitest test.
Vitest runs it in Chromium through the same Playwright provider as the component DOM suite.
The feature file is the review surface; the step code and world connect its words to the UI.

The first complete conversion is
[`button.feature`](../packages/docs/requirements/button.feature). It replaces all five
tests from `packages/ui/src/Button/Button.test.tsx` and adds an enabled mouse-click case.
All six scenarios mount composed Storybook stories, so each requirement checks the
component a reader can inspect in Storybook. Each scenario runs at all four standard
window sizes: 24 browser cases in total.

## Button coverage

| Requirement | Scenario | Assertions retained or added |
| --- | --- | --- |
| `@REQ-UI-004` | A button can be identified by its role and name | The full `expectAgentDrivable` check: unique role/name match, accessible subtree, no descendant test IDs, and keyboard reachability. |
| `@REQ-UI-001` | A keyboard user activates a button | The same accessibility check; Tab focuses it; focus alone starts no action; Enter calls the action once and Space calls it again. |
| `@REQ-UI-002` | A disabled button ignores clicks and is skipped by Tab | A click starts no action; the control is natively disabled; Tab does not focus it. |
| `@REQ-UI-003` | A busy button announces its state | The same accessibility check; the control is disabled and has `aria-busy="true"`; the status region is present and visible. |
| `@REQ-UI-005` | The states board includes a busy button | The `AllStates` story's loading button has `aria-busy="true"`. |
| `@REQ-UI-006` | A mouse user activates a button | An enabled button starts its action exactly once after a click. New coverage. |

The first pilot's three scenarios omitted the full accessibility helper, disabled Tab
behavior, and the states board assertion. Conversion restores those assertions before
removing the old test file. Steps and the World still use TypeScript; QuickPickle supplies
the Vitest test cases from Gherkin instead of a duplicate `test(...)` suite.

Shared source/style rules, contrast checks, Storybook accessibility audits, and visual
regression tests continue to cover Button through their existing suites. This conversion
changes the direct Button behavior suite. Other components migrate separately.

## Change a requirement

1. Write or edit the scenario in `packages/docs/requirements/*.feature` before changing the
   component. State a user action and an observable result. Use the words a person sees or
   hears. Include an inaccessible or error state when it matters.
2. Give the scenario a stable `@REQ-...` tag. Keep the tag when wording or implementation
   changes. If a requirement is removed, explain its removal in the pull request.
3. Ask the owner to review the feature diff when the behavior is new or changed. Put the
   added, changed, and removed scenario names in the pull request description. State what
   is still pending there too.
4. Add only the step definitions the scenario needs. Put reusable browser actions and
   assertions in `requirements/world.ts`; put Charcuterie fixtures and domain words in
   `requirements/steps.ts`. A World is fresh for each scenario, so state does not leak.
5. Run the requirement project, then the full repository gates. A new or changed scenario
   must pass before the feature branch merges. `@todo`, `@wip`, and `@skip` do not prove a
   requirement: QuickPickle treats them as non-running scenarios. Report any such scenario
   as pending, and remove the tag when its behavior works.

```sh
pnpm build
pnpm exec vitest run --project 'requirements-*'
pnpm exec vitest run
pnpm typecheck
pnpm lint:biome && pnpm lint:eslint
```

`pnpm --filter @charcuterie/docs test:requirements` runs the pilot alone at all four
standard window sizes. The root `vitest.config.ts` includes the project, so CI's
`pnpm exec vitest run` also runs it. The
project config is `packages/docs/vitest.requirements.config.ts`. The world uses role and
accessible name queries. It has helpers for clicking, filling, keyboard input, visibility,
disabled and busy states, text, and status announcements. Add an app-specific helper only
when a scenario needs it; keep feature wording about behavior rather than implementation.

If Chromium is missing in a local container, install the browser version required by the
repo into a writable cache and set `PLAYWRIGHT_BROWSERS_PATH` for the test run. Do not
change the pinned Playwright version to match an image cache.
