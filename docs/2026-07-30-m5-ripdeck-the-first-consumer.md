# M5 — rip-deck, the first consumer

**Date:** 2026-07-30
**Branch:** `rip-deck@feat/charcuterie` — **held, not merged**, per
[the `portal:` decision](decisions/2026-07-29-consumers-link-tokens-by-portal-until-publish.md).
The unblock is one dependency line per package once the publish workflow lands; nothing
else in the diff moves.

**Supersedes the plan where they disagree.**

## What the plan asked for, and what happened

| Proof | Result |
| --- | --- |
| `TONE_CLASS` declared zero times | ✅ **0 declarations.** Two remaining string matches are prose in comments naming what was deleted. |
| `aria-*` goes from 9 to meaningful | ✅ Measured on the same fixture and viewport: **18 → 24** attributes, roles `{progressbar: 4}` → `{radiogroup: 1, radio: 5, progressbar: 4}`, and **four unnamed progressbars became four named ones**. |
| rip-deck's net LOC goes **down** | ⚠️ **Code lines: 4097 → 4064 (−33).** Total lines 7297 → 7401 (+104), because the documentation grew. See below — the honest answer is "barely, and that is expected at consumer one". |

Two proofs the plan did not ask for and M5 produced anyway:

- **Hardcoded colour references: 224 → 155** (−31%), and the file count carrying any
  dropped from **17 to 8**. Every file M5 touched is now at zero.
- **Light mode is reachable at all.** One attribute on `<html>`, and the migrated half of
  the page renders correctly in it. Screenshot below; the unmigrated half is the M6 work
  order, itemised.

## The LOC number, said plainly

−33 code lines is a rounding error, and reporting it as a win would be dishonest. Here is
what actually happened:

`ProgressBar.tsx` (47 lines) was deleted outright, two `TONE_CLASS` maps went, the
`<dialog>` markup and four hand-rolled buttons went, and 30 lines of `@keyframes` left the
stylesheet. Against that, every migrated file gained a paragraph explaining what it
delegates and why, `format.ts` gained the one tone→intent map that replaced the two, and
`vite.config.ts`/`vitest.config.ts` gained the `resolve.dedupe` note.

**A component library does not pay for itself on its first consumer.** `Alert` and
`SegmentedControl` cost ~700 lines in `@charcuterie/ui` to save ~120 in rip-deck. That
trade turns positive at castkit (M5b) and decisively at mux-magic (M6), which is where the
993 `*-slate-*` utilities live. Anyone reading this handoff as "the library did not pay
off" is reading consumer one of eight.

What M5 *did* buy immediately is not measured in lines: four progress bars an agent can
address individually, a radiogroup where there was a row of unrelated toggles, and a page
that can have a light mode.

## The library grew, and that was the point

Kevin, mid-milestone:

> *"The goal of Charcuterie is having reusable logic and components that expand as we build
> higher level components."*

So M5 added two components rather than only spending thirteen, on a written bar —
[decision](decisions/2026-07-30-a-consumer-milestone-adds-components.md):

- **`Alert`.** rip-deck spells this shape **four times** — `TowerAlerts`,
  `UsbAlertBanner`, `LoadedDiscsBanner`, `VerdictBadge` — two of them carrying a
  byte-identical `TONE_CLASS`. It is the app's largest single duplication and **no P0
  component is a banner**, so M5 could not have hit its own stated proof without building
  it.
- **`SegmentedControl`.** `SinglePicker` + `RovingFocus` with the panels taken away.

### And `Tabs` moved onto `SinglePicker` first

Kevin, before any of the above:

> *"If we aren't already doing it, tab selection should be using our single selection hook
> for logic."*

We were not. `Tabs` was `VisibilityGroup` + `RovingFocus`; it is `SinglePicker` +
`RovingFocus` now
([decision](decisions/2026-07-30-tab-selection-is-a-single-picker.md), which supersedes the
M4 verdict on that one point).

The swap is **behaviour-identical** — 53 `ui-dom` tests and 78 story mounts stayed green
with no test edited, because the two cores are the same shape by design. That equality is
the finding, not a pass. What it bought is `SegmentedControl`: under the old model a
control that *chooses* something without *revealing* anything had to express its choice as
a group of visibilities it did not have, so rip-deck's `ColumnPicker` hand-rolled its own
state instead. It shares the core now.

## The three packaging holes, and why `portal:` found all three

M1 chose `portal:` over copying the built stylesheet, on the argument that a copy proves
the CSS looks right and never proves the **package resolves**. M5 is that argument's
receipt. All three of these fail *silently*:

1. **Nothing emitted the CSS `color-scheme` property.** It is what the browser reads for
   scrollbars, native controls and the default canvas — a different thing from our
   `data-scheme` attribute. A dark page without it keeps light scrollbars, and **no
   contrast gate can see that**, because none of it is our colour. rip-deck hand-wrote
   `:root { color-scheme: dark }`, and so does every other app in the fleet — which is also
   why none of them can switch scheme without a second edit. Now emitted once,
   variant-independent.
2. **`@charcuterie/ui` declared `react` as a peer and not `react-dom`**, which
   `@floating-ui/react` needs.
3. **`"./tokens.css"` pointed inside the package**, at
   `./node_modules/@charcuterie/tokens/dist/theme.css` — a path that exists only under a
   *nesting* linker. A hoisting one puts tokens at the project root, so the import resolved
   to nothing; a missing CSS `@import` in Tailwind produces no error, no utilities and an
   unstyled app. The export is gone and both READMEs now say both package names out loud.

`Modal` also gained an **`xl`** (56rem): the scale jumped from 42rem straight to the whole
viewport, and rip-deck's capture tail lands in the gap.

## The trap that cost the most, and says nothing about itself

**A `portal:` is a symlink, and both Node and Vite resolve a symlinked module from its
real path.** So a component living at `charcuterie/packages/ui/…` resolves *its own*
`react` by walking up from there, landing on charcuterie's copy while the app's tree
renders with rip-deck's.

Fifty-seven tests went red at once with:

```
TypeError: Cannot read properties of null (reading 'useRef')
```

on the first hook in the first shared component. Nothing in that message mentions symlinks,
linked packages, or React identity. The fix is one line in each Vite config:

```ts
resolve: { dedupe: ["react", "react-dom"] }
```

It stays after publish. It costs nothing when there is only one copy, and it is the
difference between a working `yarn link` session and an hour of confusion.

**`portal:` also needs `resolutions` here, which M1 did not.** `@charcuterie/ui` declares
its siblings as `workspace:*`, and that descriptor cannot resolve outside charcuterie's own
workspace, so rip-deck's root manifest pins them:

```json
"resolutions": {
  "@charcuterie/logic": "portal:../charcuterie/packages/logic",
  "@charcuterie/tokens": "portal:../charcuterie/packages/tokens"
}
```

Bare keys rather than `@charcuterie/ui/@charcuterie/tokens`: the scoped form produced a
*different locator string* from the app's own direct dependency on the same directory, and
Yarn rejected the pair as conflicting.

## What each rip-deck component became

| Was | Is | The thing it fixed |
| --- | --- | --- |
| `TowerAlerts` + its `TONE_CLASS` | `Alert` × n inside the group's own `<section>` | The landmark is the **group**, so the alerts pass no `label` — naming each would put an unpredictable number of landmarks on the page. |
| `UsbAlertBanner` | `Alert label="USB connection alert"` | Exactly one is ever on the page, so it earns a named landmark. |
| `LoadedDiscsBanner` | `Alert intent="info" label=…` | Was hardcoded slate, which said "this is information" by accident. `info` says it on purpose. |
| `VerdictBadge` + its `TONE_CLASS` | `Alert size="sm"`, **no label** | Nine regions named "Part of the tower-wide problem above." is axe's `landmark-unique`. |
| `ProgressBar.tsx` (deleted) | `@charcuterie/ui`'s | Role on the **track** not the fill (a 4% rip was a progressbar 4px wide); a name per slot instead of one shared string; `aria-valuenow` omitted while indeterminate. |
| `ColumnPicker`'s five `<button aria-pressed>` | `SegmentedControl` | `aria-pressed` in a `<fieldset>` is the **toolbar of independent toggles** pattern — nothing in it says the five are mutually exclusive. |
| `LogModal`'s own `<dialog>` + effect | `Modal size="xl"` | Still a native `<dialog>`. What went is the hand-rolled `showModal()`/`close()` sync — the self-owning-control problem the state layer exists to resolve. |
| `TrayToggle`'s `<button>` | `IconButton` | `label` is a **required string**. Its amber `className` became `intent="warning"`. |

## Screenshots

In [`rip-deck/__screenshots__/`](../../rip-deck/__screenshots__/):

- `2026-07-30-m5-before-dashboard.png`, `2026-07-30-m5-before-hub-fault.png`
- `2026-07-30-m5-after-hub-fault.png` — the same fixture, after
- `2026-07-30-m5-after-log-modal.png` — `Modal` at `xl`, with the scrim and the focus ring
- `2026-07-30-m5-after-light-mode.png` — **the interesting one**

## Still open, and itemised

### rip-deck's light mode is half-done, and the list is exact

`data-scheme="light"` renders the migrated half correctly and leaves the rest dark —
including two headings that go dark-on-dark. That is not a bug in the swap; it is the
**155 hardcoded colour references M5 did not touch**, in eight files:

| Count | File |
| --- | --- |
| 57 | `components/RipCard.tsx` |
| 26 | `components/HeldBayCard.tsx` |
| 21 | `components/QuarantinedBayCard.tsx` |
| 17 | `components/TrayControls.tsx` |
| 15 | `components/DriveRail.tsx` |
| 12 | `components/HostSection.tsx` |
| 5 | `components/Dashboard.tsx` |
| 2 | `components/DashboardHeader.tsx` |

These are the card chrome and the action buttons — `Card` and `Button` work, so this is
mechanical rather than novel. It is the same class of work as M6's mux-magic migration and
belongs with it.

### Not done, deliberately

- **`Card` was not adopted.** `RipCard`, `HeldBayCard` and `QuarantinedBayCard` each carry
  a container-query accordion contract (`@container/bay`, `@max-md/bay:`) that is
  rip-deck's own and predates the library. Swapping the wrapper without that conversation
  would have quietly changed the one layout behaviour the owner asked for by name.
- **No `Toast`.** `Alert` deliberately does not announce; a thing that interrupts you is
  M6's.
- **The `Badge`/`Spinner`/`EmptyState` opportunities** in `DriveRail` and the empty-tower
  state were left for the same M6 pass.

### Ordinary caveats

- The branch is **held**. It is correct on exactly this machine until the packages publish.
- `@charcuterie/ui`'s barrel pulls `@floating-ui/react` in through `Popover`. rip-deck uses
  neither, and the production bundle is 288 KB / 89 KB gz. If that matters later, the
  `"./src/*"` export exists for exactly this.
- **No fixture sets `logfile`**, so `LogModal` is unreachable in mock mode. Its six jsdom
  tests cover it; the browser check needed a throwaway worktree with one line patched.

## A note for the next session in this repo

**Another agent was working in `rip-deck` concurrently during M5**, on a
loaded-discs-from-the-bay-ledger feature (`daemon/rip/loadedDiscs.ts`, `api/snapshot.ts`,
`api/towerView.ts`, `main.ts`, `rip/trayCommand.ts`, `rip/watcher.ts`,
`web/src/api/mockDataSource.ts`, `web/src/types.ts`, `web/src/components/HostSection.tsx`,
and a new `web/src/components/ClearLoadedButton.tsx`). Its work is **uncommitted and
mid-edit** — `shouldPublishLoadedDiscs`'s "refuses to publish a blind all-clear" test was
red at the time, and `mockDataSource.ts` did not typecheck.

**Nothing in M5's commits touches any of those files.** Every commit staged its paths
explicitly, and the full gate set was run in a **detached worktree at M5's own commit** so
that the in-flight work was neither disturbed nor counted. `yarn typecheck` in the shared
tree will fail on their file until they finish; that failure is not M5's.
