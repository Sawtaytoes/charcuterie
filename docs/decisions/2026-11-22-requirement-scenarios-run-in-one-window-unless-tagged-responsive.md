# Requirement scenarios run in one window unless tagged responsive

- **Status:** Accepted
- **Date:** 2026-11-22
- **Type:** Testing convention
- **Supersedes:** [Every browser test runs in four named windows](2026-10-04-every-browser-test-runs-in-four-named-windows.md), in part: Gherkin requirement scenarios only. Every other browser test still runs in all four windows.
- **Superseded by:** —

## Decision

A Gherkin requirement scenario runs once, in the `wide` window (1920x1080). A scenario
tagged `@responsive` runs in all four standard windows instead. The `requirements`
project leaves out `@responsive` scenarios by test name; the `requirements-responsive`
project runs only them. Tag a scenario `@responsive` when what it proves depends on the
window: layout, wrapping, overflow, or a control that exists only at some sizes.

The four-window rule still applies to `ui-dom`, `storybook`, and every app suite. A
behavior scenario that fails in a window it did not run in is still a defect; the fix is
to tag it `@responsive`, not to pin it to one window.

## Context

The Button pilot ran six scenarios in four windows: 24 browser cases for clicks, key
presses, and ARIA states that do not change with the window. Converting the rest of the
library at that rate would quadruple the requirement suite's browser time and add no
evidence.

## Why

A requirement about behavior is proven once. Layout requirements still get every window,
and the tag makes that choice visible in the spec instead of hiding it in config.

## Evidence

The owner, T3 Code chat `5309f491-ab8b-4c0d-ba57-064cd046d58d`, 2026-11-22, on the proposal
to run one window by default with an `@responsive` tag: *"I like your idea too"*, and on
four windows for every scenario: *"yeah, it's too much."* A temporary `@responsive` tag
on REQ-UI-004 ran that scenario in all four windows and left it out of the one-window
project.
