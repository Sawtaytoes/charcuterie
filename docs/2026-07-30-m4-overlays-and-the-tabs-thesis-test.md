# M4 — the overlays, and the state layer's falsification test

`Modal`, `Popover`, `Tabs`. The plan gated this milestone on one question, in its own
words:

> **Tabs is the falsification point** — it needs Visibility + VisibilityGroup +
> RovingFocus + linked ids at once. This, not duplication, is why it's P0. If Tabs is
> ugly, stop and reconsider the state layer before building fifteen more components.

**It is not ugly.** The verdict and its reasoning are in
[the state-layer decision](decisions/2026-07-30-state-layer-is-charcuterie-on-floating-ui.md);
this is what shipped and what it cost.

## What shipped

Three components, each `Component.tsx` + `.stories.tsx` + `.mdx`, colour from
`intentStyles.ts`, sizing from `controlStyles.ts`.

| | |
| --- | --- |
| `Modal` | Native `<dialog>` + `showModal()`. Four sizes, `isDismissable`, footer slot, counted scroll lock. |
| `Popover` | `popover="manual"` + `@floating-ui/react` for collision handling, dismiss, and focus. Trigger is cloned, not wrapped. |
| `Tabs` | `VisibilityGroup` + `RovingFocus`, horizontal or vertical, `automatic` or `manual` activation. |

One new dependency, and only one: **`@floating-ui/react` 0.27.20** (MIT, UK/US
provenance — clears the house rule, and the plan had flagged it for vetting).

**Gates:** 306 tests workspace-wide, measured per project — **81** stories in chromium
with axe at `test: "error"`, each calling `expectAgentDrivable`; **24** React/Preact
conformance tests, also in chromium; **201** in Node (tokens 113, logic 56, ui 26,
eslint-config 6). Typecheck, lint, and the WCAG contrast gate clean, and
`smoke:storybook` green across **96 entries** (81 stories + 15 docs pages).

## The composition, which is the whole result

```ts
const panels = useVisibilityGroup({ visibleKey: initialKey })  // which panel shows
const focus = useRovingFocus({ activeValue: initialKey })      // which tab is tabbable

// `automatic` activation is this line. `manual` is its absence.
if (activation === "automatic") panels.show(focus.activeValue)
```

One line is the entire difference between the two ARIA activation modes, and it is only
that small because **focus and selection are separate kinds**. In `manual`, focus sits on
a tab whose panel is not showing — a state the talk's original three-kind model cannot
represent. `RovingFocus` earning its place as kind five is now demonstrated rather than
argued.

## Four bugs the gates found, and where each one was hiding

**1. A roving group had zero tab stops on its first paint.** Members register from an
effect, so on the very first render `activeValue` was null with nothing registered — every
tab scored `tabindex="-1"`, which is a tab bar Tab cannot enter. `VisibilityGroup` had the
same shape of hole: `visibleKey` null, so no tab selected and no panel shown. Both lasted
a frame *only because a re-render always followed*.

The fixes went to different layers deliberately. `selectTabIndex` now falls back to
`pendingValue` **while nothing has registered**, because that selector *is* the roving
rule and every consumer needs it right. `Tabs` reads `visibleKey ?? pendingKey` itself,
because the core distinguishes those two on purpose — `selectIsKeyPending` exists so a
`Modal` can decide whether to render children at all.

Only `smoke:storybook` saw either. The isolated story runner gave the effects enough time
by accident; the production build did not.

**2. `expectAgentDrivable` was wrong about roving groups.** M3's own helper rejected every
tab: *"has a negative tabindex, so it can be clicked but never reached with Tab."* Right
for a standalone button, wrong for a tab. The rejection was **replaced by the roving rule
itself** — inside a composite widget, exactly one enabled member may be tabbable. Zero
strands it; several mean the pattern was never implemented. `Tabs`' `AllStates` proves the
failing half too, with a four-line stub standing in for the canvas, because `AgentQueries`
is structural precisely so that it can.

**3. Storybook was running against a `dist` three commits old.** The most expensive one.
`packages/docs` imports `@charcuterie/tokens/theme.css` and `@charcuterie/logic`, both of
which resolve to `dist`, and nothing rebuilt them. A token added that afternoon simply did
not exist in the canvas; a `logic` fix had no effect at all while its own node tests were
green. `yarn build` now runs first, and
[freshness is a red test](decisions/2026-07-30-storybook-reads-the-built-dist.md).

**4. A story that passed for the wrong reason.** `Modal`'s scrim assertion was "the
`::backdrop` colour is not transparent" — and Chromium's own `::backdrop` is
`rgba(0, 0, 0, 0.1)`, so it stayed green against the stale build where `bg-scrim`
generated no CSS whatsoever. It now compares against the token's **resolved** value
through a probe element. Worth stating plainly: the loose assertion was written *by this
milestone*, in this repo, three hours before it was caught.

## Decisions recorded (4)

- [The state layer is Charcuterie's model on floating-ui](decisions/2026-07-30-state-layer-is-charcuterie-on-floating-ui.md)
  — the plan's last open architecture question, and the Tabs verdict that settles it.
- [Overlays reach the top layer through the platform, never a portal](decisions/2026-07-30-overlays-use-the-top-layer-not-a-portal.md)
  — because a portal moves the node out of the element an agent scoped its queries to.
- [The modal scrim is its own token role](decisions/2026-07-30-scrim-is-its-own-token-role.md)
- [Storybook reads the built `dist`, so the build runs first](decisions/2026-07-30-storybook-reads-the-built-dist.md)

## Two limits worth carrying forward

**A story cannot press Escape.** `play`'s `userEvent` is
`@testing-library/user-event`, which dispatches **untrusted** events, and a browser runs a
default action only for trusted input. A synthetic Escape does not make a native
`<dialog>` fire `cancel` — it does nothing at all, so "Escape did not close the
non-dismissable dialog" would pass for the wrong reason forever. `Modal`'s stories
dispatch the close request where the browser would raise it, and pair it with a
differential: the dialog that refuses the request is then closed by its own button.
`Popover` is unaffected — `useDismiss` listens for a keydown rather than relying on a UA
default action, so its `Interactive` story presses Escape for real.

**One lint suppression, the first in the package.** `useKeyWithClickEvents` fires on
`Modal`'s backdrop-press handler. The keyboard route is the `onCancel` immediately above
it, which Biome cannot see; pairing the click with an `onKeyDown` would duplicate a close
request the browser already routes correctly, including deciding which of two stacked
dialogs it belongs to. The reason is written out at the suppression.

## Notes for whoever builds the next overlay

`Drawer`, `Menu`, `Tooltip`, and `ConfirmDialog` are all the same two mechanisms —
`<dialog>` or `popover="manual"` — plus floating-ui for anything that has to be positioned
against an anchor. What to copy:

- **`TabTrigger` is the shape of a registering member.** Its own file not for style but
  because both registrations are effects, and an effect cannot run in a loop.
- **Registration is membership.** A disabled tab joins the panel group and stays out of
  the focus group; nothing in `RovingFocus` knows the word "disabled".
- **`useClonedChild` for triggers.** `Popover` clones the button you already have; an
  extra `<div>` around it is how a toolbar's layout quietly changes.
- **Check the first paint.** Two of this milestone's four bugs were "the state is empty
  before the effects run". Any new component built on a registering kind should be
  looked at in the built Storybook, not only in the isolated runner.

## Next: M5

First consumer — **ripdeck**. Smallest React 19 + Tailwind v4 app, already has
per-component tests, contains the exact target duplication (doubled `TONE_CLASS`, a
ProgressBar, and a native-`<dialog>` `LogModal` this milestone's `Modal` was built to
replace), and is on Forgejo, so it proves the harder half of the release story.
