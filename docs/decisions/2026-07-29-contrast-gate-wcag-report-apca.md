# Gate contrast on WCAG 2.2 AA, report APCA alongside, and gate only what WCAG actually requires

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Accessibility / CI
**Supersedes:** —
**Superseded by:** —

## Decision

1. **WCAG 2.2 AA is the gate.** `packages/tokens/scripts/checkContrast.ts` exits non-zero
   below threshold, across every (variant × scheme).
2. **APCA Lc is reported next to every number, and never gated.**
3. **Only pairs WCAG actually requires are gated.** Specifically:
   - 4.5:1 — text on surfaces, intent content on intent surfaces, `onSolid` on `solid`.
   - 3:1 — `border.strong` (the role controls draw themselves with) and the focus ring.
   - **Reported, not gated** — `content.disabled`, `border.subtle`, `border.default`, and
     intent badge outlines. Each carries a machine-readable `exemptReason`.
4. The audit additionally fails on **alias drift**: `content.onAccent` must equal
   `intent.accent.onSolid`, and `border.focus` must equal `focus.ring`.

## Context

WCAG 2.2 is normative and is what an accessibility audit will be run against. APCA is the
candidate replacement in WCAG 3, which is still a working draft; its model of perceived
lightness contrast is materially better on dark UI, where the WCAG 2.x ratio is well known
to be over-permissive for light-on-dark text.

The first run of the audit reported **65 failures** across four variants. Inspecting them
showed the great majority were not colour problems — they were the audit demanding 3:1 of
things WCAG never asks 3:1 of. WCAG 2.2 SC 1.4.11 covers "visual information required to
identify user interface components and states", not every line drawn on screen. A badge's
outline is not what identifies the badge; its text is, and that text is already gated at
4.5:1. A hairline row separator identifies nothing.

After scoping the gate to the actual requirement and fixing the genuine failures — six
`onSolid` pairs that really were below 4.5:1, and one muted-on-overlay pair at 4.44:1 —
all 280 gated pairs pass.

## Why

**Gating on APCA would mean gating on a moving target.** The algorithm's constants have
changed between revisions, and a CI gate that changes meaning when an upstream draft
changes is not a gate. Reporting it costs nothing and gives the better signal for judging
dark themes by eye, which is exactly what M0 needs.

**Gating things WCAG does not require is how a contrast gate gets switched off.** Sixty-five
failures, most of them spurious, is indistinguishable from "this check is broken" — and
the rational response to a check that cries wolf is to disable it. A gate that fires only
on real conformance problems is one people keep. That is why every exemption here carries
a written reason rather than being silently dropped: the exemptions are auditable.

**Disabled text is the clearest case.** WCAG explicitly exempts inactive controls. Gating
`content.disabled` at 4.5:1 would force disabled text to be as legible as enabled text,
destroying the only signal that says "you cannot use this" — strictly worse for everyone,
including the users the rule exists to protect.

**Alias drift is a real bug class, not a hypothetical.** The plan's tier-2 list names both
`content.onAccent` and `intent.accent.onSolid`, and both `border.focus` and `focus.ring`.
Both names read correctly at their call sites, so both are worth keeping — but two names
for one value diverge the first time somebody tunes one of them, and the symptom would be
an unreadable button in one variant only.

## Evidence

The plan asked for exactly this split, and left the gate choice open as a question to
resolve during execution:

> **Contrast is a test, not a guideline.** […] **Gate on WCAG 2.2 AA**, **report APCA
> alongside** (better perceptual signal for dark UI, still unofficial — don't gate). This
> is what stops a beautiful-but-unreadable direction winning M0.

> - APCA vs WCAG 2.2 as the contrast **gate** (recommendation: gate WCAG AA, report APCA).

— `docs/research/2026-07-29-charcuterie-component-library-plan.md` in the `agentic` repo,
under "The token layer" and "Open questions to resolve during execution".

The scoping refinement in point 3 is new, and came from running the audit: it was the
difference between 65 reported failures and 7 real ones.
