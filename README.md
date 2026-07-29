# Charcuterie

Shared tokens, state logic, and components for the app fleet — so UI is edited in one
place and every app inherits look, behaviour, and accessibility.

> **This is the `v2` branch.** v1 — the Children-First React state library from
> [this talk](https://www.youtube.com/watch?v=n62Pc4KV4SM) — lives on `master` and still
> works. Its source is parked at `packages/logic/src` for M2 to port; nothing imports it
> yet, and it is excluded from every gate until then.

## Packages

| Package | Status | Contents |
| --- | --- | --- |
| [`@charcuterie/tokens`](packages/tokens/README.md) | **live** | Token source of truth + generated CSS/JSON. Zero deps, no React. |
| [`@charcuterie/biome-config`](packages/biome-config/README.md) | **live** | Shared Biome settings as an extends-target. |
| [`@charcuterie/eslint-config`](packages/eslint-config/README.md) | **live** | The rules Biome cannot express. |
| [`@charcuterie/docs`](packages/docs/README.md) | **live**, private | Storybook host. |
| `@charcuterie/logic` | M2 | Framework-free state cores + React/Preact bindings. |
| `@charcuterie/ui` | M3 | Components; re-exports tokens at `@charcuterie/ui/tokens`. |
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
```

Yarn 4, `node-modules` linker, TypeScript 6, Vitest 4, Biome 2, ESLint 10 — matching
`mux-magic`, the reference app for every convention here. Copy its conventions rather
than inventing new ones.

Storybook's browser-mode tests need a matching chromium; in the agent sandbox see the
Playwright note in [`packages/docs/README.md`](packages/docs/README.md).

## Where the reasoning lives

- [`docs/decisions/`](docs/decisions/README.md) — settled calls, newest first. **Check
  here before proposing a change**; a decision on file overrides a default instinct, and
  a past one is superseded by a new dated file rather than edited.
- The plan and phasing:
  `agentic/docs/research/2026-07-29-charcuterie-component-library-plan.md`.
- [`docs/previews/`](docs/previews/) — the archived M0 bake-off board and its
  screenshots. Rebuild with `yarn preview:themes`.

## The two things most likely to get "fixed" by mistake

**`colour` in TypeScript, `--color-*` in CSS.** TS identifiers match `e6Colour` /
`colourMode` in castkit, per the house rule about existing nomenclature. CSS custom
properties must be `--color-*` because Tailwind v4's `@theme` only generates utilities
from that namespace — renaming them produces a stylesheet with no utilities and no
error.

**Light mode is not pure white.** `surface.base` is a warm or cool near-white; `raised`
means *more separated from base*, not *lighter*. Naive light themes fail by making base
`#FFFFFF` and leaving `raised` nowhere to go.
