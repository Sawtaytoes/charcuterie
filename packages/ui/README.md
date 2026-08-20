# `@charcuterie/ui`

The components. Look from `@charcuterie/tokens`, state from `@charcuterie/logic`, and ARIA
that Playwright and an AI agent can actually drive.

M3 ships the **P0 pure-presentation** set: `Spinner`, `Skeleton`, `Button`, `IconButton`,
`Badge`, `ProgressBar`, `EmptyState`, `Card`, `LiveStatusIndicator`, `MediaTile` — plus
`VisuallyHidden`, which the first three of those need. M4 adds the overlays: `Modal`,
`Popover`, `Tabs`.

**M5 adds two, and they came from the first consumer rather than from the plan** —
[the rule](../../docs/decisions/2026-07-30-a-consumer-milestone-adds-components.md):

- **`Alert`** — rip-deck spells this shape four times, two of them carrying a
  byte-identical `TONE_CLASS` map of hardcoded hexes. It is the app's largest single
  duplication and no P0 component is a banner.
- **`SegmentedControl`** — `SinglePicker` + `RovingFocus` with the panels taken away, which
  is a composition that could not be expressed until
  [`Tabs` moved onto `SinglePicker`](../../docs/decisions/2026-07-30-tab-selection-is-a-single-picker.md).

**M6a ships the nine P1 components**: `Select`, `Field`, `Accordion`, `LogViewer`, `Menu`,
`Tooltip`, `SortableTableHeader`, `Toast` (with `ToastRegion`), and `FileDropZone`. Twenty
five components in all. Four of them changed rules this package had already written down —
a menu is [named by its trigger](../../docs/decisions/2026-07-31-a-menu-is-named-by-its-trigger.md),
an accordion panel is [a `group` rather than a landmark](../../docs/decisions/2026-07-31-an-accordion-panel-is-a-group-not-a-landmark.md),
[`Select` owns no state at all](../../docs/decisions/2026-07-31-select-is-uncontrolled-because-the-platform-owns-the-value.md),
and [not every boolean is a state kind](../../docs/decisions/2026-07-31-not-every-boolean-is-a-state-kind.md).
Full write-up: [M6a handoff](../../docs/2026-07-31-m6a-the-p1-components.md).

**The link family** — `TextLink` and `ButtonLink` — closes the gap that had seven repos
hand-rolling a `←` back-link, plex-channels navigating with
`<button onClick={() => navigate(…)}>`, and mux-magic reloading the page through 14 raw
`<a href>`. Buttons are for on-page actions; links are for navigation, and both of these
render a real `<a href>` so middle-click, ctrl-click, open-in-new-tab and copy-link-address
work. They differ in **paint, not semantics**
([decision](../../docs/decisions/2026-08-10-buttons-are-actions-links-are-navigation.md)).
The router is **injected** rather than depended on — `RouterLinkProvider` at the app root,
with `@charcuterie/ui/react-router` as an optional subpath adapter and a plain `<a>` when
nothing is provided. Recipe: **Guides/Routing** in Storybook.

**`Board` is the first component whose own operation is a write**, and the first to declare
two nested containers. Lanes with honest counts, priority bars, per-card footers for a live
run line, real empty states and a `+ n more` overflow — the board's own box decides how many
lanes are on screen, each lane's box decides whether a card is two lines, one line, or a card.
There is **no media query in it**, because a lane in a three-up board is ~500px on a maximised
1600px window and a browser at 175% zoom reports ~860 effective pixels for a 1500px one.
Moving a card takes **no drag-and-drop dependency**: one handle per card, a `Menu` of the
other lanes as the primary path, Pointer-Event dragging at 1.4 KB gzip beside it
([decision](../../docs/decisions/2026-08-19-the-board-owns-the-move-and-takes-no-drag-and-drop-dependency.md)).

**The unified app shell adds four**: `Shell`, `Header`, `Rail`, `Main` — the fleet's largest
single duplication, where ten of twelve UI repos hand-roll the page chrome and three of them
have a file named `AppShell.tsx` (two of those headers are a *byte-identical* class string,
arrived at independently). One `contentWidth` on `Shell` feeds both the header row and the
content column, `isSticky` writes `position` and `z-index` together, and a `Rail` collapses
by restyling rather than by rendering itself twice.
[Decision](../../docs/decisions/2026-08-10-the-app-shell-is-shell-header-rail-main.md);
`Shell`'s docs page carries three copy-wholesale templates.

## Install and wire

```ts
import { Button, Card } from "@charcuterie/ui"
```

```css
@import "tailwindcss";
@import "@charcuterie/tokens/theme.css"; /* colours, type ramp, radii, motion */
@import "@charcuterie/tokens/fonts.css"; /* Baloo 2, Outfit, Victor Mono */
@import "@charcuterie/ui/styles.css";    /* the four looping affordances + `.charcuterie-scrollbar` */

@source "../node_modules/@charcuterie/ui/dist";
```

That last line is not optional. Tailwind v4 scans **source text** for complete class
strings, and it does not scan your dependencies by default — without it every component
renders unstyled, with no error.

**Both package names, and the CSS line above is why.** The token *types and values* are
re-exported at `@charcuterie/ui/tokens`, so your TypeScript only ever names one package —
but the *stylesheet* is imported from `@charcuterie/tokens` directly. A `./tokens.css`
export pointing inside this package resolved to nothing on the first real consumer, because
a hoisting linker puts `@charcuterie/tokens` at the project root rather than in here, and a
CSS `@import` that misses fails **silently**: no error, no utilities, an unstyled app.

The testing gates are at `@charcuterie/ui/testing`.

### While the packages are unpublished: three lines, and you need all three

A consumer links by `portal:` until this publishes
([decision](../../docs/decisions/2026-07-29-consumers-link-tokens-by-portal-until-publish.md)).
M5 spent an hour on the second and third of these, so M5b and M6 do not have to:

```jsonc
// the app package
"dependencies": {
  "@charcuterie/tokens": "portal:../../../charcuterie/packages/tokens",
  "@charcuterie/ui": "portal:../../../charcuterie/packages/ui"
}

// the PROJECT ROOT — `ui` declares its siblings as `workspace:*`, and that
// descriptor cannot resolve outside charcuterie's own workspace. Bare keys, not
// `@charcuterie/ui/@charcuterie/tokens`: the scoped form yields a different
// locator string from the app's own dependency on the same directory, and Yarn
// rejects the pair as conflicting.
"resolutions": {
  "@charcuterie/logic": "portal:../charcuterie/packages/logic",
  "@charcuterie/tokens": "portal:../charcuterie/packages/tokens"
}
```

```ts
// vite.config.ts AND vitest.config.ts
resolve: { dedupe: ["react", "react-dom"] }
```

**That last one is the expensive one.** A `portal:` is a symlink, and Node and Vite both
resolve a symlinked module from its **real path** — so a component living in this package
resolves *its own* `react` by walking up from here, landing on charcuterie's copy while
your app renders with yours. Every component with a hook fails at once with:

```
TypeError: Cannot read properties of null (reading 'useRef')
```

which mentions neither symlinks nor React identity. Keep the line after publish: it costs
nothing with one copy, and it is the difference between a working `yarn link` session and
an hour of confusion.

## How a component is put together

| Layer | Where it comes from |
| --- | --- |
| Colour | `intentStyles.ts` — six intents x four appearances, written out in full |
| Size | `controlStyles.ts` — `h-(--control-height-md)`, so `[data-density]` decides |
| Type | `text-sm`/`text-md`/`text-lg`, which are **ours**: `theme.css` bridges `--text-*` onto the density-scaled `--font-size-*` |
| Motion | `styles.css`, at `--duration-loop-*`, switched off under `prefers-reduced-motion` |
| Scrollbar | `styles.css` — add `charcuterie-scrollbar` to any scrolling element for a token-tinted bar (rounded thumb on Chromium/Safari; thin standard match on Firefox) that flips with `[data-scheme]` |
| State | `@charcuterie/logic` — `useUniqueId` for label wiring, `useStatus` for `MediaTile`'s three image states |

**Class names are never interpolated.** `` `bg-intent-${intent}-solid` `` generates nothing
at all and fails silently, so `intentStyles.ts` is 48 literals rather than a loop, and
`tailwindCandidates.test.ts` compiles every literal in the package through the real Tailwind
and fails on any candidate Tailwind cannot generate.

## Tests

```bash
yarn vitest run --project ui         # Node: class maps, status switches, clamping, boundaries
yarn vitest run --project ui-dom     # chromium: Component.test.tsx — behaviour, keyboard, ARIA
yarn vitest run --project storybook  # chromium: every story renders, axe at test: "error"
```

**Stories are demos and carry no assertions**
([decision](../../docs/decisions/2026-07-30-stories-are-demos-tests-are-tests.md), which
supersedes M3's). The DOM half lives in `Component.test.tsx` beside the component, and each
test mounts the **composed story** through `run()` rather than re-assembling the component —
so there is still only one rendering stack, and the subject of a test is the story a reader
sees.

Every component's test calls `expectAgentDrivable(canvas, { role, name })`, which is the
same query an agent will write; `data-testid` appears nowhere in this package and a test
enforces that.

Axe runs once per mount, when `run()` resolves — i.e. before the test has clicked anything.
A state you had to *drive* to reach (an open dialog, a shown popover) audits itself with
`expectNoAxeViolations(canvasElement)`.

Two rules about the docs panel are tests rather than conventions, because both fail
invisibly: `storyControls.test.ts` (a prop typed from another package needs an explicit
`argTypes` entry, or Storybook renders a `{}` textarea for it) and `mdxReferences.test.ts`
(an `.mdx` may not reference a story that no longer exists — `of` resolves at runtime, so a
rename breaks only the rendered page).

## Adding a component

1. `src/<Name>/<Name>.tsx`, `.stories.tsx`, `.mdx`, `.test.tsx` — siblings, matching
   mux-magic. The story shows it; the test drives it. Neither does the other's job.
2. Colours from `intentStyles.ts`, sizes from `controlStyles.ts`. No hex, no `*-slate-*`
   (a test checks).
3. The five stories: `Default`, `AllVariants`, `AllStates`, `Responsive` (three container
   widths, via `ContainerBoard`), `Interactive` (the complete keyboard path).
4. Export from `src/index.ts` — the one sanctioned barrel. Components import each other
   directly, never through it.
5. **If it is an overlay, portal it to the body** — `FloatingPortal`, through
   `OverlayPanel`, never a hand-rolled `<dialog>` + `showModal()` or `popover="manual"`. The
   top layer wins paint order but is still laid out in place, so a `transform` or
   `overflow: hidden` ancestor still clips a fixed panel; a portal to `document.body` has no
   ancestor to be clipped by
   ([decision](../../docs/decisions/2026-08-03-overlays-portal-to-the-body-not-the-top-layer.md),
   superseding [M4's](../../docs/decisions/2026-07-30-overlays-use-the-top-layer-not-a-portal.md)).
   The old objection stands answered rather than waved: `useRole` writes
   `aria-controls`/`aria-labelledby` across the boundary, and the stories scope panel queries
   to `body`.
6. **If it is built on a registering kind, look at its first paint.** Members register
   from effects, so before those run a `RovingFocus` has no active value and a
   `SinglePicker` / `VisibilityGroup` has no selected key — only a pending one. Two of M4's
   four bugs were exactly that, and the isolated story runner saw neither —
   `yarn smoke:storybook` did.
7. **If it declares `@container`, every `StoryCell` holding it needs `align="stretch"`.**
   `container-type: inline-size` forbids the element from being sized by its own
   contents, so a default (shrink-to-fit) cell collapses it to min-content and every
   line wraps after one word. Valid CSS, no error, nothing for axe to say — it only
   shows up in a screenshot, which is how it shipped in M3's `LiveStatusIndicator`
   board. `sourceRules.test.ts` now derives the container-declaring components from
   source and fails on this, so the component M4 adds joins the rule automatically.
