# Bounded portrait sets center the final row

Status: Accepted
Date: 2026-09-30
Type: UI behavior
Supersedes: None
Superseded by: None

## Decision

A bounded `PortraitTiles` set (`isFillingRow`) centers every incomplete final row as a group. Its tiles keep the same width as those in full rows. The default catalog grid retains its existing behavior.

## Context

A shopper picker with four entries can fit three columns, leaving a single tile on the next row. The extra tile previously remained at the start edge.

## Why

Centering the remaining entries preserves balance without stretching a single portrait across the whole row. CSS chooses the column count from the available container width; the component reads those tracks and applies a logical inline offset to the final row. It responds to container resizing and prop changes and preserves hover transforms.

## Evidence

Owner: “Center whoever ends up at the bottom like the Admin.”

Chat: t3code-a38681a0. The `CenteredLastRow` story and browser geometry test cover wrapping and resizing.
