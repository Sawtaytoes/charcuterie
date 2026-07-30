# Stories are demos; the DOM tests are `*.test.tsx` mounting those stories

**Status:** Accepted
**Date:** 2026-07-30
**Type:** Testing
**Supersedes:** [2026-07-29-stories-are-the-dom-test-surface.md](2026-07-29-stories-are-the-dom-test-surface.md)
**Superseded by:** —

## Decision

1. **No story in `@charcuterie/ui` has a `play` function.** A story renders a thing and
   documents it. That is all it does.
2. **Every DOM assertion lives in `Component.test.tsx`**, beside `Component.tsx`, run by
   the `ui-dom` Vitest project in headless chromium.
3. **A test mounts the composed story**, through `composeStories` + `run()` — it does not
   re-assemble the component. The subject of a DOM test is the story a reader sees, with
   its args, decorators, and loaders.
4. **A story that existed only to host assertions is deleted.** `Button.Interactive` was
   `Default` plus a keyboard walk; `DisabledDoesNotFire` was a test in the sidebar. Both
   are tests now and neither is a story.
5. **A story asserts one thing about one arrangement.** A board showing eighteen variants
   is one story — one proposition, rendered many times. A story that drove *two* tab bars
   to compare activation modes was two stories wearing one name.
6. Reversed from the superseded record: **`*.test.tsx` files now exist in
   `@charcuterie/ui`.** Unchanged from it: **there is still no second rendering stack** —
   no jsdom, no `@testing-library/react`, no `vitest-browser-react`.

## Context

M4's review looked at the built site and asked two things: why do stories render several
unrelated demonstrations at once, and why is a test — `Disabled Does Not Fire` — sitting
in the component sidebar where a designer browsing `Button` will find it.

Both are consequences of the superseded decision rather than accidents. If `play` is the
only place an assertion may live, then every assertion needs a story to live in, and
stories accumulate that exist for no reader:

| Story | What it actually was |
| --- | --- |
| `Button.DisabledDoesNotFire` | A test. Named like one. |
| `Button.Interactive` | `Default`, plus Tab/Enter/Space assertions. |
| `Button.AllStates` | A good board, whose `play` tabbed four times to make one cell look right. |
| `Tabs.Interactive` | Two tab bars side by side, so one `play` could assert both activation modes. |
| `Tabs.AllStates` | A disabled tab, roving focus, **and** a detached `<div role="tablist">` stub proving `expectAgentDrivable`'s own rule. |
| `Modal.AllStates` | An ~80-line `play` with eight interaction steps. |

The `Tabs.AllStates` case is the clearest: a test of the *test helper*, rendered inside a
demo of a *component*, in a file about neither.

## Why

**The premise the old record rested on is still true, and it did not require `play`.**
That record's argument was one rendering stack — a component that passes in jsdom and
fails in Storybook has told nobody anything useful. `composeStories` keeps that entirely.
The test renders the same story, in the same chromium, under the same project annotations.
What changes is only *where the assertions are written*.

**A demo and a test have opposite success criteria.** A demo should show the most
representative arrangement; a test should isolate one behaviour and vary one thing. Asking
one artefact to be both means the sidebar fills with test vehicles and the tests inherit
the demo's furniture.

**Deleting a story is now allowed.** Under the old rule, removing a test-shaped story
removed its coverage. Now the coverage is in a file that nobody browses, so the sidebar can
be curated for readers.

## Consequences

- `packages/docs/vitest.ui.config.ts` is a new Vitest project, `ui-dom`. It cannot use
  `storybookTest()` — that plugin owns `test.include`, because its whole job is to turn the
  `stories` globs into the test list — so the pieces it would have supplied are assembled
  by hand and the project annotations are applied in `vitest.ui.setup.ts`.
- The config lives in `packages/docs` because the preview does, and `ui` may not depend on
  `docs`. The *files* still sit beside their components.
- **Two things had to be rebuilt that `storybookTest()` was quietly providing:**
  - `import.meta.env.VITEST_STORYBOOK === "false"` is `@storybook/addon-a11y`'s test for
    "a standalone Vitest run". Without it the addon still runs axe and still files a
    report, and simply never throws. Every test passed with the accessibility tree
    unchecked — the failure mode that looks exactly like success. Set through `define`.
  - `globalTypes[…].defaultValue` is deprecated **and** canvas-only: it seeds the toolbar
    and nothing else, so a composed story got `globals.density === undefined` and the
    decorator wrote the literal string `"undefined"` onto `<html>`. A `md` button measured
    26px instead of 40px, in the one place sizes are asserted. Replaced with
    `initialGlobals`.
- **Axe audits a story once**, in an `afterEach` that fires when `run()` resolves. With the
  plays gone that is before a test has clicked anything, so the states that most need
  auditing — an open dialog, a shown popover, a selected tab panel — call
  `expectNoAxeViolations` explicitly.
- `AllStates` boards use the pseudo-states addon's `focusVisible` instead of a `play` that
  tabbed to the right cell. Declarative, and no longer dependent on how many focusable
  cells sit above it.
- `packages/ui`'s own Vitest project stays Node-only and `.ts`-only. The `.tsx` siblings
  belong to `ui-dom`.
- A renamed story now breaks its `.mdx` at *runtime* and nothing else — so
  `mdxReferences.test.ts` exists. This split renamed `Tabs.Interactive` to `Tabs.Manual`
  and broke `Components/Tabs › Docs` while all 359 tests stayed green.

## Evidence

> Many stories have multiple renders like this. I don't know if you're familiar, but
> stories are supposed to be singular; testing or showing off one feature, not all of them
> at once. At least, that's been my experience. Am I wrong?

> On top of that, a lot of the "play" functions, maybe all of them, should be Vitest
> Browser/Playwright tests, not Storybook play functions, right? We should be testing in
> vitest, not our live Storybook/docs environment.

— Kevin, reviewing the built M4 site before M5.

The premise about *where* the tests run was already satisfied — `play` functions have run
under `@vitest/browser-playwright` since M3, not in the browsing session. The part that was
right, and the reason this record exists, is that a test does not belong in the sidebar.

Asked which of three splits to take, he chose the largest:

> Full split: stories are demos, tests are tests
