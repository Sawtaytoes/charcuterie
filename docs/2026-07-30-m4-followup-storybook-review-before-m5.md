# M4 follow-up: the Storybook review before M5

**Date:** 2026-07-30
**Status:** Landed
**Reads before:** [the M4 handoff](2026-07-30-m4-overlays-and-the-tabs-thesis-test.md)

Kevin reviewed the built site before M5 started and raised seven things. Six were real.
This is what each turned out to be, because three of them are failure modes that produce a
*fully green* gate set.

## 1. "Stories are supposed to be singular" — right, but not about the boards

The distinction that matters is not one render vs. many. `AllVariants` is **one
proposition** ("here is the intent × appearance matrix") rendered eighteen times, and that
is a legitimate story — which is why the boards read fine to him and the others did not.

The actual violations were stories asserting two or three unrelated behaviours:

| Story | What it actually was |
| --- | --- |
| `Button.DisabledDoesNotFire` | A test. Named like one, in the sidebar. |
| `Button.Interactive` | `Default`, plus Tab/Enter/Space assertions. |
| `Tabs.Interactive` | Two tab bars side by side, so one `play` could assert both activation modes. |
| `Tabs.AllStates` | A disabled tab, roving focus, **and** a detached stub proving `expectAgentDrivable`'s own rule. |
| `Modal.AllStates` | An ~80-line `play` with eight interaction steps. |

## 2. "Play functions should be Vitest tests" — the premise was already true

They have run under `@vitest/browser-playwright` in headless chromium since M3. There was
never a "live Storybook environment" doing the testing.

What was genuinely wrong is the other direction: **tests were leaking into the sidebar.**
The fix is the [full split](decisions/2026-07-30-stories-are-demos-tests-are-tests.md) —
stories carry no assertions, `Component.test.tsx` mounts the composed story and drives it.

**Two things `storybookTest()` was quietly providing had to be rebuilt**, and both fail
silently:

- `@storybook/addon-a11y` only **throws** when
  `import.meta.env.VITEST_STORYBOOK === "false"`. Otherwise it runs axe, files a report,
  and returns. Every test in the new project passed with the accessibility tree unchecked
  until this was found — the failure mode that looks exactly like success. It was found by
  deliberately breaking a story's accessibility and watching the suite stay green.
- `globalTypes[…].defaultValue` is deprecated *and* canvas-only. A composed story got
  `globals.density === undefined`, and the decorator wrote the literal string
  `"undefined"` onto `<html>`. A `md` button measured **26px instead of 40px** — in the one
  place sizes are asserted. Now `initialGlobals`.

Axe audits a story once, when `run()` resolves. With the plays gone that is before a test
has clicked anything, so driven states call `expectNoAxeViolations` explicitly.

## 3 & 4. The Controls panel: an unselected radio, and a `{}` textarea

Two separate faults.

`react-docgen` follows **relative** imports and stops at bare package specifiers:

```js
appearance: { tsType: { name: "union", elements: [ … ] } }  // ../intentStyles.ts  ✅
size:       { tsType: { name: "ControlSize" } }              // @charcuterie/tokens ❌
```

An unresolved name has no enumerable values, and Storybook's fallback for an unknown type
is the **object control** — a JSON textarea containing `{}` on a prop that takes three
strings. Nine props across seven components.

Separately, Storybook has not seeded `args` from a docgen `defaultValue` since v7, so the
props table printed `"control"` in the Default column while the radio beside it had nothing
selected.

Both fixed, and [recorded](decisions/2026-07-30-cross-package-prop-types-need-explicit-argtypes.md).
`react-docgen-typescript` would have resolved the imports *and* expanded
`ComponentPropsWithRef<"button">` into every HTML attribute React knows.

## 5. The `Docs` entry at the bottom of each sidebar group

Not normal, and a one-line fix: an attached MDX file is indexed where its specifier sits in
`main.ts`'s `stories` array, and is not hoisted the way an `autodocs` entry is. The sidebar
follows index order and the index follows that array, so no `storySort` corrects it.
`.mdx` now precedes `.stories.tsx`.

## 6. The "all variants" boards

Kept, unchanged. See §1 — his instinct about them was correct.

## 7. The overflowing badge

Real component bug: `shrink-0` + `whitespace-nowrap` + no maximum. `max-inline-size: 100%`
caps it and `overflow` decides what happens next —
[decision](decisions/2026-07-30-badge-truncates-and-says-so.md).

Worth knowing, because it is the thing a future "fix" would break: **truncation is
`text-overflow: ellipsis` and nothing else.** The ellipsis is *painted* by the layout
engine, not inserted into the tree, so `textContent` is untouched — triple-click selection,
copy, and every screen reader still get the whole string. A refactor to
`children.slice(0, 30) + "…"` would look identical and destroy all three. There is a test.

## What this cost the gate set, and what it added

Two new tests, both verified by making them fail first:

- `storyControls.test.ts` — a prop typed from another package needs an explicit `argTypes`
  entry.
- `mdxReferences.test.ts` — an `.mdx` may not reference a story that no longer exists.
  `of` resolves at **runtime**, so this split renamed `Tabs.Interactive` → `Tabs.Manual`
  and broke `Components/Tabs › Docs` while lint, typecheck, build, and all 359 tests stayed
  green. `smoke:storybook` caught it, but only after a full Storybook build.

`yarn test` now runs four projects: `tokens`, `logic`, `ui` (Node), `ui-dom` (chromium),
plus `storybook`.

## Still open for M5

Nothing here blocks ripdeck. One judgement call was deliberately deferred: a truncated
badge's hover readout is a `title`, which does not work on touch. The answer for touch is
`overflow="wrap"` rather than a `Tooltip` component — building one would mean making
`Badge` interactive, which contradicts what it is. Revisit if a consumer needs otherwise.
