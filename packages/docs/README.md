# `@charcuterie/docs`

The Storybook host. **Private** — the fleet reads it, nobody installs it.

```bash
yarn storybook          # dev server on :6006
yarn build:storybook    # → storybook-static/
yarn vitest run --project storybook   # from the repo root: every story renders, axe
yarn vitest run --project ui-dom      # from the repo root: @charcuterie/ui's DOM tests
yarn smoke:storybook    # clicks through the built site — see below
```

Two browser projects, because stories and tests were split apart
([decision](../../docs/decisions/2026-07-30-stories-are-demos-tests-are-tests.md)).
`storybook` proves every story still renders and passes axe; `ui-dom` runs
`@charcuterie/ui`'s `*.test.tsx`, which mount those same stories and drive them.

`ui-dom` cannot use `storybookTest()` — that plugin owns `test.include`, because its job is
to turn the `stories` globs into the test list — so `vitest.ui.config.ts` assembles the
same pieces by hand and `vitest.ui.setup.ts` applies the project annotations. Two of those
pieces are load-bearing and easy to lose:

- `define: { "import.meta.env.VITEST_STORYBOOK": '"false"' }` is what makes
  `@storybook/addon-a11y` **throw** its violations. Without it axe still runs and still
  files a report, and every test passes with the accessibility tree unchecked.
- `initialGlobals` in `.storybook/preview.tsx`, not `globalTypes[…].defaultValue` — the
  latter is deprecated *and* canvas-only, so a composed story rendered at
  `data-density="undefined"` and every density-derived size silently fell back.

## Stories live in `@charcuterie/ui`, not here

`.storybook/main.ts` globs `../../ui/src/**/*.mdx` and `../../ui/src/**/*.stories.tsx`, so a
component's `Component.tsx` / `.stories.tsx` / `.mdx` / `.test.tsx` stay siblings — matching
mux-magic.

**The `.mdx` glob comes first on purpose.** An attached MDX file is indexed where its
specifier sits and is *not* hoisted the way an `autodocs` entry is, so listing the stories
first put every component's `Docs` entry at the bottom of its sidebar group. The sidebar
follows index order and the index follows that array, so no `storySort` can fix it after
the fact.
This package is the *host*: the three toolbars, the a11y gate, and the token stylesheet.

That stylesheet, `src/styles/tokens.css`, also carries two lines M3 added and nothing else
would have: `@import "@charcuterie/ui/src/styles.css"` (the looping animations, imported from
source so Storybook works before anything is built) and `@source "../../../ui/src"` —
without which Tailwind never scans the components and every one of them renders unstyled with
no error.

## The three toolbars are the production mechanism

`data-scheme`, `data-density`, and `data-variant` are written straight onto `<html>` —
scheme by `@storybook/addon-themes`' `withThemeByDataAttribute`, the other two by a
decorator doing the same thing by hand.

That is not a Storybook convenience. It is exactly what an app does, exercised. Nothing
in React observes those attributes, so switching one re-themes the whole canvas with
zero re-render. **If a component ever needs a `useTheme()` to respond correctly, the
token layer has failed, and this toolbar is where it shows up first.**

The default scheme is **dark**, deliberately. `daylight` won M0 as a light-first
*visual direction*; that is not the same as flipping the fleet to light, and the kiosk
Pis stay pinned to dark — a light kiosk in a dark room is a lamp.

## Accessibility is enforced, not reported

`parameters.a11y = { test: "error" }` in `.storybook/preview.tsx` makes axe violations
**fail the run** rather than fill a panel nobody opens. Verified working: the first run
failed seven stories over one real issue.

That issue is worth recording, because it is the shape of mistake this gate exists to
catch. `content.disabled` was rendered as a paragraph of prose, and axe flagged it at
2.6:1. The token was not wrong — WCAG 1.4.3 exempts *inactive controls*, which is why
the contrast audit exempts that role too — but the **specimen** was, because prose is
not an inactive control. The exemption is only honest where the role is actually used,
so the specimen now shows it on a genuinely `disabled` button.

Opting a story out requires `a11y: { test: "todo" }` with a comment linking an issue.

## `yarn smoke:storybook` — the gate that clicks

`scripts/smokeStorybook.ts` serves `storybook-static/`, loads the manager **once**, and
walks every entry in `index.json` over the addons channel — the same
`setCurrentStory` the sidebar emits. Any `console.error`, page error, or Storybook error
display fails the run.

It exists because `--project storybook` structurally cannot see one class of bug.
That run mounts each story in isolation, which is right for a component assertion and
blind to anything about **order**. The bug it missed: Storybook's `enhanceContext`
loader swaps `HTMLElement.prototype.focus` for an accessor, React Aria — inside
Storybook's own lazily-loaded docs blocks — reads that property on the prototype at
module scope, and the getter throws `Illegal invocation`. Cold-loading a docs page was
fine; clicking to one after any story was broken, so in practice **all twelve docs
pages were broken** while every gate stayed green.

It also checks something no error would ever report: that a docs page never renders a
`| --- |` delimiter row as literal text. MDX is CommonMark, and a GitHub-flavoured
table is not — so `main.ts` passes `remark-gfm` to `@storybook/addon-docs`, and without
it every table in every `.mdx` here renders as a paragraph of pipe characters with the
source still perfectly correct. Three pages were doing that, `Tokens/Overview` included.

Hence two rules for this package:

- **The first import in `.storybook/preview.tsx` is load-bearing.**
  `import "@storybook/addon-docs/blocks"` has no exports we use and looks like dead
  code. Removing it re-breaks every docs page
  ([decision](../../docs/decisions/2026-07-29-preload-docs-blocks-before-the-focus-patch.md)).
- **One deliberate 404 is allowlisted by URL.** `MediaTile`'s error story points at a
  poster that really is missing, because a mocked `onError` proves nothing about what
  the browser does with a broken `<img>`. Scoped to that path, so a genuinely missing
  chunk still fails.

Run it against a dev server with `node scripts/smokeStorybook.ts --base=http://localhost:6006`.

## `TokenSpecimen` is throwaway

It is not a library component and not a candidate to become one. It exists to prove the
substrate before M3 builds anything real on it — which it now has, so this is history
rather than the only board here.

Two things it demonstrates on purpose:

- **Colours come from Tailwind utilities** — `bg-surface-raised`, `text-content-muted`,
  `bg-intent-danger-solid`. Those exist only because `@charcuterie/tokens/theme.css` put
  `--color-*` into an `@theme` block, which is the identical mechanism mux-magic picks
  up in its four-line swap.
- **Radius, spacing, and type come through `var()`** rather than a utility. That was the
  known gap at M1, and **M3 closed it**: `theme.css` now publishes `--text-*`,
  `--leading-*`, `--shadow-*`, `--ease-*`, and `--spacing`, so `@charcuterie/ui` writes
  `text-md` / `shadow-low` / `p-3` directly
  ([decision](../../docs/decisions/2026-07-29-theme-css-bridges-tailwind-namespaces.md)).
  The `var()` calls here are left as-is, as the before-picture.

Every class name is written out in full. Tailwind v4 scans source text for *complete*
class strings, so `` `bg-intent-${intent}-solid` `` generates nothing at all and fails
silently — the element just renders unstyled, which reads as "the token layer is broken"
rather than "the scanner never saw it".

## Sandbox note: Playwright browsers

The story tests run in `@vitest/browser` + chromium, and **need no environment override**.
`/opt/pw-browsers` now holds both chromium **1234** and `chromium_headless_shell-1234`,
which is what this workspace's Playwright wants:

```bash
yarn vitest run --project storybook
yarn vitest run --project ui-dom
```

Corrected 2026-07-29 (M3). M1 and M2 both documented a
`PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` workaround for an image that
shipped build 1228; that directory no longer exists, so following the old instruction now
*causes* the "Playwright was just installed" banner instead of avoiding it.
