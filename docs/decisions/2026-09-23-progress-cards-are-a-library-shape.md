# Progress cards are a library shape

Status: Accepted
Date: 2026-09-23
Type: Component ownership
Supersedes: None
Superseded by: None

## Decision

`ProgressCard` owns the reusable progress-first card: large value, filled band or separate
track, responsive metric blocks, optional media and controls, and whole-card issue intent.
It composes `Card` and `ProgressBar`; apps supply data, formatted text, actions, and diagnosis.
`ProgressBar.overlay` provides full-height progress without consumer CSS reaching into its DOM.

## Context

The Rip Deck dashboard preview introduced this shape inside the app. Reusing primitive
controls alone does not satisfy library-first ownership of a newly shared shape.

## Why

Transfers, imports, and other long-running jobs need the same visual hierarchy. Keeping the
shape in Charcuterie gives them the same responsive and accessible implementation without
coupling the library to a job schema or inferring health from incomplete data.

## Evidence

Owner: "Add to Charcuterie first right?"
Chat: 93858a0e-26d6-44f2-9424-9fdd94dbc85e.
