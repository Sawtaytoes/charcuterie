# Media workspaces can opt in to fill layout

Status: Accepted
Date: 2026-10-09
Type: UI preference
Supersedes: None; adds an opt-in to the default height-first rule
Superseded by: None

## Decision

AdaptiveGrid and VirtualizedGrid expose `layout="fill"` for media collections and
printer fleets. This layout chooses readable columns from the measured container
width and the caller’s minimum column width and maximum count, including the gap.
Multiple columns occupy the full container; a single column retains its reading
measure. Default height-first behavior remains as settled on August 10.

## Context

A printer fleet with three cards could stack inside a tall ultrawide viewport, so
the height-first rule centered one narrow column. Large media collections hit the
three-column default and the content cap. The approved app design needs six
comfortable model cards and three printer cards across an ultrawide screen.

## Why

An explicit opt-in keeps the default stable and gives both regular and virtualized
galleries the same measured layout. Applications do not fork the heuristic or
reach into a component’s descendant styles.

## Evidence

The owner approved the proposed six-model/three-printer layout: “Use this layout”.
They then requested a screen-by-screen comparison: “make sure we have each screen
side-by-side and see what we can do to improve it”. T3 Code thread environment
20d953d7-543b-42c4-8bc3-077531e7f2bc, October 9, 2026.
