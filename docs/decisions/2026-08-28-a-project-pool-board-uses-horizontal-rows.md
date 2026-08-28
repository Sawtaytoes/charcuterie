# A project-pool `Board` uses horizontal rows

- Status: accepted
- Date: 2026-08-28
- Type: component API
- Supersedes: none
- Superseded by: none

## Decision

`Board` supports two explicit lane layouts.

- `laneLayout="columns"` remains the default. It is the workflow shape: lanes are stages
  beside each other in the Wide View and one selected stage in the Narrow View.
- `laneLayout="rows"` is the project-pool shape: every lane is one horizontal band, every
  lane stays visible, and the lane's cards form a responsive grid inside it.

The row layout does not put the lanes or the cards in a horizontal scroll area. A consumer
with a large pool passes a short `items` array and the true `itemCount`, then handles
`onShowMore` if the remainder can be expanded.

## Context

The original `Board` API had one spatial meaning: a lane was a workflow column. Docket then
used it for parallel categories inside one project. Eight categories became eight narrow
columns, so the card titles and metadata collapsed even on a wide display.

This was not a Docket-only CSS defect. The shared component lacked the second lane shape.

## Why

A project pool does not lead to the next pool. Reading it as a horizontal band keeps the
category label stable, gives each card enough width, and lets the page scan from one pool to
the next. A responsive grid inside the band uses available space without assigning a fixed
column count or creating sideways navigation.

Keeping both meanings behind an explicit prop also preserves the existing workflow board.
Changing the default would turn ordered stages into rows in every current consumer.

## Evidence

The Docket review showed eight category lanes compressed into columns. The owner corrected
the intended shape directly: *"OMG, these lanes are unreadable. I thought they were gonna be
horizontal."* The follow-up interpretation was one lane per horizontal row, with cards laid
out across that row.
