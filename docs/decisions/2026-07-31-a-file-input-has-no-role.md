# A file input has no role, so `FileDropZone` is queried by label

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Testing
**Supersedes:** —
**Superseded by:** —

## Decision

`FileDropZone.test.tsx` uses `canvas.getByLabelText(…)` rather than `expectAgentDrivable`.

It is the **only** component in `@charcuterie/ui` allowed to, and the exemption is specific
to `<input type="file">` — not to drop zones, not to labels, and not to anything else that
turns out to be awkward to query.

## Context

The library's central claim is that `getByRole(role, { name })` finds exactly one thing, and
`expectAgentDrivable` asserts it for every component.

`<input type="file">` has **no ARIA role**. HTML-AAM defines none, so testing-library's role
computation matches it to nothing and `getByRole("button", { name })` returns zero elements.

The implementations disagree with the specification and with each other:

| | maps `input[type=file]` to |
| --- | --- |
| HTML-AAM / ARIA | *no role* |
| testing-library (`dom-accessibility-api`) | nothing — `getByRole` cannot find it |
| Chrome's accessibility tree | button |
| **Playwright's role engine** | **button** |

So `page.getByRole("button", { name })` finds it in a real agent run while `canvas.getByRole`
cannot find it in the test that exists to prove agent-drivability.

## Why

The alternatives were both worse:

- **`role="button"` on the input.** It would satisfy the helper and break the control: an
  explicit role overrides the native one, and the file-picker semantics a screen reader
  relies on go with it. Passing the gate by damaging the thing the gate is protecting.
- **Do not use a real file input.** That is the whole design gone. There is no keyboard
  gesture for drag-and-drop; WCAG 2.5.7 requires a single-pointer alternative, and the
  honest one has existed since 1995. The fleet's one drag target has no keyboard path at
  all, which is the defect this component exists not to have.

`getByLabelText` is also what an agent actually does —
`page.getByLabel(…).setInputFiles(…)` is the Playwright idiom for a file input, so the test
still makes the query the agent makes. That is the property that matters; `getByRole` was
only ever the usual spelling of it.

Worth stating plainly rather than burying: **the most accessible file control is the one the
role model has no name for.** That is a hole in the platform, not in the component, and
`expectAgentDrivable` is right to have no opinion about it.

A second naming defect surfaced in the same component and was fixed rather than exempted:
the whole zone is the `<label>`, so a `<label for>` named the input with the prompt *and*
the description concatenated. `aria-labelledby` on the prompt and `aria-describedby` on the
description keep the click target and give back a name that is a name.

## Evidence

`FileDropZone.test.tsx` during M6, failing with `Unable to find a label with the text of:
Drop a disc image here` against a rendered `<label for>` that was plainly correct.
