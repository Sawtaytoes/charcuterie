# Interactive states are audited, not just resting states

**Status:** Accepted
**Date:** 2026-08-10
**Type:** Process
**Supersedes:** —
**Superseded by:** —

## Decision

**The contrast gate measures every state a token can be seen in, not the one it sits in
when nobody is touching it.** Concretely: for every pair `auditScheme` checks in a resting
state, the same foreground is checked against the state variant of that background at the
same threshold. `intent.<name>.onSolid` is measured on `solidHover` as well as `solid`;
`intent.<name>.content` on `surfaceHover` as well as `surface`; `content.onAccent` on
`intent.accent.solidHover` as well as `intent.accent.solid`. 35 gated pairs per scheme
becomes 48.

**Hover moves away from its own label's lightness, never toward it.** A fill whose label is
white deepens on hover; a fill whose label is near-black brightens. This is already what
every light scheme in the repo does — it was only the dark schemes' white-label fills that
brightened, and those are precisely the three that failed. So the rule is a description of
the existing design language, not a new one, and it makes the hovered state *more* readable
than the resting one rather than less.

**A state role that is not classified is a typecheck error, and one that is not paired is a
test failure.** `RESTING_ROLE_BY_INTENT_ROLE` in `contrastAudit.ts` is keyed by every member
of `IntentRole`, mapping each to the resting role it is a state of, or `null`. Adding a
`solidPressed` to that type will not compile until somebody says what it is a state of, and
once they have, `contrast.test.ts` fails until `auditScheme` measures it. The count floor
(`>= 45`) cannot catch this on its own: an audit can grow while a whole *class* of pair
stays invisible, which is exactly what happened here.

ePaper is unaffected — it is [exempt from this gate
entirely](2026-07-31-epaper-is-exempt-from-the-contrast-gate.md), and nothing here reaches
`epaper.ts`.

## Context

`packages/tokens/src/contrastAudit.ts` contained **zero occurrences of the string "hover"**.
It had shipped that way since M0. `yarn check:contrast` printed "All variants clear WCAG 2.2
AA" on every run of the library's life, and it was telling the truth about the question it
was asking — it just never asked about the state a button is in while it is being clicked.

The value that exposed it is `daylight`'s dark-scheme `intent.accent.solidHover`, `#6A64F0`,
against its `onSolid` of `#FFFFFF`: **4.47:1, where WCAG 2.2 AA requires 4.5:1 for normal
text.** `daylight` is the `:root` default. mux-magic and portly-controllers set it
explicitly; every other app in the fleet inherits it. So *every accent button in the fleet
failed AA for as long as a pointer sat on it*, and no gate in the repo could see it.

It surfaced only as a side effect of a test-determinism fix. [PR #68 added a post-mount
settle](2026-08-10-automated-suites-freeze-motion-fonts-and-post-mount-effects.md) because
`storybook-addon-pseudo-states` applies its forced `:hover` a tick after render, so axe was
auditing the resting state on some runs and the hovered state on others. The settle made
that deterministic — which turned an intermittent `color-contrast` failure on `ButtonLink`
into a permanent one. Without that fix the failure would have stayed a flake somebody
eventually retried past.

## Why

- **A gate that cannot see a whole class of state is worse than no gate**, because it is
  reported as a pass. "All variants clear WCAG 2.2 AA" was on screen the entire time the
  fleet's default button was failing it. The single colour is the first casualty of the
  blindness, not the bug.
- **Hover is not a decorative state.** WCAG 1.4.3 has no clause excusing a control while the
  pointer is on it; it is a state the user reads text in, and on a button it is the state
  they read it in immediately before acting.
- **The fix has to be structural or it recurs.** Repairing three hex values leaves the next
  state token — a pressed fill, a selected row — equally invisible. Keying the classification
  map by the whole `IntentRole` union is what makes the next one impossible to add silently.
- **The hover token moves, not the resting colour or the foreground.** Hover is derived from
  the resting value, so it is the derived end that should absorb the correction; moving
  `solid` or `onSolid` would repaint the resting state of every consumer to fix a state
  nobody is in most of the time.
- **Margin, not the line.** All three land between 5.3:1 and 6.2:1 rather than a hair over
  4.5:1, because a value sitting on the threshold re-breaks on any future rounding change —
  which is how `hairline`'s dark `danger.solid` currently sits, at exactly 4.50:1.

## Evidence

The measurement, computed directly from the token source before any change:

| Variant / scheme | Pair | Before | After |
| --- | --- | --- | --- |
| daylight / dark | `intent.accent.onSolid` on `intent.accent.solidHover` | `#FFFFFF` on `#6A64F0` = **4.47:1** | `#FFFFFF` on `#534DD5` = 6.19:1 |
| daylight / dark | `content.onAccent` on `intent.accent.solidHover` | 4.47:1 (same colours, via the alias) | 6.19:1 |
| hairline / dark | `intent.accent.onSolid` on `intent.accent.solidHover` | `#FFFFFF` on `#6D78DC` = **3.91:1** | `#FFFFFF` on `#555FBD` = 5.59:1 |
| hairline / dark | `intent.danger.onSolid` on `intent.danger.solidHover` | `#FFFFFF` on `#E0524C` = **3.83:1** | `#FFFFFF` on `#BD3E39` = 5.37:1 |

`grep -c hover packages/tokens/src/contrastAudit.ts` returned `0` on `master` at `d9b3e7b`.
The gate reported `35 pairs, 0 failing` for all eight (variant × scheme) combinations while
the four rows above were true.

The trail from the flake: `packages/ui/src/mountStory.testHelpers.ts` documents the CI
`color-contrast` failure on `ButtonLink` "reported against `#6A64F0`, the daylight
`solidHover`", and
[the determinism decision](2026-08-10-automated-suites-freeze-motion-fonts-and-post-mount-effects.md)
records the same value: *"`#6A64F0` **is** the daylight `solidHover`."* Both were written
about a *test* problem. The colour was the actual defect, and it had been sitting in
`daylight.ts` since M0.

## What this does not cover, and the number that proves it

Extending the audit surfaced a second hole that this decision deliberately leaves open,
because closing it means moving a **resting** foreground rather than a hover token:

`Listbox`, `Combobox` and `Menu` draw rows with `bg-intent-neutral-surface-hover`, and
`Listbox.stories.tsx` renders `text-content-muted` inside those rows. That pair —
`content.muted` on `intent.neutral.surfaceHover` — fails in four of the eight
variant × scheme combinations (daylight/light 4.26, daylight/dark 4.11, hairline/dark 4.37,
layered/light 4.31), and the *resting* half of it already fails in hairline/light at 4.27.
It cannot be fixed from the hover token: in a dark scheme the row highlight is lighter than
the resting tint, so gaining contrast against light-grey text would mean darkening the
highlight past the tint it is supposed to be a hover of.

It is a real failure and it needs its own change, moving `content.muted` (or the neutral
tint ramp) with the VRT churn that implies. It is recorded here so that the next person to
read "the gate is green" knows exactly which pair it is still not being asked about.

> **Closed the same day** by
> [`content.muted` is strengthened so the highlighted option row clears
> AA](2026-08-10-content-muted-is-strengthened-so-the-highlighted-option-row-clears-aa.md),
> which moved `content.muted` — the foreground, as predicted above — in six of the eight
> combinations. That change also found this section **understated** the hole: extending the
> audit structurally rather than adding the one pair named here turned up **12** failures,
> including `content.muted` on the *selected* row (`intent.accent.surface`) and on
> **`surface.sunken`** at rest, the latter because the surfaces block hand-listed its
> background roles the same way this file's intent block had hand-listed its states. 48
> gated pairs per scheme becomes 63.
