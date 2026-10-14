# Button behavior tests are Gherkin scenarios

- **Status:** Accepted
- **Date:** 2026-10-14
- **Type:** Testing convention
- **Supersedes:** [Stories are demos; the DOM tests are `*.test.tsx`](2026-07-30-stories-are-demos-tests-are-tests.md) (Button test location and format only)
- **Superseded by:** —

## Decision

Convert all five direct Button behavior tests to `packages/docs/requirements/button.feature`.
Preserve each assertion, including the full `expectAgentDrivable` helper, disabled Tab
behavior, and the busy example on the states board. Remove `Button.test.tsx` after
conversion so requirements have one executable definition. Add the missing successful
mouse-click scenario. Retain the pilot's existing requirement IDs.

QuickPickle compiles the six scenarios into Vitest tests. The World contains reusable
queries, interactions, and assertions; step bindings supply the Button stories and
callbacks. Tests still mount composed Storybook stories with the existing annotations,
axe audit, and cleanup. The requirements project uses the shared four-window list and
CI timeout policy. Stories still contain no assertions.

## Context

The initial three-scenario pilot ran beside five TypeScript tests. It did not replace all
their assertions. The owner asked to convert all Button tests, making this the first
complete migration rather than a parallel demonstration.

## Why

Gherkin gives the owner readable requirements while retaining executable checks. An
assertion-by-assertion mapping prevents a format change from reducing coverage. This
decision narrows the old test-file convention for Button; other components remain under
their current conventions until converted.

## Evidence

> What tests do we have on the Button? Can we convert them all to Gherkin for the test?

User request, 2026-10-14. Conversation reference: T3 Code worktree
`t3code-642df6b7` (the full chat ID is not exposed in this session).

The former `Button.test.tsx` at commit `ae251cd` contains five tests. The
[coverage mapping](../gherkin-requirements.md#button-coverage) records each assertion's
destination. PR: [#289](https://github.com/Sawtaytoes/charcuterie/pull/289).
