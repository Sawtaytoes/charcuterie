# M3 — `@charcuterie/ui`, and what "the story is the test" bought

**Date:** 2026-07-29
**Branch:** `v2`
**Status:** Landed. M4 (overlays + the `Tabs` thesis test) is next.

M3's stated proof, from the plan:

> P0 pure presentation: Spinner, Skeleton, Button, IconButton, Badge, ProgressBar,
> EmptyState, Card, LiveStatusIndicator, MediaTile. Zero behaviour deps → lands fast, erases
> the largest duplication. **Proof: full story set + a11y `error` + agent-drivability test
> on each.**

Delivered, plus `VisuallyHidden` — `Spinner`, `ProgressBar`, and `LiveStatusIndicator` all
need it, and stubbing it three times was the alternative.

---

## What runs

| | |
| --- | --- |
| `--project ui` (node) | **25** across 4 files, ~600 ms |
| `--project storybook` (chromium) | **65** stories, every one with a `play`, axe at `test: "error"` |
| Whole workspace | **277 passing**, 12 skipped (the `.mdx` docs pages) |
| Components | 11 `.tsx` + 11 `.stories.tsx` + 11 `.mdx` |

```bash
yarn vitest run                       # everything
yarn vitest run --project ui          # node: class maps, switches, clamping, boundaries
yarn vitest run --project storybook   # chromium: stories, plays, axe
yarn build:storybook
```

**The M2 handoff's Playwright note is now stale — ignore it.** `PLAYWRIGHT_BROWSERS_PATH` is
`/opt/pw-browsers`, which now ships **both** chromium 1234 and
`chromium_headless_shell-1234`; `~/.cache/ms-playwright` no longer exists. The override that
M2 needed makes the run fail today. No env var, no flags.

Also corrected: M2's doc reports 75 node tests for `--project logic`. The measured figure is
**54**, unchanged by this milestone.

## The ten (eleven), and what each one erases

| Component | Replaces | The bit that is not obvious |
| --- | --- | --- |
| `Button` | 7 repos' primary/secondary/danger/ghost | `type="button"` default; `isLoading` keeps the label and goes `aria-busy`; two sizing modes so `IconButton` is not a specificity coin-flip |
| `IconButton` | 3 repos, 3 strategies, **0 names** | `label` is required and becomes `aria-label`. That single line is the component |
| `Spinner` | **nothing — 0 exist fleet-wide** | Live region *and* named (see the ADR); stops under `prefers-reduced-motion` and still reads |
| `Skeleton` | **nothing — 0 exist** | `aria-hidden` is the contract; the story asserts it has no roles at all |
| `Badge` | rip-deck's `TONE_CLASS`, declared twice | No role, no hover — `INTENT_HOVER_CLASS` is opt-in so a verdict pill cannot imply it is clickable |
| `ProgressBar` | 5 repos, 1 with ARIA | Role on the **track**, not the fill; `aria-valuenow` omitted while indeterminate; clamping is a tested pure function |
| `EmptyState` | 6 repos, 11+ copies | No `variant` enum, on purpose; the heading is the agent handle |
| `Card` | 5 repos | A heading makes it a `region`, which is how an agent says *which* bay's "Start" it means |
| `LiveStatusIndicator` | 4 repos, all collapsing `connecting`/`reconnecting` | Wording and colour from exhaustive switches over `connectionTransitions` |
| `MediaTile` | 3 repos | Three image states as a `useStatus` machine — including the **cached** one, where a `complete` image never fires `load` |
| `VisuallyHidden` | — | `sr-only`; nothing to own, and everything else needs it |

## Two real bugs the gates found before anyone looked at a screen

**1. A `role="status"` region takes no accessible name from its content.** `Spinner` and
`LiveStatusIndicator` announced correctly and were unfindable —
`getByRole("status", { name: "Loading…" })` matched nothing. axe is silent about this; the
markup reads fine. Found by `expectAgentDrivable` on the first Storybook run.
[ADR](decisions/2026-07-29-status-regions-carry-an-aria-label.md)

**2. A container query cannot query the element that declares it.** `EmptyState` shipped
`@container … cq-md:px-8` on one `<div>` and simply never gained its wider padding. Valid
classes, real generated CSS, no error. Now a Node assertion in `sourceRules.test.ts`, which
promptly caught a second instance in a story I had just written.
[ADR](decisions/2026-07-29-container-query-variants-are-generated.md)

Also found: **duplicate `<section>` names are an axe `landmark-unique` violation**, which
three `Card` stories hit. A screen-reader user navigating by landmark gets two "Bay 3"
regions and no way to tell them apart — so it is a finding, not a test technicality, and it
is why `ContainerBoard` takes a function form.

## The gate that makes utility classes safe

`tailwindCandidates.test.ts` walks every `.tsx`/`.ts` in the package with the TypeScript AST,
collects every class literal from `className` attributes, `toClassName(…)` arguments, and
`*_CLASS` maps, and compiles them through the **real Tailwind**
(`__unstable__loadDesignSystem`, design system built in memory from the tokens generator).
`candidatesToCss` returns `null` for anything Tailwind cannot generate, and any `null` fails
the test with the class and the file.

It asserts three things:

1. **No interpolated class names** — `` `bg-intent-${intent}-solid` `` is refused at the AST
   level. This is why `intentStyles.ts` is 48 literals instead of a loop.
2. **Every literal resolves** — 250-odd candidates, including
   `focus-visible:outline-(length:--focus-ring-width)` and `cq-sm:flex-row`.
3. **The token bridges are load-bearing** — the same five candidates must **fail** against
   bare Tailwind. If they resolve without our theme, the components are not reading our
   tokens.

That closes the one failure mode invisible in a browser *and* in a screenshot: Tailwind
silently generating nothing, and the element rendering unstyled.

## Tokens changed, because M3 needed the rest of the layer

Two additions to `@charcuterie/tokens`, both generated, both pinned by tests:

- **Five `@theme` bridges** — `--text-*`, `--leading-*`, `--shadow-*`, `--ease-*`,
  `--spacing` — so components write ordinary `text-sm` / `shadow-low` / `p-3` and get *our*
  density-aware values. [ADR](decisions/2026-07-29-theme-css-bridges-tailwind-namespaces.md)
- **`cq-xs` … `cq-xl` custom variants**, emitted with literal thresholds from
  `containerQuery`, because a container query's condition cannot be a `var()`.
  [ADR](decisions/2026-07-29-container-query-variants-are-generated.md)

`@charcuterie/biome-config` also enables `css.parser.tailwindDirectives`, without which
Biome cannot parse `@source`.

## Where the DOM tests are

**In the stories.** No `*.test.tsx`, no jsdom, no second rendering stack —
[ADR](decisions/2026-07-29-stories-are-the-dom-test-surface.md). Every component's `play`
calls `expectAgentDrivable(canvas, { role, name })`, shipped from `@charcuterie/ui/testing`
with zero dependencies so consumers can use it on their own components. It refuses absence
*and* ambiguity, checks the element is not inside an `aria-hidden`/`inert` subtree, rejects a
`data-testid` in the subtree, and rejects a negative tabindex on a natively-interactive
element. `expectHiddenFromAgents` is the inverse, for `Skeleton`.

The node project holds what stories cannot see: the Tailwind candidates, the exhaustive
status switches (`statusIntent.test.ts`, including `getUnreachableStates` on all three
machines), the progress arithmetic (`-1`, `101`, `NaN`, `0 of 0`), and `sourceRules.test.ts`
— no `data-testid`, no tier-1 colours or hexes, no self-querying containers, one barrel,
and the **`tokens ← logic ← ui`** dependency direction the plan wanted CI-enforced.

## Answers to open questions

**`storybook-addon-pseudo-states` with Storybook 10?** Yes — `10.5.5`, version-matching the
installed Storybook exactly. Installed and used: `Button`/`IconButton`'s `AllStates` force
hover and active by selector, so a hover colour can actually be reviewed. No
`data-force-state` fallback needed.

**Is `test: "error"` real?** Yes, and it earns its keep: it failed three `Card`/`Skeleton`
stories over `landmark-unique` before any of this was looked at.

## Consumed from M2, and how it went

- `useUniqueId` wires `ProgressBar`'s `aria-labelledby` and `Card`'s heading id. Note it
  takes an *existing id*, not a prefix — `useUniqueId("progress-label")` returns that
  literal string and collides across instances.
- `useStatus` + `connectionTransitions` drive `LiveStatusIndicator`; `asyncTransitions` drive
  the `Badge` story's live board; `MediaTile` defines its own three-state machine in
  `mediaStatus.ts`, which is the pattern `statusMachines.ts` prescribes for
  domain-specific lifecycles.
- `assertNeverStatus` is what makes `statusIntent.ts` stop compiling when a state is added —
  the concrete payoff of Status being a kind rather than a `Record<string, string>`.
- Nothing needed `RovingFocus`, `Visibility`, or the pickers. Those are M4.

## What M3 does not do

No overlays, no `@floating-ui/react`, no `Tabs`, no `Portal`, no `Slot`. No Satori
implementations (M5b). No visual regression — still deliberately deferred until tokens stop
moving, per the plan. Nothing is published; `mux-magic@feat/charcuterie-tokens` is still held
behind the [`portal:` decision](decisions/2026-07-29-consumers-link-tokens-by-portal-until-publish.md).

`Button` accepts `className`, which a consumer can use to reach past the token layer. The
lint rule that stops the worst of it (`pl-`/`mr-`/`text-left`) ships in
`@charcuterie/eslint-config` and applies in the consumer's repo, not here.

## Follow-up, same day

The owner reviewed the served build and found three things these gates could not see —
every docs page throwing `Illegal invocation`, every Markdown table rendering as literal
pipes, and a card collapsed to one word per line by a shrink-to-fit story cell. Fixed,
with a new `yarn smoke:storybook` gate that navigates rather than mounts:
[M3 follow-up](2026-07-29-m3-followup-the-docs-site-was-broken.md).

## Next: M4

Modal on native `<dialog>`, Popover, and **Tabs — the falsification point**. Tabs needs
Visibility + VisibilityGroup + RovingFocus + linked ids at once; if it comes out ugly, stop
and reconsider the state layer before building fifteen more components.

What M4 will want from here: `FOCUS_RING_CLASS` and `DISABLED_CLASS` in `intentStyles.ts`,
`CONTROL_SIZE_CLASS` for tab triggers, `expectAgentDrivable` for the keyboard contract, and
the `useClonedChild` that M2 ported and nothing has used yet. The v1 component files worth
reading first are listed in the [M2 handoff](2026-07-29-m2-logic-conformance.md) with the one
`git show` that retrieves each.

## Boards

Served for review at `devshare 7331 "charcuterie-m3-components"` during this session;
promoted stills in [`previews/`](previews/):

| | |
| --- | --- |
| `2026-07-29-m3-button-all-variants-dark.png` | Six intents x four appearances, all from tokens |
| `2026-07-29-m3-card-all-states-dark.png` | Landmark cards, actions, footer, `padding=none` |
| `2026-07-29-m3-mediatile-grid-dark.png` | Poster grid at `cq-lg` (6 across), including a failed tile that keeps its box and its name |
| `2026-07-29-m3-progressbar-all-states-light.png` | Light scheme: thresholds, indeterminate sweep, `value=-5, max=0` |
| `2026-07-29-m3-livestatus-kiosk-dark.png` | Kiosk density; `connecting` blue vs `reconnecting` amber |
