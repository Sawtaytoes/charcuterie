# A virtualizer that outlives its scroll element must be re-synced when the element returns

**Status:** Accepted
**Date:** 2026-08-25
**Type:** Bug class · Component
**Supersedes:** —
**Superseded by:** —

## Decision

Where a windowed list's scroll container is mounted and unmounted while the virtualizer
instance stays alive — every overlay panel, because the panel is gated on `isVisible` and
the hook is not — the component **must tell the virtualizer where the new element is** when
that element attaches.

`Combobox` does it by dispatching a `scroll` event on the list, keyed on the element
arriving.

## Context

Reported against Storybook: scroll the 500-track list, close it, open it again, and the
panel comes back with a blank band down the top and the rows from the previous scroll
position stranded below it. Measured, on reopen: element `scrollTop` 0, virtualizer offset
500, rendered range 12..20.

## Why nothing fixes it on its own

Three things that look like they should work, do not.

**The library never re-reads on attach.** `observeOffset` adds a `scroll` listener and
returns; it does not read the element it has just attached to. The offset only ever changes
from an event, so an instance re-pointed at a new element keeps the offset of the old one.

**A replaced element raises no event.** The new list is already at 0, which is where it
would need to move to, so nothing fires.

**`scrollToOffset(0)` raises no event either**, for the same reason — it asks for a position
the element already holds. This was tried first and changed nothing, which is what sent the
investigation to the library source.

## The second trap, and it is separate

The re-sync must key on the **element attaching**, not on `isVisible`. floating-ui's
`FloatingPortal` renders nothing until its portal node exists, so the panel's children mount
a render *later* than the open flag flips. An effect keyed on `isVisible` runs while the ref
is still `null`, does nothing, and — with no dependency that changes when the list finally
arrives — never runs again. `Combobox` holds the node in state as well as a ref for exactly
this.

The same lateness is why the open seed's centring scroll waits a frame
([the seed record](2026-08-25-a-combobox-opens-on-its-chosen-option-not-the-top-of-the-list.md)).
Two symptoms, one cause.

## Provenance, because it matters for where to look next

Introduced by [#176](https://github.com/Sawtaytoes/charcuterie/pull/176), the `itemSize`
change, and **not** by the open-seed work it landed on top of. Bisected by building
Storybook at three commits and running the same sequence: the version before the seed work
recovered, the version after the seed work recovered, the version after `itemSize` did not.
Worth stating plainly — the seed work had shipped three defects in a row by then, and the
obvious assumption was wrong.

## How it was found

Scripted interaction could not reproduce it; steady open/close cycles all passed. A
randomised fuzz over the panel — toggle, wheel, arrows, type, clear, escape, resize — with
the invariant *"no blank band at the top of a list that has rows"* found it on the second
seed, in three actions: wheel, escape, reopen. **A bug that only a real hand's ordering
reaches is a bug for a fuzz, not for another hand-written case.**

## Evidence

> "I think it's totally broken now. I clicked this one multiple times and the virtualized
> one got messed up."

— owner, 2026-08-25, with a screenshot of the blank band above `Track 9` / `Track 10`.
