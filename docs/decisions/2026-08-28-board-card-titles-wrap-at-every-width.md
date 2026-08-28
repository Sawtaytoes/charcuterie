# Board card titles wrap at every width

- Status: accepted
- Date: 2026-08-28
- Type: component behaviour
- Supersedes: none
- Superseded by: none

## Decision

`BoardCard` keeps its task title in a two-line clamping box at every lane width.
It does not switch to a one-line ellipsis when a lane reaches `--cq-sm`.

The title also uses `wrap-anywhere` so an unbroken URL or identifier cannot widen the
card past its lane.

## Context

The earlier Board rule changed the title at `--cq-sm`. A narrow card used two lines, but a
wider card used one truncated line. This inverted the reason a workflow board gains width:
the reader got more unused space while seeing less of the work title.

## Why

Two lines give task titles enough readable context without allowing one long title to make
every card in a lane excessively tall. The same shape at each width also makes a card's
height predictable as a Board scales across a wide window.

## Evidence

The Docket Board review showed task cards with their titles cut off at a wide layout. The
owner specified the correction: *"In this case, I think we can wrap the text at least on
these cards."*
