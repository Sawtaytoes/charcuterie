# Charcuterie

Shared tokens, state logic, and components for the app fleet — so UI is edited in one
place and every app inherits look, behaviour, and accessibility.

> **This is the `v2` branch.** v1 — the Children-First React state library from
> [this talk](https://www.youtube.com/watch?v=n62Pc4KV4SM) — lives on `master` and still
> works. Its state hooks were rewritten as `@charcuterie/logic` in M2; its **component**
> files were not ported, and M4's overlays are what will want them —
> [the M2 handoff](docs/2026-07-29-m2-logic-conformance.md) lists which ones and the one
> command that retrieves each.

**M0–M5 have landed.** M4 put the state layer through its falsification test — `Tabs`
needs `SinglePicker` and `RovingFocus` at once, and the two ARIA activation modes come out
one line apart, so **the layer stands**
([verdict](docs/decisions/2026-07-30-state-layer-is-charcuterie-on-floating-ui.md), as
[corrected in M5](docs/decisions/2026-07-30-tab-selection-is-a-single-picker.md)).

**M5 put it into its first consumer, [Rip Deck](../rip-deck/).** `TONE_CLASS` is declared
zero times; four unnamed progress bars became four named ones; light mode became reachable
at all. The library **grew** in the process — `Alert` and `SegmentedControl` came out of
the consumer rather than out of the plan
([the rule](docs/decisions/2026-07-30-a-consumer-milestone-adds-components.md)) — and
`portal:` earned its keep by finding three packaging holes that all fail silently.
**Start from [the M5 handoff](docs/2026-07-30-m5-ripdeck-the-first-consumer.md).**

Next is M5b: the second consumer, **castkit**. Behind it:
[the M4 handoff](docs/2026-07-30-m4-overlays-and-the-tabs-thesis-test.md) and
[the Storybook review that followed it](docs/2026-07-30-m4-followup-storybook-review-before-m5.md)
— which split stories from tests, and found three faults that a fully green gate set could
not see.

## Packages

| Package | Status | Contents |
| --- | --- | --- |
| [`@charcuterie/tokens`](packages/tokens/README.md) | **live** | Token source of truth + generated CSS/JSON. Zero deps, no React. |
| [`@charcuterie/biome-config`](packages/biome-config/README.md) | **live** | Shared Biome settings as an extends-target. |
| [`@charcuterie/eslint-config`](packages/eslint-config/README.md) | **live** | The rules Biome cannot express. |
| [`@charcuterie/docs`](packages/docs/README.md) | **live**, private | Storybook host. |
| [`@charcuterie/logic`](packages/logic/README.md) | **live** | The five state kinds as framework-free cores, plus React 19 and Preact bindings and optional Jotai/signals store adapters. |
| [`@charcuterie/ui`](packages/ui/README.md) | **live** | The P0 components — Spinner, Skeleton, Button, IconButton, Badge, ProgressBar, EmptyState, Card, LiveStatusIndicator, MediaTile, VisuallyHidden, M4's overlays (Modal, Popover, Tabs), and M5's two from the first consumer (Alert, SegmentedControl). Re-exports tokens at `@charcuterie/ui/tokens`. |
| `@charcuterie/rx` | M7 | Design doc + ADR only, deliberately not built. |

Dependency direction is one-way: `tokens ← logic ← ui`. Forbidden forever:
`logic → ui`, `tokens → anything`.

## Commands

```bash
yarn install
yarn build          # every package, in dependency order
yarn test           # Vitest across the workspace
yarn typecheck
yarn lint           # Biome (format + most rules), then ESLint (the rest)
yarn storybook      # :6006
yarn check:contrast # the WCAG 2.2 AA gate as a script, with numbers

yarn build:storybook && yarn smoke:storybook  # clicks through every entry of the built site
```

`storybook` and `build:storybook` both run `yarn build` first, and that is **load-bearing**:
`packages/docs` imports `@charcuterie/tokens/theme.css` and `@charcuterie/logic` through
their `exports`, so both resolve to `dist`. M4 lost an afternoon to a `dist` three commits
old — a new token silently absent from the canvas, a `logic` fix with no effect, and a
story passing against Chromium's default `::backdrop`
([decision](docs/decisions/2026-07-30-storybook-reads-the-built-dist.md)). Freshness is
now its own test.

`smoke:storybook` is the one gate that navigates rather than mounts. `yarn test` renders
each story in isolation, so it is blind to anything about **order** — which is how M3
shipped with all twelve docs pages broken and every gate green
([why](packages/docs/README.md#yarn-smokestorybook--the-gate-that-clicks)).

**Stories carry no assertions.** A story is a demo; the DOM tests are `Component.test.tsx`
beside each component, mounting the composed story through `run()` in the same chromium
([decision](docs/decisions/2026-07-30-stories-are-demos-tests-are-tests.md), superseding
M3's). `yarn test` runs both, as the `storybook` and `ui-dom` projects.

Yarn 4, `node-modules` linker, TypeScript 6, Vitest 4, Biome 2, ESLint 10 — matching
`mux-magic`, the reference app for every convention here. Copy its conventions rather
than inventing new ones.

Browser-mode tests — Storybook's, and `@charcuterie/logic`'s React/Preact conformance run —
need a chromium matching this repo's Playwright, which the agent sandbox now ships at
`/opt/pw-browsers`. No environment override; see the note in
[`packages/logic/README.md`](packages/logic/README.md#testing).

## Where the reasoning lives

- [`docs/decisions/`](docs/decisions/README.md) — settled calls, newest first. **Check
  here before proposing a change**; a decision on file overrides a default instinct, and
  a past one is superseded by a new dated file rather than edited.
- Milestone handoffs, which supersede the plan where they disagree:
  [M1 tokens](docs/2026-07-29-m1-mux-magic-token-swap.md) ·
  [M2 logic](docs/2026-07-29-m2-logic-conformance.md) ·
  [M3 components](docs/2026-07-29-m3-p0-components.md) ·
  [M4 overlays](docs/2026-07-30-m4-overlays-and-the-tabs-thesis-test.md) ·
  [the M4 Storybook review](docs/2026-07-30-m4-followup-storybook-review-before-m5.md) ·
  [M5 rip-deck](docs/2026-07-30-m5-ripdeck-the-first-consumer.md).
- The plan and phasing:
  `agentic/docs/research/2026-07-29-charcuterie-component-library-plan.md`.
- [`docs/previews/`](docs/previews/) — the archived M0 bake-off board, the M1 swap
  measurements, and M3's component boards. Rebuild the bake-off with
  `yarn preview:themes`.

## The three things most likely to get "fixed" by mistake

**`colour` in TypeScript, `--color-*` in CSS.** TS identifiers match `e6Colour` /
`colourMode` in castkit, per the house rule about existing nomenclature. CSS custom
properties must be `--color-*` because Tailwind v4's `@theme` only generates utilities
from that namespace — renaming them produces a stylesheet with no utilities and no
error.

**Light mode is not pure white.** `surface.base` is a warm or cool near-white; `raised`
means *more separated from base*, not *lighter*. Naive light themes fail by making base
`#FFFFFF` and leaving `raised` nowhere to go.

**The logic hooks are uncontrolled and that is the thesis.** `isVisible`, `visibleKey`,
`selectedValue` and friends are *initial* values, read once. Adding a `useEffect` that
syncs a prop back into a core — which is what v1 did — recreates the two-owners problem
the whole state layer exists to avoid, and reintroduces the echo loop.
[Decision](docs/decisions/2026-07-29-logic-hooks-are-uncontrolled.md).
