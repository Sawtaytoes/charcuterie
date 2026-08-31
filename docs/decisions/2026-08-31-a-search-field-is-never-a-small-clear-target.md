# A search field is never a small clear target

Status: Accepted
Date: 2026-08-31
Type: UI component / correction
Supersedes: [2026-08-30](2026-08-30-a-search-fields-clear-affordance-is-an-icon-button.md)
Superseded by: None

## Decision

`SearchInput` offers only the density-aware `md` and `lg` control sizes. It does not offer
`sm`. The field and its clear `IconButton` keep one size. QueuePilot uses `lg` for every
search and text-filter field; other consumers are at least `md`.

## Context

The first fleet adoption correctly replaced native cancel widgets with a shared icon button,
but two QueuePilot filters explicitly selected `sm` and its other two searches inherited the
`md` default. The result made the new action smaller than the fields shown around it and
preserved four QueuePilot search controls at two target sizes.

## Why

The clear action is a frequent pointer target. A small target requires unnecessary precision.
Keeping the field and button on one control size preserves their alignment, while removing
`sm` prevents a consumer from recreating the reported defect.

## Evidence

Owner, chat `t3code-95952451`: “But don't make them small ones. The ones in QueuePilot
especially should be the larger variants.”
