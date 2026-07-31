# A consumer milestone adds components; it does not only spend them

**Status:** Accepted
**Date:** 2026-07-30
**Type:** Process
**Supersedes:** —
**Superseded by:** —

## Decision

When a consumer migration (M5, M5b, M6) finds a shape the app spells more than once and the
library does not have, **the component is built in `@charcuterie/ui` in that milestone** —
not left in the app, and not deferred to the next P-tier.

The bar is evidence, not taste. A shape qualifies when it is either duplicated **within**
the consumer, or present in the consumer **and** already inventoried elsewhere in the fleet.
Something that appears once, in one app, stays in that app.

M5 added two:

| Component | Evidence |
| --- | --- |
| `Alert` | rip-deck spells it four times — `TowerAlerts`, `UsbAlertBanner`, `LoadedDiscsBanner`, `VerdictBadge` — two of them carrying a byte-identical `TONE_CLASS`. mux-magic spells the same idea a third way in `statusClassMap`. |
| `SegmentedControl` | rip-deck's `ColumnPicker`, plus the composition it needed (`SinglePicker` + `RovingFocus` with no panels) being unreachable under M4's model. |

## Context

Kevin, mid-M5:

> *"The goal of Charcuterie is having reusable logic and components that expand as we build
> higher level components."*

The phasing table reads as a fixed inventory: M3 ships ten, M4 ships three, M6 ships nine
named ones. Read literally, M5 is a *spending* milestone — take the thirteen that exist and
put them into rip-deck — and anything rip-deck needs that is not on the M6 list goes back
into rip-deck's own `src/components`.

## Why

**The duplication the library exists to erase is mostly not in the P0 list.** rip-deck's
single largest duplication is `TONE_CLASS`, declared twice in one package, and the plan's
own success criterion for M5 is *"`TONE_CLASS` declared zero times"*. There is no way to
hit that by spending the existing thirteen: `Badge` is a pill, `Card` is a box, and the
thing being duplicated is a **banner**. A milestone that could not meet its own stated
proof without adding a component is a milestone that adds a component.

**A consumer is the only honest source of "is this shared?"** The plan's P1 list was
assembled from an inventory, and the M3 handoff already records two entries withdrawn
because their evidence turned out to be upstream projects rather than Kevin's code. A shape
found *while migrating* comes with its duplication count attached and cannot be wishful.

**Left in the app, it is duplication with a longer fuse.** Whatever rip-deck keeps,
castkit will meet again at M5b and mux-magic at M6, and by then there are three
implementations to reconcile instead of one to generalise. The cost of building `Alert` in
`@charcuterie/ui` during M5 is one afternoon; the cost of building it during M6 is the same
afternoon plus reconciling three consumers.

**The pressure runs the other way too, which is why the bar is written down.** "The consumer
needs it" would license moving every rip-deck component into the library, and most of them
are genuinely rip-deck's: `HeldBayCard` is about tray memory, `TrayToggle` is about a sysfs
inference nobody else has. Duplicated-in-the-consumer, or corroborated-by-the-inventory, is
the line.

## Consequences

- `@charcuterie/ui` is 16 components after M5, not 13, and `sourceRules.test.ts` counts
  them.
- M6's list is a floor rather than a ceiling. Its nine named components are still owed;
  M5b and M6 may add more on the same terms.
- A component added this way lands **complete** — five stories, an `.mdx`, a `*.test.tsx`,
  and its argTypes — or it is not added. A half-built shared component is worse than a
  duplicate, because a duplicate is at least honest about being local.
- The milestone handoff records what was added and the count that justified it, so a later
  reader can check the bar was met rather than assumed.

## Evidence

Kevin, mid-M5, chat `charcuterie-m5`, 2026-07-30 — quoted above.

The plan's own M5 proof line — *"ripdeck's net LOC goes **down**; `aria-*` goes from 9 to
meaningful; `TONE_CLASS` declared zero times"* —
`agentic/docs/research/2026-07-29-charcuterie-component-library-plan.md`.
