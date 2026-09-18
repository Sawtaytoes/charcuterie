# A timeline span ends on its last day, and the axis folds on a measurement

**Status:** Accepted
**Date:** 2026-09-18
**Type:** Component / API
**Supersedes:** —
**Superseded by:** —
**Extends:** [2026-08-19-a-date-is-a-calendar-date-not-an-instant.md](2026-08-19-a-date-is-a-calendar-date-not-an-instant.md)

## Decision

`LaneTimeline` draws one horizontal lane per group across a date axis, and four rules come
with it.

1. **`end` is INCLUSIVE — the last day the item covers.** `2026-04-06` to `2026-04-06` is
   one day. A Monday-to-Sunday week is `06` to `12`, which is seven columns. A half-open
   interval was rejected.
2. **The Narrow View abandons the axis; it never pans and never squeezes.** Below the
   threshold each lane becomes a one-column list and every span is printed in words. There
   is no horizontal scroll at any width.
3. **The fold is a MEASUREMENT of the component's own box, not a breakpoint or a container
   query.** The threshold is a minimum **inline size per day column**, expressed in em of
   the timeline's own font size, and the number of columns comes from the data.
4. **A degenerate item is repaired, never dropped.** `end` before `start` collapses to the
   single day at `start`. An item clipped by the range edge keeps its own dates in its name
   and reports its own length.

The component is `Components/Data/LaneTimeline`. The arithmetic is
`packages/ui/src/LaneTimeline/laneTimelineGeometry.ts`, unit-tested in Node, and it reaches
`plainDate.ts` rather than reimplementing a day number.

## Context

Horizon — a household calendar — needs a view that a month grid cannot give it, and Docket
had already settled the horizontal-lane treatment for work that is not a calendar at all. Two
consumers, one shape, so the shape belongs in the library: the library owns the **shape** and
the app owns the **data**. That is also why there is no calendar vocabulary in the API. An
item is a `key`, a `title`, a `start` and an `end`; there is no event, no attendee and no
recurrence.

The two things a month grid structurally cannot do are the whole brief. A multi-day thing
becomes four separate cells, so the fact that it is *one* thing has to be inferred. And every
cell is the same size no matter what is in it, so a grid cannot show that one lane is
carrying most of the week — which is the question somebody actually has when they ask "who
can take this".

## Why

### The inclusive end

An off-by-one on a date range is invisible **in both directions**. A bar one day short and a
bar one day long are both bars, and nothing in the toolchain can tell them apart: not a
screenshot, not axe, not the type system. So the choice has to be the one that is hardest to
get wrong at the call site, and it has to be stated loudly — which is why it appears on the
prop, on the type, in the geometry module's header, on the docs page and here.

A half-open interval is the better model for **instants** and is what `Date` ranges and
iCalendar's `DTEND` use. It is the wrong one for a human writing down when something is on:
nobody says "Monday to Saturday" to mean a working week. An exclusive end therefore makes
every consumer add a day on the way in, and forget to on one of the paths — and the path they
forget is the one nobody opens for a month.

The inclusive reading also makes the degenerate cases expressible rather than ambiguous.
`start === end` is a one-day item, which is the common case; `end < start` is somebody typing
two dates the wrong way round, which is a data fault. Under a half-open reading those two
collapse into the same value and neither can be told from the other.

### The measured fold

The question a timeline has to answer is not *how wide is the box*. It is **how wide is one
day**, and that is the width divided by a number that lives in the data. Thirty columns in
900px is a readable month; three hundred and sixty five columns in the **same** 900px is 2.5
pixels a day. A media query sees only the first number. A container query sees only the first
number. Neither can express this, so it is measured — the same answer `Nav` reaches for its
folding bar, one level harder.

Two traps came out of building it, and both are recorded in the code because both are silent:

- **The measurement is taken from a probe, not from the track.** Attaching the observer to
  the axis track is a one-way door: the Narrow View unmounts it, so the width never updates
  and the axis can never come back when the window widens. So the ref belongs to a
  zero-height `aria-hidden` cell in the same grid column, rendered in both layouts.
- **"Has it been measured" is its own flag, not `inlineSize > 0`.** Zero is a *real* width
  here, because the track is a `minmax(0, 1fr)` column beside a fixed label rail — any
  container narrower than the rail resolves it to exactly 0px. Reading that as "not measured
  yet" draws a thirty-column axis into 150 pixels and reports it as fine.

The threshold is in **em** rather than pixels because every length in this token set moves
with the density axis. A floor pinned at 20px is generous on a desktop and clips a two-digit
date on the kiosk — the same argument `Avatar` makes about a chip that stays 20px while the
prose around it scales.

### The Narrow View is a list

The two obvious answers are both wrong. Horizontal scrolling hides lanes behind a gesture
with no affordance and fights the trackpad's own back-navigation, which is the objection
`Board` settled with *"no horizontal scroll, ever"*. Squeezing thirty columns into 390px
gives each day 13 pixels, which is not a timeline, it is a texture — and it is worse than
useless, because it still *looks* like data.

So the axis is abandoned and every span is printed in words instead. Nothing is hidden and
nothing overflows. It is named the **Narrow View**, never "mobile", because the component
measures a width: a docked sidebar on a 4K monitor gets this layout and a tablet in landscape
does not.

### A lane gets taller

Overlapping items are packed into stacked rows by greedy first-fit over start column, which
is optimal for row count. That is not an implementation detail, it is the feature: a lane
carrying three things at once is three bars tall while a lane carrying them in sequence is
one, so load asymmetry reads as **height** before anybody counts anything. Past `maxRowCount`
the remainder is counted rather than drawn, and the lane's badge still counts it — a lane
must not look lighter by being more loaded, which is the failure mode that would invert the
one question the component exists to answer.

## Evidence

- Horizon's rethink names the requirement: one lane per calendar or per person across a date
  axis, multi-day things as bars, so load asymmetry is visible at a glance. Two calendars in
  one household differed by a factor of four in one month, which no merged month grid showed.
- Docket had already settled the horizontal-lane treatment, which is what made this a library
  shape rather than an app one.
- `plainDate.ts` already argues the calendar-date case at length; this component reaches it
  rather than restating it, so there is one day-number representation in the package.

## Rejected

- **A half-open `end`.** Correct for instants, wrong for a human span, and it makes a
  zero-width item indistinguishable from a one-day item.
- **Horizontal scrolling in the Narrow View.** Content behind a gesture with no affordance,
  and it fights browser back-navigation on a trackpad.
- **A container query for the fold.** It cannot see the column count, which is half the
  question.
- **Dropping a degenerate item.** A dropped row is a data fault nobody can see. Drawing it on
  its start day makes the fault visible to the person who can fix it.
- **Making the bars draggable.** Moving a bar is a write, and `Board` is the precedent for
  how much a write costs. It would be a different component with its own record.
