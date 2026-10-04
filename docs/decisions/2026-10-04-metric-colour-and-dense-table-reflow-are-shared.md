# Metric colour and dense table reflow are shared

- **Status:** Accepted
- **Date:** 2026-10-04
- **Type:** Component design
- **Supersedes:** —
- **Superseded by:** —

## Decision

Metric cards can carry a stable categorical colour on an app-supplied decorative icon and leading edge. They keep a visible text heading and app-formatted value. MetricCard owns that shape through Card and the existing categorical palette; consumers supply the category and supporting content. Colour does not imply success, failure, or an interactive action.

DataTable keeps its default 32rem CSS container threshold. Dense comparisons can opt into the existing 48rem or 64rem container thresholds, and an explicit stacked layout keeps every column and sort control in a labelled list at any width. No viewport breakpoint, horizontal scrolling, virtualisation, hidden columns, or automatic data sorting is introduced.

## Context

A printer-management history table had eight columns competing for space above the original five-column table's 32rem threshold. Long names forced date and duration headings into very narrow columns. Its summary also used four identical neutral cards with undecorated icons.

## Why

Shared presentation capabilities let every app choose readable comparisons and distinguish metric categories without an app stylesheet reaching into component internals. The existing text, semantics, layout defaults and categorical contrast gates remain the source of truth.

## Evidence

Owner in the current Hot Plate 3D project conversation, October 4, 2026:

> Everything looks very samey. I'm hoping you'll fix these things in the future. The default Charcuterie components are very basic. We should update it to allow more styling and colors. Like the electricity of "energy" isn't colored.

> History table has issues rendering. We could also do the grid/list/card view like we do on others.

The request identifies both the coloured metric icon and the alternative history views. It authorizes these specific repairs; broader visual redesign still follows the served-preview review workflow.
