# Overlays portal to the body, not the top layer

**Status:** Accepted
**Date:** 2026-08-03
**Type:** Architecture
**Supersedes:** [Overlays reach the top layer through the platform, never through a portal](2026-07-30-overlays-use-the-top-layer-not-a-portal.md) (2026-07-30)
**Superseded by:** —

## Decision

Every overlay in `@charcuterie/ui` renders into a `FloatingPortal` at `document.body`:
`Modal`/`Dialog` (via `OverlayPanel`), `Popover`, `Menu`, `Listbox`, `Combobox`, and
`Tooltip`. The top-layer mechanisms — `<dialog>.showModal()` and `popover="manual"` — are
gone. Stacking falls out of portal **append order** at one `--layer-modal` z-index; the
shared backdrop is a single portalled `bg-scrim` node.

`Toast` is exempt and stays a viewport-fixed live region — it is not clipped by overflow
ancestors the way an anchored panel is, and portalling it is churn against its working
stale-node handling.

## Why

The top layer is genuinely elegant — no `z-index`, no portal, the node stays where it was
written. The 2026-07-30 record chose it for exactly those reasons, and its own last
paragraph reserved the right to reverse: *"the day one does not — a floating element that
must escape a transformed ancestor's containing block, say — that component states its case
and supersedes this record."*

That day arrived as **`overflow: hidden` clipping the top layer did not solve.** The top
layer wins `z-index` and paint order, but it is still laid out in place, so a
`transform`/`filter`/`contain` ancestor still establishes a containing block a `position:
fixed` panel is clipped to, and an `overflow: hidden` ancestor still clips it. A portal to
`document.body` has no such ancestor. The fleet hit this repeatedly — mux-magic's
`PortalDropdown`, its most-evolved dropdown, independently reached for `createPortal`, and
its four pickers rendered *behind* modals until it did (`PathPicker` behind
`EditVariablesModal` was a recorded bug).

## The one real objection, answered

The superseded record's decisive argument was that a portal *"moves the node to
`document.body` — out of whatever element a test or an agent scoped its queries to."* That
is real, and it is answered rather than waved off:

- floating-ui's `useRole` **already writes `aria-controls`** on the trigger pointing at the
  panel `id` (and `aria-labelledby` back the other way for a menu/listbox), so the
  trigger→panel link stays followable across the boundary. The tests assert
  `trigger.getAttribute("aria-controls") === panel.id`.
- `expectAgentDrivable` is **structural** — its `AgentQueries` type is satisfied by
  Storybook's `canvas`, by `within(document.body)`, and by `screen` alike — so the helper
  needs **no change**. Only the stories change what they scope to: triggers stay in
  `canvas`, panels move to `body`. `mountStory` now returns `body` and sweeps stale
  `[data-floating-ui-portal]` roots between mounts (the portal analogue of the
  `ToastRegion` fixed-node fix).

## What this buys for free

- **The M4 testing limitation dies.** A story's synthetic `userEvent` cannot fire a native
  `<dialog>`'s trusted `cancel`, so the old `Modal` tests dispatched a fake close request.
  `useDismiss` listens for a plain keydown, so `userEvent.keyboard("{Escape}")` is a real
  close request — already proven in `Popover.test.tsx`.
- **One backdrop for N modals, and real stacking.** The top layer stacked `<dialog>`s but
  gave no shared scrim and no way to dismiss "the innermost only" without racing the focus
  manager. `OverlayStackProvider` renders one scrim, keeps the top live, marks the rest
  `inert`, and gates each panel's `useDismiss` on being the top of the stack.

## Evidence

The fleet already agreed before the library did: mux-magic's `PortalDropdown` reached for
`createPortal`, `zindex-radix-consolidation.md` records the pickers rendering behind modals,
and `PathPicker`-behind-`EditVariablesModal` is a logged clipping bug. `axe` cannot see a
clipped panel — it is valid markup that simply paints off-screen — which is the class of
failure this reverses.

## What stays

`--layer-tooltip` (tooltips above modals) and `--layer-modal` (the backdrop and panels).
`--layer-dropdown`/`--layer-overlay` go vestigial — noted, not ripped out. The
state-ownership rule is unchanged: floating-ui is told `open` and never decides it
([2026-07-30 state-layer record](2026-07-30-state-layer-is-charcuterie-on-floating-ui.md)).
