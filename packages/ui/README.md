# `@charcuterie/ui`

The components. Look from `@charcuterie/tokens`, state from `@charcuterie/logic`, and ARIA
that Playwright and an AI agent can actually drive.

M3 ships the **P0 pure-presentation** set: `Spinner`, `Skeleton`, `Button`, `IconButton`,
`Badge`, `ProgressBar`, `EmptyState`, `Card`, `LiveStatusIndicator`, `MediaTile` — plus
`VisuallyHidden`, which the first three of those need. No overlays, no floating-ui, no
`Tabs`: those are M4.

## Install and wire

```ts
import { Button, Card } from "@charcuterie/ui"
```

```css
@import "tailwindcss";
@import "@charcuterie/tokens/theme.css"; /* colours, type ramp, radii, motion */
@import "@charcuterie/ui/styles.css";    /* the four looping affordances */

@source "../node_modules/@charcuterie/ui/dist";
```

That last line is not optional. Tailwind v4 scans **source text** for complete class
strings, and it does not scan your dependencies by default — without it every component
renders unstyled, with no error.

Tokens are re-exported at `@charcuterie/ui/tokens`, so a React consumer never installs two
package names. The testing gates are at `@charcuterie/ui/testing`.

## How a component is put together

| Layer | Where it comes from |
| --- | --- |
| Colour | `intentStyles.ts` — six intents x four appearances, written out in full |
| Size | `controlStyles.ts` — `h-(--control-height-md)`, so `[data-density]` decides |
| Type | `text-sm`/`text-md`/`text-lg`, which are **ours**: `theme.css` bridges `--text-*` onto the density-scaled `--font-size-*` |
| Motion | `styles.css`, at `--duration-loop-*`, switched off under `prefers-reduced-motion` |
| State | `@charcuterie/logic` — `useUniqueId` for label wiring, `useStatus` for `MediaTile`'s three image states |

**Class names are never interpolated.** `` `bg-intent-${intent}-solid` `` generates nothing
at all and fails silently, so `intentStyles.ts` is 48 literals rather than a loop, and
`tailwindCandidates.test.ts` compiles every literal in the package through the real Tailwind
and fails on any candidate Tailwind cannot generate.

## Tests

```bash
yarn vitest run --project ui         # Node: class maps, status switches, clamping, boundaries
yarn vitest run --project storybook  # chromium: every story, every play, axe at test: "error"
```

The DOM half lives in story `play` functions rather than in `*.test.tsx`, on purpose —
[decision](../../docs/decisions/2026-07-29-stories-are-the-dom-test-surface.md). Every
component's play calls `expectAgentDrivable(canvas, { role, name })`, which is the same
query an agent will write; `data-testid` appears nowhere in this package and a test enforces
that.

## Adding a component

1. `src/<Name>/<Name>.tsx`, `.stories.tsx`, `.mdx` — siblings, matching mux-magic.
2. Colours from `intentStyles.ts`, sizes from `controlStyles.ts`. No hex, no `*-slate-*`
   (a test checks).
3. The five stories: `Default`, `AllVariants`, `AllStates`, `Responsive` (three container
   widths, via `ContainerBoard`), `Interactive` (the complete keyboard path).
4. Export from `src/index.ts` — the one sanctioned barrel. Components import each other
   directly, never through it.
