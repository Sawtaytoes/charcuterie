# 1.0.0 is cut at the end of M6, not M7

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Release policy
**Supersedes:** —
**Superseded by:** —

## Decision

All five `@charcuterie/*` packages go to **1.0.0 when the last consumer is migrated**, which
is **the end of M6** — after `xander`, the last name in M6's fleet list.

**Not M7.** M7 ships no code: it is `@charcuterie/rx`, *design doc + ADR only, written not
built*. Cutting 1.0.0 there would attach the release to a milestone that publishes nothing.

The bump is its own changeset (`major` on all five), landed after the last consumer branch
is merged — not bundled into that consumer's changeset, so the release that stabilises the
API is legible on its own in the changelog.

## Context

Kevin, after M5c retargeted the release infra to `master`:

> we need to go to v1.0.0 once we're on the last worker. Is that M7?

Read as *the last consumer app*. The plan's milestone table answers it:

| | Ships |
| --- | --- |
| **M6** | P1 breadth (Select, Menu, Tooltip, Toast, Accordion, Field, LogViewer, SortableTableHeader, FileDropZone) **+ the rest of the fleet**: mux-magic, then plex-channels / image-viewer / gallery-downloader, **then xander**. |
| **M7** | `@charcuterie/rx` — **design doc + ADR only, written not built.** |

So the last consumer is inside M6, and M7 is a writing milestone.

## Why

Pre-1.0, **the minor *is* the breaking channel**, and a caret on a `0.x` version pins the
minor: `^0.1.0` means `>=0.1.0 <0.2.0`. That is not academic — it bit on this very release.
`tokens@0.2.0` replaced five of the six ePaper Spectra 6 values, and its own changeset says
so:

> **Breaking for anyone reading these literals**, which is the point of a token package.

Every consumer pinned `^0.1.0`. So the corrected palette — the entire point of M5b's
finding — reaches **none** of them, and it does so *silently*: a range that excludes the fix
resolves happily to the old version rather than failing. A breaking change nobody receives
looks identical to a breaking change nobody needed.

After 1.0.0 the two cases separate the way the ranges already assume: `^1.0.0` picks up
every minor and patch, and anything breaking goes to 2.0.0, where a consumer's install stops
and someone reads the changelog.

Waiting until the last consumer is the point. 1.0.0 is a claim that the API survived contact
with every app that has to use it, and the milestones exist to test exactly that — M5b's
result was that *the component layer does not reach a Preact consumer*, which is the kind of
finding that must not arrive after a stability promise.

## Evidence

Kevin, 2026-07-31, chat `charcuterie-m5c` — quoted above, and confirming the M6 reading.

Milestone table: `agentic/docs/research/2026-07-29-charcuterie-component-library-plan.md`
(M6 fleet order, M7 as design-doc-only).

The `^0.1.0` trap, measured 2026-07-31: `rip-deck@feat/charcuterie` and
`mux-magic@feat/charcuterie-tokens` both pin `^0.1.0`; `node -e "semver.satisfies('0.2.0',
'^0.1.0')"` → `false`. `castkit@feat/charcuterie` is still on `portal:`.

Changeset quoted: `.changeset/epaper-palette-from-the-consumer.md`, and
[ePaper is exempt from the contrast gate](2026-07-31-epaper-is-exempt-from-the-contrast-gate.md).
