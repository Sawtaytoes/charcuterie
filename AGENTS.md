# AGENTS.md

Operational notes for AI agents in **Charcuterie** — the fleet's shared infrastructure:
design tokens, state logic, UI components, and the build/test/lint/Docker tooling every app
inherits.

Two jobs bring you here and they read different things:

- **Building an app *with* Charcuterie** → read
  **[Building an app with Charcuterie](packages/docs/src/BuildingAnApp.mdx)** *before you
  write the first component*. It is the component-choice table (which of `Button` /
  `IconButton` / `TextLink` / `ButtonLink` / `Listbox` / `Combobox` / `Field` / `Shell` /
  `AdaptiveGrid` you want), the wiring, and the opt-in lint rules. Same file renders in
  Storybook as **Guides → Building an app**.
- **Changing Charcuterie itself** → this file, then [`README.md`](README.md), then
  [`docs/decisions/`](docs/decisions/README.md).

An app repo that consumes this library should route its UI work here; the paste-in block for
its own `AGENTS.md` is at the end of the guide.

## Before you change anything

**[`docs/decisions/`](docs/decisions/README.md) is binding.** Fifty-odd records, and several
of them are the *opposite* of a reasonable instinct — a menu takes no `label`, `Select` owns
no state, an accordion panel is a `group` and not a landmark, `1440x900` takes more columns
than `1920x1080`. Scan every title in the index before proposing a change; a settled decision
outranks your default. When the owner settles something new, write a new dated file —
**never edit a past decision to change its meaning**, supersede it and cross-link both ways.

**Do not "fix" the three things in
[README § the three things most likely to get "fixed" by mistake](README.md#the-three-things-most-likely-to-get-fixed-by-mistake).**
`colour` in TS but `--color-*` in CSS, light mode is not pure white, and the logic hooks are
uncontrolled on purpose. Each has a decision record and each looks like a bug.

**Read the package README you are about to touch** — `packages/ui/README.md` has the
component checklist, `packages/eslint-config/README.md` the rule table,
`docs/how-we-do-storybook.md` the docs-site model.

## The dependency direction

`tokens ← logic ← ui`. **Forbidden forever: `logic → ui`, `tokens → anything.`**
`@charcuterie/tokens` is zero-dependency and React-free because castkit renders it through
Satori with no React tree, and `@charcuterie/logic/preact` must never reach `react`.
`sourceRules.test.ts` asserts the whole graph, including that every specifier reached is a
declared dependency — so a wrong import fails `yarn test`, not review.

`packages/ui/src/index.ts` is the **one sanctioned barrel**. Components import each other by
relative path (`../Spinner/Spinner.tsx`); a barrel the package's own internals go through
makes every component a dependency of every other one. A test enforces it.

## Commands, and which gates are load-bearing

```bash
yarn install
yarn build          # every package, topological
yarn test           # vitest: node + ui-dom (chromium) + storybook (chromium)
yarn typecheck
yarn lint           # biome --write --unsafe, then eslint --fix
yarn check:contrast # WCAG 2.2 AA, with numbers

yarn build:storybook && yarn smoke:storybook
```

`check:contrast` audits **interactive** states, not just resting ones — every gated pair has
its hover twin at the same threshold. It did not until 2026-08-10, and for the library's
whole life before that it printed *"All variants clear WCAG 2.2 AA"* while every accent
button in the fleet failed AA **while hovered**
([decision](docs/decisions/2026-08-10-interactive-states-are-audited-not-just-resting-states.md)).
A gate that cannot see a state reports its absence as a pass.

**`yarn storybook` and `yarn build:storybook` run `yarn build` first, and that is not
ceremony — do not strip it.** `packages/docs` resolves `@charcuterie/*` through `exports` to
`dist`, exactly as a consumer does, so a stale `dist` renders a token that silently does not
exist and a `logic` fix that has no effect. M4 lost an afternoon to a three-commit-old
`dist`; freshness is now its own red test
([decision](docs/decisions/2026-07-30-storybook-reads-the-built-dist.md)).

**`smoke:storybook` is the only gate that navigates**, and it is the one that catches what
the others structurally cannot. `yarn test` mounts each story in isolation, so it is blind to
**order** — which is how M3 shipped with all twelve docs pages broken and every gate green.
Anything touching MDX, sidebar ordering, or preview bootstrap is unverified until this passes.
It also does a second **cold** pass on a story-less docs page, because a missing
`data-scheme` is not "light mode", it is no theme at all.

`master` requires `lint` + `typecheck` + `test` + `storybook`, squash-only, linear history,
**no bypass actors** — a red check blocks the merge for the AI's token too
([decision](docs/decisions/2026-08-05-master-requires-all-four-ci-checks-no-bypass.md)).
Every user-visible change carries a changeset.

## House rules that bite

- **Booleans start with `is` or `has`.** `isVisible`, `hasPiano` — never a bare adjective.
  Type-aware ESLint rule, and it has **no external-API carve-out**
  ([decision](docs/decisions/2026-07-29-is-has-rule-has-no-external-api-carve-out.md)).
- **`colour` in TypeScript, `--color-*` in CSS.** Not an inconsistency. Tailwind v4's
  `@theme` generates utilities from the `--color-*` namespace only, so renaming the CSS side
  produces a stylesheet with zero utilities and no error.
- **Logical properties only** — `ps-`/`pe-`, `ms-`/`me-`, `start-`/`end-`, `text-start`.
  Never `left`/`right` in a `className`. Lint-enforced, scoped to `className` literals and
  template chunks so `getBoundingClientRect().left` stays clean.
- **A flex row's text child says how it shrinks.** A flex item's automatic minimum
  resolves against its content's **min-content width**, so one unbreakable token — a URI,
  a host, a name — becomes the row's floor and pushes its sibling out. `min-w-0` alone is
  not enough; only `wrap-anywhere` shrinks the min-content size. `truncate` (with the
  full value in an `href` or `title`) and an explicit width are equally valid. And
  `shrink-0` beside `flex-wrap` is a contradiction — the item is pinned at max-content,
  so the wrap can never engage. Lint-enforced, opt-in, by
  `createFlexOverflowRules` in `@charcuterie/eslint-config`
  ([decision](docs/decisions/2026-08-11-a-flex-rows-text-child-must-declare-how-it-shrinks.md)).
- **No literal `<head>`/`<body>` in an `index.html` comment above the real tag.** Vite's
  injection regexes are comment-blind, so the first literal wins and the react-refresh
  preamble lands inside the comment: blank dev page, dead HMR, and **every CI job green**
  because production builds are unaffected. `@charcuterie/vite-config`'s base throws on
  it at dev-server start
  ([decision](docs/decisions/2026-08-11-index-html-comments-must-not-shadow-vites-injection-anchors.md)).
- **Class names are never interpolated.** `` `bg-intent-${intent}-solid` `` generates
  *nothing* and fails silently — that is why `intentStyles.ts` is 48 written-out literals,
  and `tailwindCandidates.test.ts` compiles every literal through the real Tailwind.
- **Ship no icons, and no symbol glyphs in a default.** `⚙`/`↶`/`▨` render as nothing where
  the font lacks them — this sandbox's chromium, the kiosk image, the ePaper build. A
  default is words. Apps bring their own icons (lucide, ISC, is the fleet recommendation)
  ([decision](docs/decisions/2026-07-29-ship-no-icons-and-no-symbol-glyphs.md)).
- **No hex, no `*-slate-*`, no `!important`** in `ui`/`tokens` — colours come from
  `intentStyles.ts`, sizes from `controlStyles.ts`. Tests check. `!important` is allowed only
  in the docs stylesheet, which overrides Storybook's injected emotion.
- **`data-testid` appears nowhere in `@charcuterie/ui`**, and a test enforces that. Every
  component test calls `expectAgentDrivable(canvas, { role, name })` — the same query an
  agent or Playwright will write. If a component cannot be found by role and name, that is
  the bug.

## Where a component's files live

`packages/ui/src/<Name>/` holds `<Name>.tsx`, `<Name>.stories.tsx`, `<Name>.mdx`,
`<Name>.test.tsx` as siblings — matching mux-magic. Shared helpers sit at `src/` root with a
`.storyHelpers.tsx` / `.testHelpers.ts` suffix so they are never mistaken for a component.

**Stories carry no assertions.** A story is a demo; the DOM assertions live in
`<Name>.test.tsx`, which mounts the *composed story* through `run()` in the same chromium —
one rendering stack, and the subject of the test is the page a reader sees
([decision](docs/decisions/2026-07-30-stories-are-demos-tests-are-tests.md)). A story with a
`play` that asserts is the thing this rule exists to delete.

An `.mdx` `<Canvas of={…} />` resolves at **runtime**, so a renamed story breaks only the
rendered page — `mdxReferences.test.ts` catches it in under a second, `smoke:storybook`
catches it in CI, and nothing else catches it at all. Sidebar order follows the `stories`
array in `packages/docs/.storybook/main.ts` (`.mdx` before `.stories.tsx`, deliberately);
there is **no `storySort`**, so ordering cannot be fixed after the fact.

The full checklist for adding a component — the five stories, the container-query trap, the
first-paint-of-a-registering-kind trap — is in
[`packages/ui/README.md`](packages/ui/README.md#adding-a-component).

## Committing

Commit small, push often, one logical change per commit; never leave a dirty tree. Never
commit secrets. Conventional-commit subjects scoped by package (`feat(ui):`, `fix(tokens):`).
