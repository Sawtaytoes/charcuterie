# Stories are the DOM test surface; `@charcuterie/ui` has no second rendering stack

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Testing
**Supersedes:** —
**Superseded by:** —

## Decision

1. **Every DOM assertion a component owes lives in a story `play` function**, run by the
   Storybook project (`packages/docs`) in headless chromium with `parameters.a11y.test`
   at `"error"`.
2. **`packages/ui`'s own Vitest project is Node-only.** It holds what stories cannot see:
   the class maps Tailwind has to be able to generate, the exhaustive status switches, the
   clamping arithmetic, the package boundaries, and the source rules.
3. **There are no `*.test.tsx` files in `@charcuterie/ui`** — no jsdom, no
   `@testing-library/react`, no `vitest-browser-react`.
4. Every component's `play` calls `expectAgentDrivable(canvas, { role, name })`, which
   ships from `@charcuterie/ui/testing` with **zero dependencies** so a consumer can hold
   its own components to the same contract.

The plan's file list — `Component.tsx` + `.stories.tsx` + `.mdx` + `.test.tsx`, matching
mux-magic — is therefore followed for three of the four. This record is that fourth file's
absence, deliberately.

## Context

mux-magic's `StatusBadge.test.tsx` is eight tests, and six of them assert that a class name
is present in `className`:

```tsx
test("applies running styles with animate-pulse", () => {
  render(<StatusBadge status="running" />)
  expect(screen.getByText("running").className).toContain("animate-pulse")
})
```

That is a test of the source file restated. It cannot fail unless someone edits the map,
in which case it fails without telling you whether the *rendered* result is right — and it
would have said nothing about the two real bugs M3 actually found (a `role="status"` that
takes no accessible name from its content, and a container query that can never match).

Meanwhile the stories were going to exist anyway: the plan mandates five per component,
including an `Interactive` one driving the complete keyboard path.

## Why

**One rendering stack, one answer.** A component that passes in jsdom and fails in
Storybook has told nobody anything useful, and the reverse — passing under
`@testing-library` while the real canvas is broken — is worse, because jsdom has no layout,
no `:focus-visible`, no container queries, and no `getComputedStyle` worth trusting. Three
of M3's ten components are *about* those things.

**axe comes free with the story and cannot be attached to a jsdom render.** The a11y gate
at `test: "error"` runs after every play function, over the real accessibility tree. It
caught `landmark-unique` on duplicate `Card` names in three stories on the first run — a
real finding, in markup a reviewer had already read.

**The play function is the same query an agent will write.** `getByRole(role, { name })` in
a play, in a Playwright MCP session, and in an app's own end-to-end test are the same call.
A `data-testid`-shaped unit test proves a path no user and no agent has.

**Node tests stay for what is genuinely static.** `tailwindCandidates.test.ts` compiles
every class literal in the package through the real Tailwind and fails on any candidate
Tailwind cannot generate — 25 Node tests in ~600 ms, catching the one failure mode that is
invisible in a browser *and* in a screenshot: an unstyled element.

## Consequences

- A component with no story has no DOM coverage, so the story set is not optional. The
  barrel test in `sourceRules.test.ts` keeps components from landing unexported; the
  Storybook project fails if a story throws.
- Story files carry real assertions and are therefore reviewed as tests, not as demos.
- `react/no-multi-comp` stays off for `*.stories.tsx` and `*.storyHelpers.tsx`, which the
  shared ESLint config already does.
- Visual regression is still deliberately absent (per the plan) until tokens stop moving.

## Evidence

The plan already puts the weight on stories rather than on unit tests:

> **A11y enforced, not reported.** […] Global `parameters.a11y = { test: "error" }` so
> addon-a11y + addon-vitest **fail the run** on axe violations.

> **Keyboard contract tests** — axe cannot see keyboard behaviour. Every `Interactive` play
> must complete: Tab in → arrows navigate → Enter/Space activate → Esc dismisses → **focus
> returns to the trigger**.

> **Agent-drivability as a red/green property.** Ship
> `expectAgentDrivable(canvas, { role, name })` and call it in every interactive
> component's test. Rule: **`data-testid` appears nowhere in `@charcuterie/ui`**.

— `docs/research/2026-07-29-charcuterie-component-library-plan.md` in the `agentic` repo,
under "Storybook + testing".
