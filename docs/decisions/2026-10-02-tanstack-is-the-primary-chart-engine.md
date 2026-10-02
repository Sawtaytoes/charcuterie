# TanStack is the primary chart engine

- **Status:** Accepted
- **Date:** 2026-10-02
- **Type:** Shared component architecture
- **Supersedes:** —
- **Superseded by:** —

## Decision

TanStack Charts is the primary interactive engine behind Charcuterie's Chart facade.
Keep the existing portable SVG renderer as an explicit fallback, particularly for
constrained display bundles. Apps own data and calculations; Charcuterie owns marks,
interaction, responsive dimensions, and accessible output.

Pin TanStack Charts to the evaluated 0.18.0 release. It is alpha: upgrade deliberately,
with React, native Preact, standalone SVG, missing-data, and interaction verification.
The new charts subpaths isolate its runtime from the dependency-free core.

## Context

The four-engine evaluation established hover, touch, keyboard, reduced motion,
React, native Preact, and static SVG feasibility. The previous renderer lacks
managed interaction and motion.

## Why

A shared facade gives applications control without making every application implement
selection, tooltip placement, and transitions. The portable renderer remains useful
for static output and browser clients with a strict bundle budget. Neither engine
fetches data or introduces a database dependency.

## Evidence

Owner, thread `0007f1ae-5e8c-47fb-8c68-4d914148bbcb`:

> "TanStack looks like the way to go. Ours is good too as a fallback, but it's lacking a lot of interactivity features."

[Evaluation](../previews/2026-10-02-chart-evaluation/README.md).
