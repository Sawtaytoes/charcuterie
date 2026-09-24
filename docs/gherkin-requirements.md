# Gherkin requirements in Charcuterie

Charcuterie is the first app fleet pilot for readable, executable requirements. A `.feature`
file states the behavior a person needs. QuickPickle turns each scenario into a Vitest test.
Vitest runs it in Chromium through the same Playwright provider as the component DOM suite.
The feature file is the review surface; the step code and world connect its words to the UI.

The pilot is [`button.feature`](../packages/docs/requirements/button.feature). It covers
keyboard activation, the disabled state, and the busy announcement. It mounts composed
Storybook stories, so the requirement checks the component a reader can inspect in
Storybook. Existing component tests remain useful for narrower cases.

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
yarn build
yarn vitest run --project requirements
yarn vitest run
yarn typecheck
yarn lint:biome && yarn lint:eslint
```

`yarn workspace @charcuterie/docs test:requirements` runs the pilot alone. The root
`vitest.config.ts` includes the project, so CI's `yarn vitest run` also runs it. The
project config is `packages/docs/vitest.requirements.config.ts`. The world uses role and
accessible name queries. It has helpers for clicking, filling, keyboard input, visibility,
disabled and busy states, text, and status announcements. Add an app-specific helper only
when a scenario needs it; keep feature wording about behavior rather than implementation.

If Chromium is missing in a local container, install the browser version required by the
repo into a writable cache and set `PLAYWRIGHT_BROWSERS_PATH` for the test run. Do not
change the pinned Playwright version to match an image cache.
